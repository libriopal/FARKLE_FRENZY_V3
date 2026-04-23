// FILE: /controller/gitService.ts

import { execSync } from 'child_process';
import * as path from 'path';

/** Preflight check for working tree status. */
export function preflightGitCheck(projectRoot: string, targetFile: string): { safe: boolean; reason?: string } {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: projectRoot, stdio: 'ignore' });
    
    const status = execSync(\`git status --porcelain \${targetFile}\`, { cwd: projectRoot, stdio: 'pipe' }).toString().trim();
    if (status !== '') {
      return { safe: false, reason: \`File \${targetFile} has uncommitted changes.\` };
    }
    
    return { safe: true };
  } catch {
    // Note: If no git, we just say it's safe and run in a no-git manner.
    return { safe: true }; 
  }
}

/** Get git metadata if available. */
export function getGitState(projectRoot: string): { branch: string; commitHash: string } {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot }).toString().trim();
    const commitHash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();
    return { branch, commitHash };
  } catch {
    return { branch: 'unknown', commitHash: 'unknown' };
  }
}

/** Commits the patch target file. */
export async function commitPatch(
  projectRoot: string, 
  targetFile: string, 
  patchId: string, 
  patchName: string, 
  originalContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    execSync(\`git add \${targetFile}\`, { cwd: projectRoot, stdio: 'pipe' });
    const message = \`[controller-c] \${patchId}: \${patchName}\\n\\nAutomated patch applied by Controller-C.\\nAll validation layers passed.\`;
    execSync(\`git commit -m "\${message}"\`, { cwd: projectRoot, stdio: 'pipe' });
    return { success: true };
  } catch (err: any) {
    await rollbackFile(projectRoot, targetFile, originalContent, patchId);
    return { success: false, error: err.message };
  }
}

/** Rolls back the target file to original state and un-stages it. */
export async function rollbackFile(projectRoot: string, targetFile: string, originalContent: string, patchId: string): Promise<void> {
  const fs = await import('fs/promises');
  try {
    if (originalContent) {
      await fs.writeFile(path.join(projectRoot, targetFile), originalContent, 'utf-8');
    } else {
      await fs.unlink(path.join(projectRoot, targetFile));
    }
  } catch (e) {
    // Ignore FS errors on rollback
  }
  unstageFile(projectRoot, targetFile);
}

/** Unstages a specific file. */
export function unstageFile(projectRoot: string, targetFile: string): void {
  try {
    execSync(\`git restore --staged \${targetFile}\`, { cwd: projectRoot, stdio: 'ignore' });
  } catch {
    // Ignore
  }
}
