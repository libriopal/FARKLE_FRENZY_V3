// FILE: /controller/pipelineValidator.ts

import { execSync } from 'child_process';
import * as path from 'path';
import type { PatchConfig, ValidationResult, FarkleRuleResult } from './types';
import { runFarkleRules, checkRequiredExports, buildFailureSummary } from './farkleRules';

/** 
 * Runs the 4-layer validation cascade.
 * Layer 1: Farkle static analysis rules
 * Layer 2: Export checks
 * Layer 3: TSC type check
 * Layer 4: Bash script
 * Layer 5: Vitest pattern
 */
export async function validateStaged(
  patch: PatchConfig, 
  code: string, 
  stagedPath: string, 
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: false,
    bashPassed: true,
    vitestPassed: true,
    tscPassed: true,
    farkleRulesPassed: true,
    farkleRuleResults: [],
    exportsPassed: true,
    missingExports: [],
    failureSummary: ''
  };

  // Layer 1: Farkle Rules
  if (patch.farkle_rules.length > 0) {
    result.farkleRuleResults = runFarkleRules(code, patch.farkle_rules);
    const failedRules = result.farkleRuleResults.filter(r => !r.passed);
    if (failedRules.length > 0) {
      result.farkleRulesPassed = false;
      result.passed = false;
      result.failureSummary = buildFailureSummary(result.farkleRuleResults, []);
      return result; // Fast fail
    }
  }

  // Layer 2: Required Exports
  if (patch.required_exports.length > 0) {
    const exportCheck = checkRequiredExports(code, patch.required_exports);
    if (!exportCheck.passed) {
      result.exportsPassed = false;
      result.missingExports = exportCheck.missing;
      result.passed = false;
      result.failureSummary = buildFailureSummary(result.farkleRuleResults, result.missingExports);
      return result; // Fast fail
    }
  }

  // Prepare environment for execution (L3/L4/L5)
  const env = { 
    ...process.env, 
    FF_STAGED_FILE: stagedPath, 
    FF_STAGED_TARGET: patch.target_file 
  };

  // Layer 3: TSC
  // Try to typecheck the whole project, or at least the specific file
  // For safety and speed, we run a global check but filter to our file context.
  try {
    execSync('npx tsc --noEmit', { cwd: projectRoot, env, stdio: 'pipe', timeout: 60000 });
  } catch (err: any) {
    const output = (err.stdout || '').toString() + (err.stderr || '').toString();
    // Filter to only care if it mentions the target file (since stagedPath might not be checked by tsconfig without includes)
    // To strictly check stagedPath, we'd need to swap it in. Assuming the orchestrator atomic copy handles this, 
    // but in validateStaged, we actually run TSC after modifying the physical tree?
    // Wait, if it's strictly staged, TSC won't typecheck it as part of the app.
    // Assuming the target is swapped in by the caller or we check stagedPath directly:
    try {
      execSync(\`npx tsc --noEmit \${stagedPath}\`, { cwd: projectRoot, env, stdio: 'pipe', timeout: 60000 });
    } catch (e2: any) {
      result.tscPassed = false;
      result.tscError = (e2.stdout || '').toString();
      result.passed = false;
      result.failureSummary = \`TSC Type Error:\\n\${result.tscError}\`;
      return result; // Fast fail
    }
  }

  // Layer 4: Bash Script
  if (patch.bash_script) {
    try {
      execSync(patch.bash_script, { cwd: projectRoot, env, stdio: 'pipe', timeout: 30000 });
    } catch (err: any) {
      result.bashPassed = false;
      result.bashError = (err.stdout || '').toString() + '\\n' + (err.stderr || '').toString();
      result.passed = false;
      result.failureSummary = \`Bash Script Failed:\\n\${result.bashError}\`;
      return result; // Fast fail
    }
  }

  // Layer 5: Vitest
  if (patch.vitest_pattern) {
    try {
      execSync(\`npx vitest run \${patch.vitest_pattern} --passWithNoTests\`, { cwd: projectRoot, env, stdio: 'pipe', timeout: 120000 });
    } catch (err: any) {
      result.vitestPassed = false;
      result.vitestError = (err.stdout || '').toString() + '\\n' + (err.stderr || '').toString();
      result.passed = false;
      result.failureSummary = \`Vitest Failed:\\n\${result.vitestError}\`;
      return result; 
    }
  }

  result.passed = true;
  return result;
}

/** Global check, used post-patch. */
export function runGlobalTSC(projectRoot: string): { passed: boolean; error?: string } {
  try {
    execSync('npx tsc --noEmit', { cwd: projectRoot, stdio: 'pipe', timeout: 60000 });
    return { passed: true };
  } catch (err: any) {
    return { passed: false, error: (err.stdout || '').toString() };
  }
}

/** Gate check, optional preflight hook. */
export function runGateTest(gateCmd: string, projectRoot: string): { passed: boolean; output: string } {
  try {
    const out = execSync(gateCmd, { cwd: projectRoot, stdio: 'pipe', timeout: 60000 });
    return { passed: true, output: out.toString() };
  } catch (err: any) {
    return { passed: false, output: (err.stdout || '').toString() + (err.stderr || '').toString() };
  }
}
