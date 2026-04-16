import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useSandbox } from '../hooks/useSandbox';

interface Props {
  onClose: () => void;
}

export default function SandboxTab({ onClose }: Props) {
  const { isDark } = useTheme();
  const {
    state,
    loadPatch,
    clearPatch,
    updateSpawnWeight,
    runSimulation,
    runAnalysis,
    exportPatch
  } = useSandbox();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadPatch(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderMultiplierBars = () => {
    if (!state.simulationResults?.multiplierDistribution) return null;
    
    const dist = state.simulationResults.multiplierDistribution;
    const max = Math.max(...Object.values(dist) as number[]);
    
    return (
      <div className="flex flex-col gap-1 mt-4 font-mono text-xs">
        <div className={`mb-1 font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>MULTIPLIER HIT DISTRIBUTION</div>
        {Object.entries(dist).map(([key, val]) => {
          const percentage = ((val as number) * 100).toFixed(1);
          const barLength = Math.max(1, Math.round(((val as number) / max) * 20));
          const bar = '█'.repeat(barLength);
          const label = key.replace('_', '.');
          
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="w-8 text-right text-amber-500">{label}</div>
              <div className={`flex-1 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>
                <span className="text-amber-400">{bar}</span>
              </div>
              <div className={`w-10 text-right ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{percentage}%</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-100 text-slate-800'}`}>
      {/* Top Bar */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className={`font-bold px-3 py-1 rounded-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-slate-200 hover:bg-slate-300'}`}
          >
            ← BACK
          </button>
          <div className="font-black text-amber-500 text-xl tracking-widest">⚗ SANDBOX</div>
        </div>
        <div className={`text-sm font-bold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
          PATCHES ACTIVE: {state.activePatch ? '1' : '0'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Patches & Sliders */}
        <div className={`w-1/3 flex flex-col border-r ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'}`}>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="font-black tracking-widest text-sm">LOADED PATCH</div>
              {state.activePatch && (
                <button 
                  onClick={clearPatch}
                  className="text-xs text-rose-500 hover:text-rose-400 font-bold"
                >
                  CLEAR
                </button>
              )}
            </div>

            {!state.activePatch ? (
              <div className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4 ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-300 text-slate-400'}`}>
                <div className="text-4xl">📄</div>
                <div className="text-sm">No patch loaded.<br/>Load a .json patch file to begin testing.</div>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-6 py-2 rounded-lg mt-2 transition-colors"
                >
                  LOAD PATCH
                </button>
              </div>
            ) : (
              <div className={`border rounded-xl p-4 flex flex-col gap-2 ${isDark ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-500/40 bg-amber-50'}`}>
                <div className="flex justify-between items-start">
                  <div className="font-black text-amber-500">{state.activePatch.patch.name}</div>
                  <div className={`text-xs px-2 py-0.5 rounded font-bold ${state.validation?.valid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {state.validation?.valid ? 'VALID' : 'INVALID'}
                  </div>
                </div>
                <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  v{state.activePatch.patch.version} • {state.activePatch.patch.status}
                </div>
                <div className={`text-sm mt-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {state.activePatch.patch.description}
                </div>
                
                {!state.validation?.valid && state.validation?.errors && (
                  <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-500 flex flex-col gap-1">
                    {state.validation.errors.map((err, i) => <div key={i}>• {err}</div>)}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8">
              <div className="font-black tracking-widest text-sm mb-4">SPAWN WEIGHTS</div>
              <div className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Adjust base spawn probabilities. Max total adjustment: ±50%.
              </div>
              
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4, 5, 6].map(face => {
                  const key = \`face_\${face}\`;
                  const val = state.spawnWeights[key] || 0;
                  return (
                    <div key={face} className="flex items-center gap-3">
                      <div className={`w-16 font-mono text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Face {face}</div>
                      <input 
                        type="range" 
                        min="-0.1" 
                        max="0.1" 
                        step="0.01" 
                        value={val}
                        onChange={(e) => updateSpawnWeight(key, parseFloat(e.target.value))}
                        className="flex-1 accent-amber-500"
                        disabled={!state.activePatch}
                      />
                      <div className={`w-12 text-right font-mono text-xs ${val > 0 ? 'text-emerald-500' : val < 0 ? 'text-rose-500' : isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                        {val > 0 ? '+' : ''}{(val * 100).toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: RTP Monitor */}
        <div className={`w-2/3 flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="font-black tracking-widest text-lg">RTP MONITOR</div>
              <button 
                onClick={runSimulation}
                disabled={!state.activePatch || state.isSimulating || !state.validation?.valid}
                className={`font-black px-6 py-2 rounded-lg transition-colors ${
                  !state.activePatch || state.isSimulating || !state.validation?.valid
                    ? isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-200 text-slate-400'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              >
                {state.isSimulating ? 'SIMULATING...' : 'RUN SIMULATION'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-xs font-bold tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>SESSIONS RUN</div>
                <div className="text-2xl font-black font-mono">{state.simulationResults?.sessionsRun || 0}</div>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-xs font-bold tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>AVG SCORE</div>
                <div className="text-2xl font-black font-mono text-amber-500">{state.simulationResults?.avgScore || '---'}</div>
                {state.simulationResults && state.activePatch?.rtp_impact?.baseline_rtp && (
                  <div className="text-xs text-zinc-500 mt-1">vs baseline</div>
                )}
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-xs font-bold tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>FARKLE RATE</div>
                <div className="text-2xl font-black font-mono text-rose-500">
                  {state.simulationResults ? \`\${(state.simulationResults.farkleRate * 100).toFixed(1)}%\` : '---'}
                </div>
              </div>
            </div>

            {renderMultiplierBars()}

            {state.simulationResults && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-black tracking-widest text-sm">AI RTP ANALYSIS</div>
                  <button 
                    onClick={runAnalysis}
                    disabled={state.isAnalyzing}
                    className={`text-xs font-bold px-4 py-1.5 rounded border transition-colors ${
                      state.isAnalyzing 
                        ? isDark ? 'bg-zinc-800 text-zinc-600 border-zinc-700' : 'bg-slate-200 text-slate-400 border-slate-300'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                  >
                    {state.isAnalyzing ? 'ANALYZING...' : 'RUN AI ANALYSIS'}
                  </button>
                </div>

                {state.analysis ? (
                  <div className={`p-5 rounded-xl border ${
                    state.analysis.approved 
                      ? isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                      : isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-black ${state.analysis.approved ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {(state.analysis.projectedRTP * 100).toFixed(1)}%
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>PROJECTED RTP</span>
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            Range: {(state.analysis.projectedRTPRange[0] * 100).toFixed(1)}% - {(state.analysis.projectedRTPRange[1] * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded font-bold text-xs ${
                        state.analysis.approved ? 'bg-emerald-500 text-zinc-950' : 'bg-rose-500 text-zinc-950'
                      }`}>
                        {state.analysis.approved ? 'APPROVED' : 'REJECTED'}
                      </div>
                    </div>
                    
                    <div className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      {state.analysis.analysis}
                    </div>
                    
                    {state.analysis.recommendations.length > 0 && (
                      <div>
                        <div className={`text-xs font-bold mb-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>RECOMMENDATIONS</div>
                        <ul className={`text-sm list-disc pl-4 space-y-1 ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                          {state.analysis.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`p-8 rounded-xl border border-dashed text-center ${isDark ? 'border-zinc-800 text-zinc-600' : 'border-slate-300 text-slate-400'}`}>
                    Run AI Analysis to project RTP impact and get spawn weight recommendations.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className={`p-4 border-t flex justify-end ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'}`}>
            <button 
              onClick={exportPatch}
              disabled={!state.activePatch || !state.simulationResults}
              className={`font-black px-8 py-3 rounded-xl transition-colors ${
                !state.activePatch || !state.simulationResults
                  ? isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-200 text-slate-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
              }`}
            >
              EXPORT FINAL PATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
