import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MAX_ATTEMPTS = 5;

interface ValidationResult {
  passed: boolean;
  report: string;
  fix: string | null;
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(\`Gemini API error: \${response.status} - \${errText}\`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return text.replace(/^\\\s*\`\`\`[a-z]*\\n?/im, '').replace(/\\n?\`\`\`\\\s*$/im, '').trim();
}

async function runValidation(promptId: string): Promise<ValidationResult> {
  try {
    await execAsync(\`bash scripts/example.sh \${promptId}\`);
  } catch (e) {
    // Error is expected if bash script exits with non-zero status
  }

  const reportsDir = path.join(process.cwd(), '.ff-verify', 'reports');
  const reportPath = path.join(reportsDir, \`\${promptId}_report.txt\`);
  const fixPath = path.join(reportsDir, \`\${promptId}_fix.txt\`);

  if (!fs.existsSync(reportPath)) {
    throw new Error(\`Validation report not found at: \${reportPath}\`);
  }

  const report = fs.readFileSync(reportPath, 'utf8');
  let fix = null;
  if (fs.existsSync(fixPath)) {
    fix = fs.readFileSync(fixPath, 'utf8');
  }

  return {
    passed: report.includes('[PASS]'),
    report,
    fix
  };
}

async function main() {
  const args = process.argv.slice(2);
  const promptId = args.find(arg => !arg.startsWith('--'));
  const autoMode = args.includes('--auto');

  if (!promptId) {
    console.error('Usage: npx ts-node controller/controller.ts <PROMPT_ID> [--auto]');
    process.exit(1);
  }

  const tempDir = path.join(process.cwd(), '.ff-verify', 'temp');
  const reportsDir = path.join(process.cwd(), '.ff-verify', 'reports');
  const targetFile = path.join(tempDir, \`\${promptId}.ts\`);
  const promptOutputFile = path.join(reportsDir, \`\${promptId}_prompt.txt\`);

  if (!fs.existsSync(targetFile)) {
    console.error(\`Target file not found: \${targetFile}\`);
    process.exit(1);
  }

  let attempt = 1;
  const maxAttempts = autoMode ? MAX_ATTEMPTS : 1;

  while (attempt <= maxAttempts) {
    console.log(\`Running validation for \${promptId} (Attempt \${attempt}/\${maxAttempts})...\`);
    
    const { passed, report, fix } = await runValidation(promptId);

    if (passed) {
      console.log('✅ Validation PASS!');
      process.exit(0);
    }

    console.log('❌ Validation FAILED.');
    console.log('--- REPORT ---');
    console.log(report);
    if (fix) {
      console.log('--- FIX DETECTED ---');
      console.log(fix);
    }

    const originalCode = fs.readFileSync(targetFile, 'utf8');

    const fixPrompt = \`You generated a TypeScript patch that failed validation.
--- ORIGINAL PATCH ---
\${originalCode}
--- FAILURE REPORT ---
\${report}
--- REQUIRED FIX ---
\${fix || 'Resolve the issues found in the report.'}
INSTRUCTIONS:
Apply ONLY the required fix
Do NOT change unrelated logic
Return FULL corrected file
No explanations\`;

    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(promptOutputFile, fixPrompt, 'utf8');

    if (autoMode) {
      if (attempt === maxAttempts) {
        console.error(\`Max attempts (\${maxAttempts}) reached. Auto-repair failed.\`);
        process.exit(1);
      }
      
      console.log('Running auto-repair via Gemini...');
      try {
        const newCode = await callGeminiAPI(fixPrompt);
        fs.writeFileSync(targetFile, newCode, 'utf8');
        console.log('Target file overwritten. Re-validating...');
      } catch (err) {
        console.error('Failed Gemini API call:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    } else {
      console.log(\`\\nFix prompt saved to: \${promptOutputFile}\`);
      console.log('Copy the contents of this file into Gemini to generate a fix.');
      process.exit(1);
    }

    attempt++;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
