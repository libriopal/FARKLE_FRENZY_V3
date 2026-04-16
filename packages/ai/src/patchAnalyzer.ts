export interface PatchChange {
  file: string;
  type: 'append' | 'replace' | 'insert';
  target_anchor: string;
  description: string;
  content: string;
}

export interface PatchFile {
  _format: string;
  patch: {
    id: string;
    name: string;
    version: string;
    description: string;
    status: string;
  };
  changes: PatchChange[];
  rtp_impact: {
    baseline_rtp: number | null;
    projected_rtp: number | null;
    spawn_weight_adjustments: Record<string, number>;
  };
  test_results: {
    sandbox_sessions_run: number;
    avg_score_with_patch: number | null;
    farkle_rate_with_patch: number | null;
  };
}

export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
}

const PROTECTED_FILES = [
  'packages/engine/src/csprng.ts',
  'packages/engine/src/farkleScorer.ts'
];

export function validatePatch(patch: any): PatchValidationResult {
  const errors: string[] = [];

  if (!patch || typeof patch !== 'object') {
    return { valid: false, errors: ['Patch must be a valid JSON object'] };
  }

  if (patch._format !== 'farkle-patch-v1') {
    errors.push('Invalid patch format. Must be "farkle-patch-v1"');
  }

  if (!patch.patch || !patch.patch.id || !patch.patch.name) {
    errors.push('Missing required patch metadata (id, name)');
  }

  if (!Array.isArray(patch.changes)) {
    errors.push('Patch changes must be an array');
  } else {
    for (const change of patch.changes) {
      if (PROTECTED_FILES.includes(change.file)) {
        errors.push(\`Cannot modify protected file: \${change.file}\`);
      }
    }
  }

  if (patch.rtp_impact && patch.rtp_impact.spawn_weight_adjustments) {
    const weights = Object.values(patch.rtp_impact.spawn_weight_adjustments) as number[];
    const sum = weights.reduce((a, b) => a + Math.abs(b), 0);
    if (sum > 0.5) {
      errors.push('Total spawn weight adjustments cannot exceed 0.5 (50%)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function summarizePatch(patch: PatchFile): string {
  return \`\${patch.patch.name} v\${patch.patch.version} - \${patch.patch.description}\`;
}

export function getSpawnWeightAdjustments(patch: PatchFile): Record<string, number> {
  return patch.rtp_impact?.spawn_weight_adjustments || {};
}

export function isRTPInRange(rtp: number): boolean {
  return rtp >= 0.80 && rtp <= 1.05;
}

export function getPatchStatus(patch: PatchFile): string {
  return patch.patch.status || 'draft';
}
