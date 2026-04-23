// FILE: /controller/types.ts

/** The tier of self-healing repair attempted. */
export type RepairTier = 'regex' | 'ast' | 'ai_patch' | 'ai_rewrite';

/** The phase of the Controller-C pipeline. */
export type PipelinePhase = 'preflight' | 'lock' | 'generate' | 'stage' | 'validate' | 'self_heal' | 'global_tsc' | 'atomic_write' | 'git_commit' | 'gate_test' | 'summary' | 'release_lock' | 'clean_staging' | 'escalate';

/** Final outcome of the pipeline. */
export type PipelineOutcome = 'success' | 'failed' | 'escalated';

/** Known Farkle Frenzy static analysis rules. */
export type FarkleRuleId = 
  | 'no_math_random' 
  | 'no_better_sqlite3' 
  | 'uses_sql_js_not_better_sqlite' 
  | 'no_activebombs_array' 
  | 'no_activebomb_interface' 
  | 'no_setinterval_cascade' 
  | 'no_framer_motion_import' 
  | 'no_sp_free_casino_names' 
  | 'no_rally_grid_size_fn' 
  | 'no_recover_dead_board' 
  | 'no_spawnpool_class' 
  | 'no_bomb_tsx_import' 
  | 'no_rainbow_bomb_tsx_import' 
  | 'uses_workspace_aliases' 
  | 'uses_nanoid' 
  | 'uses_csprng_not_lcg' 
  | 'no_react_strict_mode' 
  | 'no_setinterval_energy';

/** Configuration for a specific patch. */
export interface PatchConfig {
  id: string;
  name: string;
  prompt_file: string;
  target_file: string;
  context_files: string[];
  bash_script: string | null;
  vitest_pattern: string | null;
  required_exports: string[];
  farkle_rules: FarkleRuleId[];
  self_healing: boolean;
  heal_context: string;
  notes: string;
  gate_test?: string;
}

/** Result of a single Farkle static analysis rule. */
export interface FarkleRuleResult {
  rule: FarkleRuleId;
  passed: boolean;
  message: string;
  line?: number;
}

/** Result of the 4-layer validation cascade. */
export interface ValidationResult {
  passed: boolean;
  bashPassed: boolean;
  bashError?: string;
  vitestPassed: boolean;
  vitestError?: string;
  tscPassed: boolean;
  tscError?: string;
  farkleRulesPassed: boolean;
  farkleRuleResults: FarkleRuleResult[];
  exportsPassed: boolean;
  missingExports: string[];
  failureSummary: string;
}

/** Record of a single self-healing attempt. */
export interface RepairAttempt {
  attemptNumber: number;
  tier: RepairTier;
  validationResult: ValidationResult;
  codeHashBefore: string;
  codeHashAfter: string;
  durationMs: number;
}

/** Details recorded when a patch completely fails and is escalated. */
export interface EscalationReport {
  patchId: string;
  targetFile: string;
  timestamp: string;
  totalAttempts: number;
  attempts: RepairAttempt[];
  finalCode: string;
  finalValidationResult: ValidationResult;
  originalFileHash: string;
}

/** Runtime context state passed through the pipeline. */
export interface PipelineContext {
  patch: PatchConfig;
  projectRoot: string;
  stagingDir: string;
  stagedPath: string;
  originalFile: string;
  lockFile: string;
  currentCode: string;
  originalCode: string;
  originalFileHash: string;
  repairAttempts: RepairAttempt[];
  gitBranch: string;
  gitCommitHashBefore: string;
  startTime: number;
}

/** Standardized response from an AI model. */
export interface AIResponse {
  code: string;
  rawResponse: string;
  model: 'claude' | 'gemini';
  tokensUsed?: number;
  durationMs: number;
}

/** Command-line options mapped from launch arguments. */
export interface CLIOptions {
  patchId: string;
  auto: boolean;
  dry: boolean;
  verbose: boolean;
  noGit: boolean;
  list?: boolean;
}
