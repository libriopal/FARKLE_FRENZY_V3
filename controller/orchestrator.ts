// FILE: /controller/orchestrator.ts

import * as path from 'path';
import type { CLIOptions, PipelineContext, EscalationReport } from './types';
import { 
  getPatchConfig, 
  readOriginalFile, 
  getStagingPath, 
  getLockPath, 
  getReportDir,
  acquireLock, 
  releaseLock, 
  writeStaged, 
  atomicCommit, 
  cleanStaging,
  hashContent
} from './fileManager';
import { getGitState, preflightGitCheck, commitPatch } from './gitService';
import { log, printPipelineSummary, printValidationResult, writeEscalationReport } from './logger';
import { generateCode } from './aiService';
import { validateStaged, runGlobalTSC, runGateTest } from './pipelineValidator';
import { runRepairEngine } from './repairEngine';

export async function runPipeline(opts: CLIOptions, projectRoot: string): Promise<void> {
  const startTime = Date.now();
  const patchId = opts.patchId;

  // Step 1: Preflight
  log.phase('preflight', patchId);
  const patch = await getPatchConfig(projectRoot, patchId);
  log.info(\`Loaded patch: \${patch.name}\`, patchId);

  const gitCheck = preflightGitCheck(projectRoot, patch.target_file);
  if (!gitCheck.safe && !opts.noGit) {
    log.error(\`Preflight failed: \${gitCheck.reason}\`, patchId);
    throw new Error('Preflight checks failed');
  }

  const gitState = getGitState(projectRoot);
  const originalCode = await readOriginalFile(projectRoot, patch.target_file);
  const originalHash = hashContent(originalCode);
  
  const ctx: PipelineContext = {
    patch,
    projectRoot,
    stagingDir: path.dirname(getStagingPath(projectRoot, patchId, patch.target_file)),
    stagedPath: getStagingPath(projectRoot, patchId, patch.target_file),
    originalFile: patch.target_file,
    lockFile: getLockPath(projectRoot, patchId),
    currentCode: '',
    originalCode,
    originalFileHash: originalHash,
    repairAttempts: [],
    gitBranch: gitState.branch,
    gitCommitHashBefore: gitState.commitHash,
    startTime
  };

  // Step 2: Lock
  log.phase('lock', patchId);
  await acquireLock(ctx.lockFile);
  log.info('Lock acquired.', patchId);

  let newCommitHash: string | undefined;
  let finalCode = '';

  try {
    // Step 3: Generate
    log.phase('generate', patchId);
    if (!patch.prompt_file) throw new Error('No prompt_file set');
    const aiRes = await generateCode(patch, projectRoot);
    ctx.currentCode = aiRes.code;
    
    if (opts.verbose) {
      console.log('--- GENERATED CODE PREVIEW ---');
      console.log(ctx.currentCode.substring(0, 500) + '...');
      console.log('------------------------------');
    }

    // Step 4: Stage
    log.phase('stage', patchId);
    await writeStaged(ctx.stagedPath, ctx.currentCode);
    log.info(\`Written to \${ctx.stagedPath}\`, patchId);

    if (opts.dry) {
      log.warn('Dry run: stopping before validation and commit.', patchId);
      return;
    }

    // Step 5: Validate
    log.phase('validate', patchId);
    let validation = await validateStaged(patch, ctx.currentCode, ctx.stagedPath, projectRoot);
    printValidationResult(validation, patchId);

    // Step 6: Self Heal
    if (!validation.passed) {
      if (!patch.self_healing) {
        throw new Error('Validation failed and self_healing is disabled.');
      }
      log.phase('self_heal', patchId);
      const repairRes = await runRepairEngine(ctx, validation);
      ctx.currentCode = repairRes.finalCode;
      validation = repairRes.finalValidation;

      if (!repairRes.success) {
        log.phase('escalate', patchId);
        const report: EscalationReport = {
          patchId, targetFile: patch.target_file, timestamp: new Date().toISOString(),
          totalAttempts: repairRes.attempts.length, attempts: repairRes.attempts,
          finalCode: ctx.currentCode, finalValidationResult: validation, originalFileHash: ctx.originalFileHash
        };
        const reportPath = await writeEscalationReport(report, getReportDir(projectRoot));
        log.error(\`ESCALATING. Maximum repair attempts exceeded. See: \${reportPath}\`, patchId);
        throw new Error('Pipeline escalated. User intervention required.');
      }
    }
    finalCode = ctx.currentCode;

    // Step 7: Global TSC check (non-fatal warning)
    log.phase('global_tsc', patchId);
    const globalTsc = runGlobalTSC(projectRoot);
    if (!globalTsc.passed) {
      log.warn(\`Global TSC check failed, but local validation passed. Ignoring.\\n\${globalTsc.error?.substring(0, 500)}\`, patchId);
    } else {
      log.success('Global TSC OK.', patchId);
    }

    // Step 8: Atomic Write
    log.phase('atomic_write', patchId);
    const targetPath = path.join(projectRoot, patch.target_file);
    await atomicCommit(ctx.stagedPath, targetPath);
    log.success(\`Replaced \${patch.target_file}\`, patchId);

    // Step 9: Git Commit
    if (!opts.noGit) {
      log.phase('git_commit', patchId);
      const commitRes = await commitPatch(projectRoot, patch.target_file, patchId, patch.name, ctx.originalCode);
      if (!commitRes.success) {
        throw new Error(\`Git commit failed, rollback performed. -> \${commitRes.error}\`);
      }
      newCommitHash = getGitState(projectRoot).commitHash;
      log.success(\`Committed: \${newCommitHash}\`, patchId);
    }

    // Gate
    if (patch.gate_test) {
      log.phase('gate_test', patchId);
      const gateRes = runGateTest(patch.gate_test, projectRoot);
      if (!gateRes.passed) {
        log.warn(\`Gate test failed output:\\n\${gateRes.output}\`, patchId);
      } else {
        log.success(\`Gate test passed.\`, patchId);
      }
    }

    // Summary
    log.phase('summary', patchId);
    printPipelineSummary(patchId, patch.name, 'success', Date.now() - startTime, ctx.repairAttempts, newCommitHash);

  } finally {
    // Step 10: Release Lock and Clean Staging
    log.phase('release_lock', patchId);
    await releaseLock(ctx.lockFile);
    await cleanStaging(path.dirname(ctx.stagingDir));
    log.info('Pipeline finished.', patchId);
  }
}
