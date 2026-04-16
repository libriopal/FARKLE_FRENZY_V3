import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LobbySettings } from '@farkle/shared/types';
import { useGame } from '../hooks/useGame';
import { useAudio } from '../hooks/useAudio';
import { useTheme } from '../hooks/useTheme';
import Grid from './Grid';
import SettingsModal from './SettingsModal';
import { MULTIPLIER_LADDER, type GameMode } from '@farkle/shared/types';

interface Props {
  settings: LobbySettings;
  onReturnToLobby: () => void;
  onOpenSandbox: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  SOLO_FREE: 'SOLO FREE',
  SOLO_CASINO: 'SOLO CASINO',
  VS_FREE: 'VERSUS FREE',
  VS_CASINO: 'VERSUS CASINO',
  RALLY_FREE: 'RALLY FREE',
  RALLY_CASINO: 'RALLY CASINO',
};

export default function GameScreen({ settings, onReturnToLobby, onOpenSandbox }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state, commitChain, bank, reset, removePopup, endFarkleAnim } = useGame(settings);
  const audio = useAudio();
  const { isDark } = useTheme();

  const handleBank = useCallback(() => {
    if (state.unbanked > 0) audio.playBank(state.unbanked);
    bank();
  }, [state.unbanked, bank, audio]);

  useEffect(() => {
    if (state.phase === 'FARKLE_ANIM') {
      const timer = setTimeout(() => {
        endFarkleAnim();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.phase, endFarkleAnim]);

  const modeLabel = MODE_LABELS[settings.mode] || settings.mode;
  const isFarkleAnim = state.phase === 'FARKLE_ANIM';

  return (
    <div className={`flex flex-col h-dvh overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-slate-100'}`}>
      {/* TOP BAR */}
      <div className={`flex items-center justify-between px-3 h-11 border-b shrink-0 ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
        <button
          onClick={onReturnToLobby}
          className={`text-xs font-mono ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700'}`}
        >
          ← LOBBY
        </button>
        <div className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          {modeLabel}
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className={`font-mono text-xl leading-none ${isDark ? 'text-zinc-400 hover:text-amber-400' : 'text-slate-500 hover:text-amber-500'}`}
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>

      {/* INFO STRIP */}
      <div className="flex items-center justify-between px-3 h-9 shrink-0">
        <motion.div
          key={state.multiplierStep}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="text-amber-400 font-black text-lg tabular-nums"
        >
          ×{MULTIPLIER_LADDER[state.multiplierStep].toFixed(2)}
        </motion.div>

        <div className="flex items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < state.multiplierStep ? 'bg-amber-400' : (isDark ? 'bg-zinc-700' : 'bg-slate-300')
              }`}
            />
          ))}
        </div>

        <div
          className={`text-xs font-bold tracking-wide truncate max-w-[120px] text-right ${
            state.lastChainResult?.isFarkle ? 'text-red-400' : (isDark ? 'text-zinc-400' : 'text-slate-600')
          }`}
        >
          {state.lastChainResult?.combo ?? '—'}
        </div>
      </div>

      {/* GRID CONTAINER */}
      <div className="flex-1 flex items-center justify-center min-h-0 p-1 relative">
        <motion.div
          animate={isFarkleAnim ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex items-center justify-center relative"
        >
          <Grid
            grid={state.grid}
            activeBombs={[]}
            popups={state.popups}
            disabled={state.phase !== 'IDLE'}
            settings={settings}
            multiplierStep={state.multiplierStep}
            onCommitChain={commitChain}
            onRemovePopup={removePopup}
            isFarkleAnim={isFarkleAnim}
            containerClassName="w-full h-full"
          />
          
          <AnimatePresence>
            {isFarkleAnim && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-red-500 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* BANK BAR */}
      <div
        className={`shrink-0 h-16 flex items-stretch border-t ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* BANKED */}
        <div className={`flex-1 flex flex-col justify-center px-3 border-r ${isDark ? 'border-zinc-800' : 'border-slate-300'}`}>
          <div className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            BANKED
          </div>
          <div className={`text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {state.banked.toLocaleString()}
          </div>
        </div>

        {/* AT RISK */}
        <div
          className={`flex-1 flex flex-col justify-center px-3 border-r ${isDark ? 'border-zinc-800' : 'border-slate-300'} ${
            state.unbanked > 0 ? (isDark ? 'bg-amber-950/20' : 'bg-amber-100') : 'bg-transparent'
          }`}
        >
          <div
            className={`text-[10px] font-bold tracking-widest uppercase ${
              state.unbanked > 0 ? 'text-amber-400' : (isDark ? 'text-zinc-600' : 'text-slate-400')
            }`}
          >
            AT RISK
          </div>
          {state.unbanked > 0 ? (
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-xl font-black text-amber-400 tabular-nums"
            >
              +{state.unbanked.toLocaleString()}
            </motion.div>
          ) : (
            <div className={`text-xl font-black tabular-nums ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>—</div>
          )}
        </div>

        {/* BANK BUTTON */}
        <div className="w-28 flex items-center justify-center px-2">
          {state.unbanked > 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBank}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 font-black text-sm rounded-xl flex flex-col items-center justify-center leading-tight shadow-[0_0_15px_rgba(245,158,11,0.4)] border-2 border-amber-400"
            >
              <span className="text-zinc-950">BANK</span>
              <span className="text-zinc-950">+{state.unbanked.toLocaleString()}</span>
            </motion.button>
          ) : (
            <button
              disabled
              className={`w-full h-12 font-black text-sm rounded-xl cursor-not-allowed flex items-center justify-center border-2 ${
                isDark ? 'bg-zinc-800 text-zinc-600 border-zinc-700' : 'bg-slate-200 text-slate-400 border-slate-300'
              }`}
            >
              BANK
            </button>
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenSandbox={onOpenSandbox}
      />
    </div>
  );
}
