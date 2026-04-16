import { useState } from 'react';
import { useTheme } from './hooks/useTheme';
import type { LobbySettings } from '@farkle/shared/types';
import GameScreen from './components/GameScreen';

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

type Screen = 'LOBBY' | 'GAME' | 'VS' | 'RALLY' | 'SANDBOX';

const titleScreen: string = `
\x1b[33m  .-------.  .-------.  .-------.  .-------.  .-------.  .-------.
 /   o   /| / o   o /| / o   o /| / o   o /| / o o o /| / o o o /|
/       / |/       / |/   o   / |/ o   o / |/       / |/ o   o / |
\\   o   \\ |\\ o   o \\ |\\ o   o \\ |\\ o   o \\ |\\ o o o \\ |\\ o o o \\ |
 '-------'  '-------'  '-------'  '-------'  '-------'  '-------'\x1b[0m
\x1b[1m\x1b[36m  _____             _     _          ______                               

 |  ___|           | |   | |         |  ___|                              
 | |_  __ _ _ __| | _| | ___    | |_ _ __ ___ _ __  _____   _ 
 |  _|/ _\` | '__| |/ / |/ _ \\   |  _| '__/ _ \\ '_ \\|_  / | | |
 | | | (_| | |  |   <| |  __/   | | | | |  __/ | | |/ /| |_| |
 \\_|  \\__,_|_|  |_|\\_\\_|\\___|   \\_| |_|  \\___|_| |_/___|\\__, |
                                                         __/ |
                                                        |___/ \x1b[0m
`;

console.log(titleScreen);

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [screen, setScreen] = useState<Screen>('LOBBY');

  if (screen === 'SANDBOX') {
    return (
      <div className={`min-h-dvh flex flex-col items-center justify-center gap-4 p-6 ${isDark ? 'bg-zinc-950' : 'bg-slate-100'}`}>
        <div className="text-amber-400 font-black text-2xl">⚗ SANDBOX MODE</div>
        <div className={`text-sm text-center max-w-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          Sandbox system coming soon. Load patch files to test new features.
        </div>
        <button
          className={`text-xs underline ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}
          onClick={() => setScreen('LOBBY')}
        >
          ← Back to Lobby
        </button>
      </div>
    );
  }

  if (screen === 'LOBBY') {
    return (
      <div className={`min-h-dvh flex flex-col items-center justify-center gap-6 p-6 ${isDark ? 'bg-zinc-950' : 'bg-slate-100'}`}>
        
        <pre className="font-mono text-[10px] sm:text-xs md:text-sm leading-tight whitespace-pre text-center">
          <span className="text-amber-400">
{`  .-------.  .-------.  .-------.  .-------.  .-------.  .-------.
 /   o   /| / o   o /| / o   o /| / o   o /| / o o o /| / o o o /|
/       / |/       / |/   o   / |/ o   o / |/       / |/ o   o / |
\\   o   \\ |\\ o   o \\ |\\ o   o \\ |\\ o   o \\ |\\ o o o \\ |\\ o o o \\ |
 '-------'  '-------'  '-------'  '-------'  '-------'  '-------'`}
          </span>
          <br />
          <span className="font-bold text-cyan-400">
{`  _____             _     _          ______                               

 |  ___|           | |   | |         |  ___|                              
 | |_  __ _ _ __| | _| | ___    | |_ _ __ ___ _ __  _____   _ 
 |  _|/ _\` | '__| |/ / |/ _ \\   |  _| '__/ _ \\ '_ \\|_  / | | |
 | | | (_| | |  |   <| |  __/   | | | | |  __/ | | |/ /| |_| |
 \\_|  \\__,_|_|  |_|\\_\\_|\\___|   \\_| |_|  \\___|_| |_/___|\\__, |
                                                         __/ |
                                                        |___/ `}
          </span>
        </pre>

        <button
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-3 px-12 rounded-xl mt-8 transition-colors text-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] border-2 border-amber-400"
          onClick={() => setScreen('GAME')}
        >
          PLAY
        </button>
      </div>
    );
  }

  return (
    <GameScreen
      settings={TEST_SETTINGS}
      onReturnToLobby={() => setScreen('LOBBY')}
      onOpenSandbox={() => setScreen('SANDBOX')}
    />
  );
}
