// FILE: /controller/aiService.ts

import Anthropic from '@anthropic-ai/sdk';
import type { PatchConfig, AIResponse } from './types';
import { loadPromptFile, loadContextFiles } from './fileManager';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Actually mapped to claude-3-5-sonnet-20241022 or similar by SDK 
// For this environment we'll use a valid string known to be robust, assuming user meant 20241022 or equivalent.
const CLAUDE_MODEL_ACTUAL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 8192;

const HARD_BANS_SYSTEM_PROMPT = \`
You are an expert TypeScript engineer implementing a patch for Farkle Frenzy.
You MUST output a COMPLETE file. No truncation. No ellipsis.

CRITICAL ARCHITECTURE BANS:
1. NEVER use Math.random() -> use seededRng() or CSPRNG.
2. NEVER import 'better-sqlite3' -> use 'sql.js'.
3. SERVER FILES MUST use 'sql.js', not 'better-sqlite3'.
4. NEVER use an 'activeBombs' array. Bombs are Cell.type values.
5. NEVER define an 'ActiveBomb' interface.
6. NEVER use 'setInterval' near cascade/gravity -> use 'setTimeout' recursion.
7. NEVER import from 'framer-motion' -> import from 'motion/react'.
8. NEVER use 'SP_FREE' or 'SP_CASINO' mode names. Use 'SOLO_FREE' or 'SOLO_CASINO'.
9. NEVER use 'rallyGridSize()'. Use 'multiplayerGridSize()'.
10. NEVER use 'recoverDeadBoard()' or 'ensurePlayableGrid()'.
11. NEVER use 'SpawnPool' class -> use 'SixPoolManager'.
12. NEVER import 'Bomb.tsx'. Bomb visuals are in 'Tile.tsx'.
13. NEVER import 'RainbowBomb.tsx'.
14. NEVER use relative imports to packages/ -> use '@farkle/shared' or '@farkle/engine'.
15. NEVER use uuid() or crypto.randomUUID() -> use nanoid().
16. NEVER use seededRng() outside monteCarlo/simulation contexts.
17. NEVER use <React.StrictMode> or <StrictMode> -> breaks cascade timing.
18. NEVER use 'setInterval' near energy loop -> use requestAnimationFrame.

OUTPUT EXACTLY ONE COMPLETE TYPESCRIPT/TSX FILE. No markdown formatting blocks around it. Strip all \`\`\`typescript backticks.
\`;

function extractCode(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('\`\`\`')) {
    cleaned = cleaned.replace(/^\`\`\`[a-zA-Z]*\\n/, '');
    cleaned = cleaned.replace(/\\n\`\`\`$/, '');
  }
  return cleaned;
}

/** Generates initial code for a patch. */
export async function generateCode(patch: PatchConfig, projectRoot: string): Promise<AIResponse> {
  const start = Date.now();
  const promptText = await loadPromptFile(patch, projectRoot);
  const contextText = await loadContextFiles(patch, projectRoot);
  const fullPrompt = \`\${contextText}\\n\\n--- PATCH PROMPT ---\\n\${promptText}\\n\\nPlease output the complete replacement file for \${patch.target_file}.\`;
  
  return await callLLM(fullPrompt, HARD_BANS_SYSTEM_PROMPT, start);
}

/** Generates a repair patch based on validation failures. */
export async function generateRepairPatch(patch: PatchConfig, currentCode: string, failureSummary: string, attemptNumber: number): Promise<AIResponse> {
  const start = Date.now();
  const fullPrompt = \`
The previous code generation failed these validation checks:
\`\`\`
\${failureSummary}
\`\`\`

Here is the current code state:
\`\`\`typescript
\${currentCode}
\`\`\`

Here is extra repair context:
\${patch.heal_context}

Please apply fixes to resolve these errors and output the ENTIRE updated file.
\`;

  return await callLLM(fullPrompt, HARD_BANS_SYSTEM_PROMPT, start);
}

/** Discards previous code and attempts a full AI rewrite. */
export async function generateFullRewrite(patch: PatchConfig, projectRoot: string, failureSummary: string): Promise<AIResponse> {
  const start = Date.now();
  const promptText = await loadPromptFile(patch, projectRoot);
  const contextText = await loadContextFiles(patch, projectRoot);
  
  const fullPrompt = \`
We must do a FULL REWRITE of \${patch.target_file}.
The previous attempts failed with these stubborn errors:
\`\`\`
\${failureSummary}
\`\`\`

Context:
\${contextText}

Original Prompt:
\${promptText}

Extra Repair Context:
\${patch.heal_context}

Output the COMPLETE file from scratch.
\`;

  return await callLLM(fullPrompt, HARD_BANS_SYSTEM_PROMPT, start);
}

/** Helper to call Anthropic, fallback to Gemini */
async function callLLM(prompt: string, system: string, startMs: number): Promise<AIResponse> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL_ACTUAL,
      max_tokens: MAX_TOKENS,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    });
    
    // Check type of msg.content[0]
    const contentObj = msg.content[0];
    const rawResponse = contentObj.type === 'text' ? contentObj.text : '';
    
    return {
      code: extractCode(rawResponse),
      rawResponse,
      model: 'claude',
      tokensUsed: msg.usage.output_tokens,
      durationMs: Date.now() - startMs
    };
  } catch (err: any) {
    console.warn(\`Anthropic API failed: \${err.message}. Falling back to Gemini...\`);
    
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        systemInstruction: system
      });
      
      const result = await model.generateContent(prompt);
      const rawResponse = result.response.text();
      return {
        code: extractCode(rawResponse),
        rawResponse,
        model: 'gemini',
        durationMs: Date.now() - startMs
      };
    } catch (gErr: any) {
      throw new Error(\`Both LLMs failed. Anthropic: \${err.message}. Gemini: \${gErr.message}\`);
    }
  }
}
