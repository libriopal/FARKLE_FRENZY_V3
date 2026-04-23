// FILE: /controller/repairEngine.ts

import type { PipelineContext, ValidationResult, RepairAttempt } from './types';
import { validateStaged } from './pipelineValidator';
import { writeStaged, hashContent } from './fileManager';
import { applyRegexRepairs, applyASTRepairs, looksLikeValidTS } from './deterministicRepair';
import { generateRepairPatch, generateFullRewrite } from './aiService';

export interface RepairResult {
  success: boolean;
  finalCode: string;
  finalValidation: ValidationResult;
  attempts: RepairAttempt[];
}

/** Drives the 5-attempt self-healing loop. */
export async function runRepairEngine(
  ctx: PipelineContext,
  initialValidation: ValidationResult
): Promise<RepairResult> {
  const maxAttempts = 5;
  let code = ctx.currentCode;
  let val = initialValidation;
  const attempts: RepairAttempt[] = [];

  for (let i = 1; i <= maxAttempts; i++) {
    const startMs = Date.now();
    const hashBefore = hashContent(code);

    let tier: 'regex' | 'ast' | 'ai_patch' | 'ai_rewrite' = 'regex';
    
    // Tier dispatch
    if (i === 1) tier = 'regex';
    else if (i === 2) tier = looksLikeValidTS(code) ? 'ast' : 'ai_patch';
    else if (i === 3 || i === 4) tier = 'ai_patch';
    else tier = 'ai_rewrite';

    console.log(\`[Repair Step \${i}/\${maxAttempts}] Engaging tier: \${tier}\`);

    if (tier === 'regex') {
      const res = applyRegexRepairs(code, val);
      code = res.code;
    } else if (tier === 'ast') {
      const res = await applyASTRepairs(code, ctx.patch.required_exports, ctx.patch.target_file);
      code = res.code;
    } else if (tier === 'ai_patch') {
      const aiRes = await generateRepairPatch(ctx.patch, code, val.failureSummary, i);
      code = aiRes.code;
    } else if (tier === 'ai_rewrite') {
      const aiRes = await generateFullRewrite(ctx.patch, ctx.projectRoot, val.failureSummary);
      code = aiRes.code;
    }

    const hashAfter = hashContent(code);
    
    // Write to staging so we can test it
    await writeStaged(ctx.stagedPath, code);

    // Validate the new code
    val = await validateStaged(ctx.patch, code, ctx.stagedPath, ctx.projectRoot);

    const attempt: RepairAttempt = {
      attemptNumber: i,
      tier,
      validationResult: val,
      codeHashBefore: hashBefore,
      codeHashAfter: hashAfter,
      durationMs: Date.now() - startMs
    };
    attempts.push(attempt);
    ctx.repairAttempts.push(attempt);

    if (val.passed) {
      console.log(\`[Repair] Success at attempt \${i}. All tests passing.\`);
      return {
        success: true,
        finalCode: code,
        finalValidation: val,
        attempts
      };
    } else if (hashBefore === hashAfter) {
      console.warn(\`[Repair] Warning: Tier '\${tier}' produced no code changes.\`);
    } else {
      console.warn(\`[Repair] Attempt \${i} failed. Summary: \${val.failureSummary.substring(0, 100)}...\`);
    }
  }

  // All 5 failed.
  return {
    success: false,
    finalCode: code,
    finalValidation: val,
    attempts
  };
}
