import { useState, useCallback } from 'react';
import type { PatchFile, PatchValidationResult, RTPAnalysisOutput } from '@farkle/ai';

export interface SandboxState {
  activePatch: PatchFile | null;
  validation: PatchValidationResult | null;
  simulationResults: any | null;
  analysis: RTPAnalysisOutput | null;
  isSimulating: boolean;
  isAnalyzing: boolean;
  spawnWeights: Record<string, number>;
}

export function useSandbox() {
  const [state, setState] = useState<SandboxState>({
    activePatch: null,
    validation: null,
    simulationResults: null,
    analysis: null,
    isSimulating: false,
    isAnalyzing: false,
    spawnWeights: {
      face_1: 0,
      face_2: 0,
      face_3: 0,
      face_4: 0,
      face_5: 0,
      face_6: 0
    }
  });

  const loadPatch = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const patch = JSON.parse(text) as PatchFile;
      
      const res = await fetch('/api/sandbox/validate-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch })
      });
      
      const { validation } = await res.json();
      
      setState(prev => ({
        ...prev,
        activePatch: patch,
        validation,
        spawnWeights: patch.rtp_impact?.spawn_weight_adjustments || prev.spawnWeights
      }));
      
    } catch (error) {
      console.error('Failed to load patch:', error);
      setState(prev => ({
        ...prev,
        validation: { valid: false, errors: ['Failed to parse patch file'] }
      }));
    }
  }, []);

  const clearPatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      activePatch: null,
      validation: null,
      simulationResults: null,
      analysis: null,
      spawnWeights: {
        face_1: 0, face_2: 0, face_3: 0, face_4: 0, face_5: 0, face_6: 0
      }
    }));
  }, []);

  const updateSpawnWeight = useCallback((face: string, value: number) => {
    setState(prev => ({
      ...prev,
      spawnWeights: {
        ...prev.spawnWeights,
        [face]: value
      }
    }));
  }, []);

  const runSimulation = useCallback(async () => {
    if (!state.activePatch) return;
    
    setState(prev => ({ ...prev, isSimulating: true }));
    
    try {
      // In a real implementation, we'd pass the spawn weights too
      const patchWithWeights = {
        ...state.activePatch,
        rtp_impact: {
          ...state.activePatch.rtp_impact,
          spawn_weight_adjustments: state.spawnWeights
        }
      };
      
      const res = await fetch('/api/sandbox/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: patchWithWeights, sessions: 4000 })
      });
      
      const { results } = await res.json();
      
      setState(prev => ({
        ...prev,
        isSimulating: false,
        simulationResults: results
      }));
      
    } catch (error) {
      console.error('Simulation failed:', error);
      setState(prev => ({ ...prev, isSimulating: false }));
    }
  }, [state.activePatch, state.spawnWeights]);

  const runAnalysis = useCallback(async () => {
    if (!state.activePatch || !state.simulationResults) return;
    
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      const input = {
        patchName: state.activePatch.patch.name,
        patchDescription: state.activePatch.patch.description,
        baselineRTP: state.activePatch.rtp_impact.baseline_rtp || 0.95,
        simulationResults: state.simulationResults,
        spawnWeightAdjustments: state.spawnWeights
      };
      
      const res = await fetch('/api/sandbox/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      
      const { analysis } = await res.json();
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysis
      }));
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [state.activePatch, state.simulationResults, state.spawnWeights]);

  const exportPatch = useCallback(() => {
    if (!state.activePatch) return;
    
    const exportData = {
      ...state.activePatch,
      rtp_impact: {
        ...state.activePatch.rtp_impact,
        spawn_weight_adjustments: state.spawnWeights,
        projected_rtp: state.analysis?.projectedRTP || state.activePatch.rtp_impact.projected_rtp
      },
      test_results: state.simulationResults ? {
        sandbox_sessions_run: state.simulationResults.sessionsRun,
        avg_score_with_patch: state.simulationResults.avgScore,
        farkle_rate_with_patch: state.simulationResults.farkleRate
      } : state.activePatch.test_results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${state.activePatch.patch.id}-final.json\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.activePatch, state.spawnWeights, state.simulationResults, state.analysis]);

  return {
    state,
    loadPatch,
    clearPatch,
    updateSpawnWeight,
    runSimulation,
    runAnalysis,
    exportPatch
  };
}
