#!/usr/bin/env node

// FILE: /controller/controller.ts

import * as readline from 'readline';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CLIOptions } from './types';
import { runPipeline } from './orchestrator';
import { loadFFConfig } from './fileManager';

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), '..');

const args = process.argv.slice(2);

const opts: CLIOptions = {
  patchId: '',
  auto: false,
  dry: false,
  verbose: false,
  noGit: false,
  list: false
};

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
  if (arg === '--list' || arg === '-l') opts.list = true;
  else if (arg === '--auto') opts.auto = true;
  else if (arg === '--dry') opts.dry = true;
  else if (arg === '--verbose') opts.verbose = true;
  else if (arg === '--no-git') opts.noGit = true;
  else if (!arg.startsWith('-')) opts.patchId = arg;
}

async function main() {
  if (opts.list) {
    try {
      const config = await loadFFConfig(PROJECT_ROOT);
      console.log('\\nAvailable Patches:');
      for (const [id, pc] of Object.entries(config)) {
        console.log(\`  \x1b[36m\${id.padEnd(5)}\x1b[0m : \${pc.name}\`);
      }
      process.exit(0);
    } catch (err: any) {
      console.error(\`Failed to load ff-config.json: \${err.message}\`);
      process.exit(1);
    }
  }

  if (!opts.patchId) {
    console.error('Error: No patch ID provided.');
    printHelp();
    process.exit(1);
  }

  if (!opts.auto) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(resolve => rl.question(\`About to apply patch \${opts.patchId}. Proceed? (yes/no): \`, resolve));
    rl.close();
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  try {
    await runPipeline(opts, PROJECT_ROOT);
    process.exit(0);
  } catch (err: any) {
    console.error(\`\\n\x1b[31mPipeline Failed: \${err.message}\x1b[0m\`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(\`
Usage: npx tsx controller/controller.ts [PATCH_ID] [OPTIONS]

Options:
  --list, -l   List available patches from ff-config.json
  --auto       Skip confirmation prompt
  --dry        Generate and stage only, skip validation and commit
  --verbose    Log code previews and detailed outputs
  --no-git     Skip git preflight and commit steps
  --help, -h   Show this help
\`);
}

main().catch(console.error);
