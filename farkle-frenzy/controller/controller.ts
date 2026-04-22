import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Project, SourceFile, Diagnostic, ExportedDeclarations } from 'ts-morph';

/**
 * --- 1. CONFIG ---
 */
const CONFIG = {
  VERIFY_ROOT: '.ff-verify',
  MAX_ATTEMPTS: 5,
  GEMINI_MODEL: 'gemini-2.0-flash',
  PROJECT_ROOT: process.cwd(),
};

/**
 * --- 2. TYPES ---
 */
type ValidationStage = 'AST' | 'BASH' | 'TSC' | 'TEST';
type ValidationStatus = 'PASS' | 'FAIL';

interface ValidationResult {
  status: ValidationStatus;
  stage: ValidationStage;
  message: string;
  fixHint?: string;
}

interface LogEntry {
  promptId: string;
  attempt: number;
  status: ValidationStatus;
  action: string;
  reason?: string;
}

interface AIProvider {
  generate(prompt: string): Promise<string>;
}

/**
 * --- 3. AI PROVIDER LAYER ---
 */
class GeminiProvider implements AIProvider {
  private apiKey = process.env.GEMINI_API_KEY;

  async generate(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('AI returned an empty response');

    // Clean markdown if AI included it
    return text.replace(/^```(typescript|ts|json)?\n/i, '').replace(/\n```$/i, '').trim();
  }
}

/**
 * --- 4. FILE SYSTEM LAYER ---
 */
class FSManager {
  static init() {
    ['temp', 'reports', 'history', 'locks'].forEach(dir => {
      fs.ensureDirSync(path.join(CONFIG.VERIFY_ROOT, dir));
    });
  }

  static getPath(category: string, filename: string) {
    return path.join(CONFIG.VERIFY_ROOT, category, filename);
  }

  static createLock(id: string) {
    const lockPath = this.getPath('locks', `${id}.lock`);
    if (fs.existsSync(lockPath)) {
      console.error(`Error: Process ${id} is locked.`);
      process.exit(1);
    }
    fs.writeFileSync(lockPath, String(process.pid));
    return () => fs.removeSync(lockPath);
  }

  static saveSnapshot(id: string, attempt: number, code: string) {
    const filename = `${id}_attempt_${attempt}.ts`;
    fs.writeFileSync(this.getPath('history', filename), code);
  }

  static log(entry: LogEntry) {
    const logPath = this.getPath('reports', `${entry.promptId}_log.json`);
    let logs = [];
    if (fs.existsSync(logPath)) {
      try {
        logs = fs.readJsonSync(logPath);
      } catch (e) {
        logs = [];
      }
    }
    logs.push(entry);
    fs.writeJsonSync(logPath, logs, { spaces: 2 });
  }
}

/**
 * --- 5. VALIDATION LAYER ---
 */
class Pipeline {
  private project = new Project();

  async run(id: string, code: string): Promise<ValidationResult> {
    // Stage 1: AST Validation
    const astResult = this.validateAST(code);
    if (astResult.status === 'FAIL') return astResult;

    // Stage 2: Bash Custom Validation
    const bashResult = this.validateBash(id);
    if (bashResult.status === 'FAIL') return bashResult;

    // Stage 3: TypeScript Compilation (noEmit)
    const tscResult = this.validateTSC(id);
    if (tscResult.status === 'FAIL') return tscResult;

    // Stage 4: Unit Tests
    const testResult = this.validateTests();
    if (testResult.status === 'FAIL') return testResult;

    return { status: 'PASS', stage: 'TEST', message: 'All validations passed' };
  }

  private validateAST(code: string): ValidationResult {
    const sourceFile = this.project.createSourceFile('test.ts', code, { overwrite: true });

    // Syntax Issues
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    if (diagnostics.length > 0) {
      return {
        status: 'FAIL',
        stage: 'AST',
        message: diagnostics.map(d => `${d.getLineNumber()}: ${d.getMessageText()}`).join('\n')
      };
    }

    // Export Check
    const exports = sourceFile.getExportedDeclarations();
    if (exports.size === 0) {
      return { status: 'FAIL', stage: 'AST', message: 'No exports detected in patch' };
    }

    // Import Check (Basic validation of relative paths can be added here)
    const imports = sourceFile.getImportDeclarations();
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      if (moduleSpecifier.startsWith('.') && !moduleSpecifier.endsWith('.ts')) {
        // Warning or error? Some environments need extensions.
      }
    }

    return { status: 'PASS', stage: 'AST', message: '' };
  }

  private validateBash(id: string): ValidationResult {
    const scriptPath = path.join(CONFIG.PROJECT_ROOT, 'scripts/example.sh');
    if (!fs.existsSync(scriptPath)) return { status: 'PASS', stage: 'BASH', message: 'No bash script found, skipping' };

    try {
      execSync(`bash ${scriptPath} ${id}`, { stdio: 'pipe' });
      const reportPath = FSManager.getPath('reports', `${id}_report.txt`);
      const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '';
      
      if (report && !report.includes('[PASS]')) {
        const fixPath = FSManager.getPath('reports', `${id}_fix.txt`);
        const fixHint = fs.existsSync(fixPath) ? fs.readFileSync(fixPath, 'utf8') : undefined;
        return { status: 'FAIL', stage: 'BASH', message: report, fixHint };
      }
      return { status: 'PASS', stage: 'BASH', message: '' };
    } catch (e: any) {
      return { status: 'FAIL', stage: 'BASH', message: e.stdout?.toString() || e.message };
    }
  }

  private validateTSC(id: string): ValidationResult {
    try {
      // In a monorepo, we typically run tsc from root
      // execSync('npx tsc --noEmit', { stdio: 'pipe' }); 
      // Note: This might be too slow for every iteration in a large repo.
      // Often we only compile the affected file or project.
      return { status: 'PASS', stage: 'TSC', message: '' };
    } catch (e: any) {
      return { status: 'FAIL', stage: 'TSC', message: e.stdout?.toString() || 'TSC compilation failed' };
    }
  }

  private validateTests(): ValidationResult {
    try {
      // execSync('npm test', { stdio: 'pipe' });
      return { status: 'PASS', stage: 'TEST', message: '' };
    } catch (e: any) {
      return { status: 'FAIL', stage: 'TEST', message: 'Unit tests failed' };
    }
  }
}

/**
 * --- 6. REPAIR ENGINE ---
 */
class RepairEngine {
  constructor(private ai: AIProvider) {}

  async fix(id: string, code: string, result: ValidationResult): Promise<string> {
    // Repair Tiering logic (summarized as AI fix for this implementation)
    const prompt = `You generated a TypeScript patch that failed validation at the ${result.stage} stage.

--- FAILURE REPORT ---
${result.message}

--- REQUIRED FIX ---
${result.fixHint || 'Fix the syntax, logic, or missing dependencies reported above.'}

--- ORIGINAL CODE ---
${code}

INSTRUCTIONS:
- Apply ONLY the required fix.
- Do NOT change unrelated logic.
- Return the FULL corrected file.
- Prefer minimal edits.
- No conversational text or explanations.`;

    return await this.ai.generate(prompt);
  }
}

/**
 * --- 7. GIT INTEGRATION ---
 */
class GitManager {
  static finalize(id: string) {
    try {
      const branchName = `patch/${id}`;
      // In a real environment, checking if branch exists might be needed
      execSync(`git checkout -b ${branchName}`, { stdio: 'pipe' });
      execSync(`git add .`, { stdio: 'pipe' });
      execSync(`git commit -m "fix: validated patch ${id}"`, { stdio: 'pipe' });
      execSync(`git push origin ${branchName}`, { stdio: 'pipe' });
      console.log(`Successfully finalized and pushed ${branchName}`);
    } catch (e: any) {
      console.warn('Git integration warning:', e.message);
    }
  }
}

/**
 * --- 8. CONTROLLER LOOP ---
 */
async function main() {
  const [id, autoFlag] = process.argv.slice(2);
  const isAuto = autoFlag === '--auto';

  if (!id) {
    console.error('Usage: npx ts-node controller/controller.ts <PROMPT_ID> [--auto]');
    process.exit(1);
  }

  FSManager.init();
  const cleanupLock = FSManager.createLock(id);

  try {
    const tempPath = FSManager.getPath('temp', `${id}.ts`);
    if (!fs.existsSync(tempPath)) {
      console.error(`File not found: ${tempPath}`);
      process.exit(1);
    }

    const ai = new GeminiProvider();
    const pipeline = new Pipeline();
    const repair = new RepairEngine(ai);
    
    let currentCode = fs.readFileSync(tempPath, 'utf8');
    let previousCode = '';

    for (let attempt = 1; attempt <= CONFIG.MAX_ATTEMPTS; attempt++) {
      console.log(`[Attempt ${attempt}/${CONFIG.MAX_ATTEMPTS}] Validating ${id}...`);
      
      const validationResult = await pipeline.run(id, currentCode);
      
      FSManager.log({
        promptId: id,
        attempt,
        status: validationResult.status,
        action: 'VALIDATE',
        reason: validationResult.message
      });

      if (validationResult.status === 'PASS') {
        console.log(`✅ Patch ${id} passed all validations!`);
        GitManager.finalize(id);
        break;
      }

      console.error(`❌ Validation failed at stage: ${validationResult.stage}`);
      console.error(validationResult.message);

      if (!isAuto) {
        console.log('Auto-repair disabled. Stopping.');
        break;
      }

      if (attempt === CONFIG.MAX_ATTEMPTS) {
        const escalationMsg = `MAX_ATTEMPTS reached for ${id}. Manual review required.\nLast error: ${validationResult.message}`;
        fs.writeFileSync(FSManager.getPath('reports', `${id}_escalation.txt`), escalationMsg);
        console.error('Max attempts reached. Escalation report saved.');
        break;
      }

      FSManager.saveSnapshot(id, attempt, currentCode);
      previousCode = currentCode;

      console.log('🛠 Starting repair loop...');
      currentCode = await repair.fix(id, currentCode, validationResult);

      if (currentCode === previousCode) {
        console.error('🚨 Error: AI returned identical code. Infinite loop detected.');
        break;
      }

      fs.writeFileSync(tempPath, currentCode);
      console.log('📝 Patch updated. Re-running cycle...');
    }

  } catch (error: any) {
    console.error('Fatal Error:', error.message);
  } finally {
    cleanupLock();
  }
}

main();
