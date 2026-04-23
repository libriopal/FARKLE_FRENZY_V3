// FILE: /controller/logger.ts

import * as fs from 'fs/promises';
import type { ValidationResult, RepairAttempt, EscalationReport } from './types';

function prefix(id?: string) {
  const ts = new Date().toISOString().substring(11, 19); // HH:MM:SS
  const pid = id ? \` \x1b[36m[\${id}]\x1b[0m\` : '';
  return \`\x1b[90m\${ts}\x1b[0m\${pid}\`;
}

export const log = {
  info: (msg: string, id?: string) => console.log(\`\${prefix(id)} \x1b[34mℹ\x1b[0m \${msg}\`),
  success: (msg: string, id?: string) => console.log(\`\${prefix(id)} \x1b[32m✔\x1b[0m \${msg}\`),
  warn: (msg: string, id?: string) => console.warn(\`\${prefix(id)} \x1b[33m⚠\x1b[0m \${msg}\`),
  error: (msg: string, id?: string) => console.error(\`\${prefix(id)} \x1b[31m✖\x1b[0m \${msg}\`),
  repair: (msg: string, id?: string) => console.log(\`\${prefix(id)} \x1b[35m🔧\x1b[0m \${msg}\`),
  phase: (name: string, id?: string) => console.log(\`\${prefix(id)} \x1b[1m\x1b[37m► [\${name.toUpperCase()}]\x1b[0m\`),
  attempt: (n: number, tier: string, id?: string) => console.log(\`\${prefix(id)} \x1b[35mAttempt \${n} (\${tier})\x1b[0m\`)
};

export function printPipelineSummary(patchId: string, patchName: string, outcome: string, totalMs: number, repairAttempts: RepairAttempt[], gitCommit?: string) {
  console.log('\\n\x1b[1m\x1b[36m=== CONTROLLER-C PIPELINE SUMMARY ===\x1b[0m');
  console.log(\`Patch:     \${patchId} | \${patchName}\`);
  console.log(\`Outcome:   \${outcome === 'success' ? '\x1b[32mSUCCESS' : outcome === 'failed' ? '\x1b[31mFAILED' : '\x1b[33mESCALATED'}\x1b[0m\`);
  console.log(\`Time:      \${(totalMs / 1000).toFixed(1)}s\`);
  console.log(\`Repairs:   \${repairAttempts.length} attempts triggered\`);
  if (gitCommit) console.log(\`Commit:    \${gitCommit.substring(0, 7)}\`);
  console.log('\x1b[1m\x1b[36m=====================================\x1b[0m\\n');
}

export function printValidationResult(v: ValidationResult, id?: string) {
  log.info('Validation Matrix:', id);
  console.log(\`   Farkle Rules: \${v.farkleRulesPassed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\`);
  console.log(\`   Exports:      \${v.exportsPassed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\`);
  console.log(\`   TSC Types:    \${v.tscPassed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\`);
  console.log(\`   Bash Script:  \${v.bashPassed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\`);
  console.log(\`   Vitest:       \${v.vitestPassed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\`);
}

export async function writeEscalationReport(report: EscalationReport, reportDir: string): Promise<string> {
  await fs.mkdir(reportDir, { recursive: true });
  const filename = \`\${reportDir}/escalate_\${report.patchId}_\${Date.now()}.json\`;
  await fs.writeFile(filename, JSON.stringify(report, null, 2), 'utf-8');
  return filename;
}
