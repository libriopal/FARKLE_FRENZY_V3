// FILE: /controller/deterministicRepair.ts

import type { ValidationResult } from './types';

/** Regex-based deterministic replacements. */
export function applyRegexRepairs(code: string, validation: ValidationResult): { code: string; fixesApplied: string[] } {
  let modifiedCode = code;
  const fixesApplied: string[] = [];

  // strip_markdown_fences
  if (modifiedCode.trim().startsWith('\`\`\`')) {
    modifiedCode = modifiedCode.replace(/^\\s*\`\`\`(typescript|ts|tsx|js)?\\n/i, '');
    modifiedCode = modifiedCode.replace(/\\n\`\`\`\\s*$/i, '');
    fixesApplied.push('strip_markdown_fences');
  }

  // replace_framer_motion
  if (/['"]framer-motion['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/['"]framer-motion['"]/g, "'motion/react'");
    fixesApplied.push('replace_framer_motion');
  }

  // replace_sp_free_mode
  if (/['"]SP_FREE['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/['"]SP_FREE['"]/g, "'SOLO_FREE'");
    fixesApplied.push('replace_sp_free_mode');
  }

  // replace_sp_casino_mode
  if (/['"]SP_CASINO['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/['"]SP_CASINO['"]/g, "'SOLO_CASINO'");
    fixesApplied.push('replace_sp_casino_mode');
  }

  // replace_better_sqlite3
  if (/['"]better-sqlite3['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/from\s+['"]better-sqlite3['"]/g, "from 'sql.js'");
    modifiedCode = modifiedCode.replace(/require\(['"]better-sqlite3['"]\)/g, "require('sql.js')");
    fixesApplied.push('replace_better_sqlite3');
  }

  // remove_strict_mode_wrapper
  if (/<(?:React\.)?StrictMode>/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/<(?:React\.)?StrictMode>\s*/g, '');
    modifiedCode = modifiedCode.replace(/<\/(?:React\.)?StrictMode>\s*/g, '');
    fixesApplied.push('remove_strict_mode_wrapper');
  }

  // replace_rally_grid_size
  if (/rallyGridSize/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/rallyGridSize/g, 'multiplayerGridSize');
    fixesApplied.push('replace_rally_grid_size');
  }

  // replace_uuid_with_nanoid_import
  if (/import\s+\{.*uuid.*\}\s+from\s+['"]uuid['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/import\s+\{.*uuid.*\}\s+from\s+['"]uuid['"]/, "import { nanoid } from 'nanoid'");
    modifiedCode = modifiedCode.replace(/\buuid\(\)/g, "nanoid()");
    fixesApplied.push('replace_uuid_with_nanoid_import');
  }
  
  if (/crypto\.randomUUID\(\)/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/crypto\.randomUUID\(\)/g, "nanoid()");
    fixesApplied.push('replace_crypto_random_with_nanoid');
  }

  // add_missing_nanoid_import
  if (/nanoid\(\)/.test(modifiedCode) && !modifiedCode.includes('nanoid')) {
    modifiedCode = \`import { nanoid } from 'nanoid';\\n\` + modifiedCode;
    fixesApplied.push('add_missing_nanoid_import');
  }

  // normalize_workspace_imports_shared
  if (/from\s+['"](?:\.\.\/)+packages\/shared[^'"]*['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/from\s+['"](?:\.\.\/)+packages\/shared([^'"]*)['"]/g, "from '@farkle/shared$1'");
    fixesApplied.push('normalize_workspace_imports_shared');
  }

  // normalize_workspace_imports_engine
  if (/from\s+['"](?:\.\.\/)+packages\/engine[^'"]*['"]/.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(/from\s+['"](?:\.\.\/)+packages\/engine([^'"]*)['"]/g, "from '@farkle/engine$1'");
    fixesApplied.push('normalize_workspace_imports_engine');
  }

  // flag_setinterval_cascade
  if (/setInterval.*\b(cascade|refill|gravity)\b/i.test(modifiedCode)) {
    modifiedCode = \`// [CONTROLLER-C WARN] setInterval detected near cascade logic. Recursion is required.\\n\` + modifiedCode;
    fixesApplied.push('flag_setinterval_cascade');
  }

  return { code: modifiedCode, fixesApplied };
}

/** AST-based deterministic replacements. */
export async function applyASTRepairs(code: string, requiredExports: string[], targetFile: string): Promise<{ code: string; fixesApplied: string[] }> {
  const fixesApplied: string[] = [];
  try {
    const { Project, SyntaxKind } = await import('ts-morph');
    const project = new Project();
    
    // Virtual file
    const sourceFile = project.createSourceFile('temp.ts', code);

    // 1. Add missing 'export' keyword
    for (const req of requiredExports) {
      // Functions
      const func = sourceFile.getFunction(req);
      if (func && !func.isExported()) {
        func.setIsExported(true);
        fixesApplied.push(\`ast_export_added:function:\${req}\`);
      }
      // Classes
      const cls = sourceFile.getClass(req);
      if (cls && !cls.isExported()) {
        cls.setIsExported(true);
        fixesApplied.push(\`ast_export_added:class:\${req}\`);
      }
      // Interfaces
      const intf = sourceFile.getInterface(req);
      if (intf && !intf.isExported()) {
        intf.setIsExported(true);
        fixesApplied.push(\`ast_export_added:interface:\${req}\`);
      }
      // Types
      const typ = sourceFile.getTypeAlias(req);
      if (typ && !typ.isExported()) {
        typ.setIsExported(true);
        fixesApplied.push(\`ast_export_added:type:\${req}\`);
      }
      // Variables
      const varDec = sourceFile.getVariableStatement(v => {
        return v.getDeclarations().some(d => d.getName() === req);
      });
      if (varDec && !varDec.isExported()) {
        varDec.setIsExported(true);
        fixesApplied.push(\`ast_export_added:const:\${req}\`);
      }
    }

    // 2. Remove duplicate imports
    const importDeclarations = sourceFile.getImportDeclarations();
    const seenModules = new Set<string>();
    for (const imp of importDeclarations) {
      const mod = imp.getModuleSpecifierValue();
      if (seenModules.has(mod)) {
        // Simple heuristic: don't aggressively delete logic, just exact dupes if they bring same named imports, 
        // to be safe we prefer not deleting unless we merge them, which is complex.
        // We'll skip complex import merging for now.
      } else {
        seenModules.add(mod);
      }
    }

    // 3. Strip trailing junk
    const syntaxList = sourceFile.getChildAtIndexIfKind(0, SyntaxKind.SyntaxList);
    if (syntaxList) {
      // If ts-morph can parse it, we just format and getText
    }
    
    sourceFile.formatText();
    return { code: sourceFile.getFullText(), fixesApplied };
  } catch (err) {
    console.warn('AST Repair failed or ts-morph not available:', err);
    return { code, fixesApplied: [] };
  }
}

/** Quick health check for valid TS code syntax. */
export function looksLikeValidTS(code: string): boolean {
  // Simple heuristic: shouldn't start with random text unless it's a comment/import/export/class/function/const/let/var
  const trimmed = code.trim();
  if (trimmed.length === 0) return false;
  if (/^((import|export|class|function|const|let|var|type|interface)\s|\/\*|\/\/)/.test(trimmed)) {
    return true;
  }
  return false;
}
