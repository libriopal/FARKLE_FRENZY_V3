// FILE: /controller/farkleRules.ts

import type { FarkleRuleId, FarkleRuleResult } from './types';

/**
 * Runs all specified Farkle static analysis rules against the code via regex.
 */
export function runFarkleRules(code: string, ruleIds: FarkleRuleId[]): FarkleRuleResult[] {
  const results: FarkleRuleResult[] = [];
  
  for (const rule of ruleIds) {
    let passed = true;
    let message = 'Pass';
    let match: RegExpExecArray | null = null;
    
    switch (rule) {
      case 'no_math_random':
        match = /(?<!\/\/.*)Math\.random\(\)/.exec(code);
        if (match) { passed = false; message = 'Detected Math.random(). Use seededRng() or CSPRNG.'; }
        break;
      case 'no_better_sqlite3':
        match = /['"]better-sqlite3['"]/.exec(code);
        if (match) { passed = false; message = 'Detected better-sqlite3 import. Use sql.js.'; }
        break;
      case 'uses_sql_js_not_better_sqlite':
        match = /['"]better-sqlite3['"]/.exec(code);
        if (match) { passed = false; message = 'Detected better-sqlite3 import. Must use sql.js for server files.'; }
        break;
      case 'no_activebombs_array':
        match = /activeBombs\s*:\s*(\[|ActiveBomb)/.exec(code);
        if (match) { passed = false; message = 'Detected activeBombs array field. Bombs are cell types now.'; }
        break;
      case 'no_activebomb_interface':
        match = /interface\s+ActiveBomb/.exec(code);
        if (match) { passed = false; message = 'Detected ActiveBomb interface. Bombs use Cell interface.'; }
        break;
      case 'no_setinterval_cascade':
        match = /setInterval.*\b(cascade|refill|gravity)\b/i.exec(code);
        if (!match) match = /\b(cascade|refill|gravity)\b.*setInterval/i.exec(code);
        if (match) { passed = false; message = 'Detected setInterval near cascade logic. Use setTimeout recursion.'; }
        break;
      case 'no_framer_motion_import':
        match = /from\s+['"]framer-motion['"]/.exec(code);
        if (match) { passed = false; message = "Detected 'framer-motion' import. Use 'motion/react'."; }
        break;
      case 'no_sp_free_casino_names':
        match = /['"](SP_FREE|SP_CASINO)['"]/.exec(code);
        if (match) { passed = false; message = 'Detected old mode names. Use SOLO_FREE or SOLO_CASINO.'; }
        break;
      case 'no_rally_grid_size_fn':
        match = /rallyGridSize\s*\(/.exec(code);
        if (match) { passed = false; message = 'Detected rallyGridSize. Use multiplayerGridSize.'; }
        break;
      case 'no_recover_dead_board':
        match = /(recoverDeadBoard|ensurePlayableGrid)\s*\(/.exec(code);
        if (match) { passed = false; message = 'Detected removed dead board functions. Handled by SixPoolManager now.'; }
        break;
      case 'no_spawnpool_class':
        match = /(class\s+SpawnPool|new\s+SpawnPool\s*\()/.exec(code);
        if (match) { passed = false; message = 'Detected old SpawnPool class. Use SixPoolManager.'; }
        break;
      case 'no_bomb_tsx_import':
        match = /from\s+['"][^'"]*\/Bomb['"]/.exec(code);
        if (match) { passed = false; message = 'Detected Bomb.tsx import. Bomb visuals are in Tile.tsx.'; }
        break;
      case 'no_rainbow_bomb_tsx_import':
        match = /from\s+['"][^'"]*\/RainbowBomb['"]/.exec(code);
        if (match) { passed = false; message = 'Detected RainbowBomb.tsx import. Bomb visuals are in Tile.tsx.'; }
        break;
      case 'uses_workspace_aliases':
        match = /from\s+['"](?:\.\.\/)*packages\//.exec(code);
        if (match) { passed = false; message = 'Detected relative import to packages/. Use @farkle/* aliases.'; }
        break;
      case 'uses_nanoid':
        match = /(uuid\(\)|crypto\.randomUUID\(\))/.exec(code);
        if (match) { passed = false; message = 'Detected uuid/crypto.randomUUID. Use nanoid().'; }
        break;
      case 'uses_csprng_not_lcg':
        match = /seededRng\s*\(/.exec(code);
        // Only fails if not in a monteCarlo/simulation context where it's allowed
        if (match && !code.includes('monteCarlo') && !code.includes('simulation')) {
          passed = false; message = 'Detected seededRng() outside simulation context. Use CSPRNG.';
        }
        break;
      case 'no_react_strict_mode':
        match = /<(?:React\.)?StrictMode>/.exec(code);
        if (match) { passed = false; message = 'Detected StrictMode. StrictMode is banned as it breaks cascade timing.'; }
        break;
      case 'no_setinterval_energy':
        match = /setInterval.*\b(energy|frenzy|prime)\b/i.exec(code);
        if (!match) match = /\b(energy|frenzy|prime)\b.*setInterval/i.exec(code);
        if (match) { passed = false; message = 'Detected setInterval near energy logic. Use requestAnimationFrame.'; }
        break;
      default:
        passed = true;
        message = \`Unknown rule \${rule}\`;
        break;
    }
    
    results.push({ rule, passed, message });
  }
  
  return results;
}

/**
 * Checks if the code contains the required exports via regex.
 */
export function checkRequiredExports(code: string, required: string[]): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const req of required) {
    const regexes = [
      new RegExp(\`export\\\\s+function\\\\s+\${req}\\\\b\`),
      new RegExp(\`export\\\\s+class\\\\s+\${req}\\\\b\`),
      new RegExp(\`export\\\\s+(?:const|let|var)\\\\s+\${req}\\\\b\`),
      new RegExp(\`export\\\\s+type\\\\s+\${req}\\\\b\`),
      new RegExp(\`export\\\\s+interface\\\\s+\${req}\\\\b\`),
      new RegExp(\`export\\\\s+\\\\{[^}]*\\\\b\${req}\\\\b[^}]*\\\\}\`)
    ];
    
    const found = regexes.some(r => r.test(code));
    if (!found) missing.push(req);
  }
  
  return { passed: missing.length === 0, missing };
}

/**
 * Builds a human-readable failure summary from rule and export failures.
 */
export function buildFailureSummary(results: FarkleRuleResult[], missing: string[]): string {
  const errors: string[] = [];
  
  for (const res of results) {
    if (!res.passed) errors.push(\`[Rule: \${res.rule}] \${res.message}\`);
  }
  
  if (missing.length > 0) {
    errors.push(\`[Exports] Missing required exports: \${missing.join(', ')}\`);
  }
  
  return errors.join('\\n');
}
