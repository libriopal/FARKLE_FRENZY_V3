// FILE: /controller/fileManager.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { PatchConfig } from './types';

/** Acquires a file-based lock with a 60-second stale timeout. */
export async function acquireLock(lockFile: string): Promise<void> {
  const dir = path.dirname(lockFile);
  await fs.mkdir(dir, { recursive: true });
  
  try {
    const stat = await fs.stat(lockFile);
    const now = Date.now();
    if (now - stat.mtimeMs > 60000) {
      await fs.unlink(lockFile); // Break stale lock
    } else {
      throw new Error(\`Lock exists: \${lockFile}\`);
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
  
  await fs.writeFile(lockFile, Date.now().toString(), 'utf-8');
}

/** Releases a file-based lock silently if it's already gone. */
export async function releaseLock(lockFile: string): Promise<void> {
  try {
    await fs.unlink(lockFile);
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
}

/** Writes code to the staging directory. */
export async function writeStaged(stagedPath: string, code: string): Promise<void> {
  await fs.mkdir(path.dirname(stagedPath), { recursive: true });
  await fs.writeFile(stagedPath, code, 'utf-8');
}

/** Reads code from the staging directory. */
export async function readStaged(stagedPath: string): Promise<string | null> {
  try {
    return await fs.readFile(stagedPath, 'utf-8');
  } catch {
    return null;
  }
}

/** Atomically commits the staged file to its final target path. */
export async function atomicCommit(stagedPath: string, targetPath: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(stagedPath, targetPath);
}

/** Cleans up the staging directory (best effort). */
export async function cleanStaging(stagingDir: string): Promise<void> {
  try {
    await fs.rm(stagingDir, { recursive: true, force: true });
  } catch {
    // Silent
  }
}

/** Reads original target file, returns empty string if not found. */
export async function readOriginalFile(projectRoot: string, targetFile: string): Promise<string> {
  try {
    return await fs.readFile(path.join(projectRoot, targetFile), 'utf-8');
  } catch {
    return '';
  }
}

/** Computes SHA-256 hex hash of content. */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/** Loads the prompt file content. */
export async function loadPromptFile(patch: PatchConfig, projectRoot: string): Promise<string> {
  return await fs.readFile(path.join(projectRoot, patch.prompt_file), 'utf-8');
}

/** Loads context files, truncating if over 8000 chars. */
export async function loadContextFiles(patch: PatchConfig, projectRoot: string): Promise<string> {
  const parts: string[] = [];
  for (const ctxFile of patch.context_files) {
    try {
      let content = await fs.readFile(path.join(projectRoot, ctxFile), 'utf-8');
      if (content.length > 8000) {
        content = content.substring(0, 8000) + '\\n...[TRUNCATED]';
      }
      parts.push(\`--- CONTEXT: \${ctxFile} ---\\n\${content}\\n--- END CONTEXT ---\\n\`);
    } catch {
      parts.push(\`--- CONTEXT: \${ctxFile} (NOT FOUND) ---\\n\`);
    }
  }
  return parts.join('\\n');
}

/** Loads the FF patch configuration map. */
export async function loadFFConfig(projectRoot: string): Promise<Record<string, PatchConfig>> {
  const content = await fs.readFile(path.join(projectRoot, 'ff-config.json'), 'utf-8');
  return JSON.parse(content);
}

/** Gets a specific patch config. */
export async function getPatchConfig(projectRoot: string, patchId: string): Promise<PatchConfig> {
  const config = await loadFFConfig(projectRoot);
  const patch = config[patchId];
  if (!patch) throw new Error(\`Patch \${patchId} not found in ff-config.json\`);
  return patch;
}

/** Resolves staging path. */
export function getStagingPath(projectRoot: string, patchId: string, targetFile: string): string {
  return path.join(projectRoot, '.ff-verify', 'temp', patchId, targetFile);
}

/** Resolves lock path. */
export function getLockPath(projectRoot: string, patchId: string): string {
  return path.join(projectRoot, '.ff-verify', 'locks', \`\${patchId}.lock\`);
}

/** Resolves report directory path. */
export function getReportDir(projectRoot: string): string {
  return path.join(projectRoot, '.ff-verify', 'reports');
}
