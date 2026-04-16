import { useGame } from './hooks/useGame';
import { useTheme } from './hooks/useTheme';
import Grid from './components/Grid';
import HUD from './components/HUD';
import ThemeToggle from './components/ThemeToggle';
import type { LobbySettings } from '@farkle/shared/types';

const TEST_SETTINGS: LobbySettings = {
  mode: 'SOLO_FREE',
  playerCount: 1,
  turnTimerSeconds: 10,
  blockerDensity: 'MEDIUM',
  threeOnesScore: 1000,
  singleOneScore: 100,
  rainbowRedReward: 100,
  rainbowBlueReward: 50,
};

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { state, commitChain, bank, removePopup } = useGame(TEST_SETTINGS);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start md:justify-center p-2 md:p-4 gap-4 overflow-y-auto">
      <div className="flex flex-row items-center gap-4 mt-2 md:mt-0">
        <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)] m-0">
          🎲 Farkle Frenzy
        </h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-8 w-full max-w-5xl pb-8">
        <HUD
          banked={state.banked}
          unbanked={state.unbanked}
          multiplierStep={state.multiplierStep}
          lastCombo={state.lastChainResult?.combo}
          isFarkle={state.lastChainResult?.isFarkle ?? false}
          phase={state.phase}
          onBank={bank}
          mode={TEST_SETTINGS.mode}
          farklePool={state.farklePool}
        />

        <div className="flex-shrink-0">
          <Grid
            activeBombs={state.activeBombs} 
            grid={state.grid}
            popups={state.popups}
            disabled={state.phase !== 'IDLE'}
            settings={TEST_SETTINGS}
            multiplierStep={state.multiplierStep}
            onCommitChain={commitChain}
            onRemovePopup={removePopup}
            isFarkleAnim={state.phase === 'FARKLE_ANIM'}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}
