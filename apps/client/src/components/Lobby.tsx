import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LobbySettings as LobbySettingsType, 
  GameMode, 
  CurrencyMode,
  FD_COLORS, 
  PDX_COLORS, 
  FD_ASCII_ICON,
  PDX_ASCII_ICON, 
  PDX_USD_RATE,
  DEFAULT_SETTINGS,
  DAILY_PDX_BONUS
} from '@farkle/shared/types';
import { useWallet } from '../hooks/useWallet';
import LobbySettings from './LobbySettings';

interface LobbyProps {
  onStart: (settings: LobbySettingsType) => void;
}

type SelectedMode = 'SOLO' | 'VERSUS' | 'RALLY';

const TARGET_ART = `
                    __________                    
                  ___/        \\___                  
                __/            \\__                
              _/                \\_              
            /      /\\  /\\       \\            
          |     /  \\/  \\      |          
          |    |        |     |          
          |    |        |     |          
          |     \\      /      |          
            \\      \\____/      /            
              _\\              /_              
                __\\          /__                
                  ___\\______/___                  
                       /  /\\  \\                       
                      /__/  \\__\\                      
`;

const SWORDS_ART = `
          /\\
         /  \\
        /====\\
       /      \\
      /  /\\    \\
     /  /  \\    \\
    /__/____\\____\\
       \\  ||  /
        \\ || /
         \\||/
          ||
          ||
          ||
         /||\\
        /_||_\\
`;

const HANDSHAKE_ART = `
               #########               
             #############             
           #################           
         #####################         
       ########OOOO########       
     ######OOOOOOOO######     

#####OOOOXXXXOOOO#####
####OOOXXXXXXXXOOO####
###OOOXXXXXXXXXXOOO### ###OOOXXXXXXXXXXOOO### ####OOOXXXXXXXXOOO####
#####OOOOXXXXOOOO#####
######OOOOOOOO######
########OOOO########
#####################
#################
#############
#########
`;

export default function Lobby({ onStart }: LobbyProps) {
  const { 
    wallet, 
    claimDailyBonus, 
    wager, 
    canRedeemPDX, 
    isDailyBonusAvailable 
  } = useWallet();

  const [selectedMode, setSelectedMode] = useState<SelectedMode>('SOLO');
  const [settings, setSettings] = useState<LobbySettingsType>({
    ...DEFAULT_SETTINGS,
    currencyMode: 'FD',
    stakeAmount: 100,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fdIconLine = FD_ASCII_ICON.split('\\n').find(l => l.includes('✦')) || '  ✦  · ˖  ✦';
  const pdxIconLine = PDX_ASCII_ICON.split('\\n').find(l => l.includes('╔')) || '    ╔═══════╗';

  const handleModeChange = (mode: SelectedMode) => {
    setSelectedMode(mode);
    if (mode === 'SOLO') {
      setSettings(s => ({ ...s, playerCount: 1 }));
    }
  };

  const handleCurrencyToggle = (mode: CurrencyMode) => {
    setSettings(s => ({
      ...s,
      currencyMode: mode,
      stakeAmount: mode === 'FD' ? 100 : 5
    }));
  };

  const handlePlay = () => {
    let modeValue: GameMode;
    if (selectedMode === 'SOLO') {
      modeValue = settings.currencyMode === 'FD' ? 'SOLO_FREE' : 'SOLO_CASINO';
    } else if (selectedMode === 'VERSUS') {
      modeValue = settings.currencyMode === 'FD' ? 'VS_FREE' : 'VS_CASINO';
    } else {
      modeValue = settings.currencyMode === 'FD' ? 'RALLY_FREE' : 'RALLY_CASINO';
    }

    const wagerSuccess = wager(settings.currencyMode, settings.stakeAmount);
    if (!wagerSuccess) return;

    onStart({ ...settings, mode: modeValue });
  };

  const isPlayDisabled = settings.currencyMode === 'PDX' && wallet.pdx < settings.stakeAmount;

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 text-white overflow-hidden p-4 font-sans max-w-2xl mx-auto w-full gap-4">
      {/* WALLET HEADER BAR */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between gap-2">
          {/* FD Badge */}
          <div className={\`flex items-center gap-2 px-3 py-1.5 rounded-full border \${FD_COLORS.badge}\`}>
            <pre className="text-[8px] leading-none select-none overflow-hidden">{fdIconLine}</pre>
            <span className="font-bold text-sm">{wallet.fd.toLocaleString()} FD</span>
          </div>
          {/* PDX Badge */}
          <div className={\`flex items-center gap-2 px-3 py-1.5 rounded-full border \${PDX_COLORS.badge}\`}>
            <pre className="text-[6px] md:text-[8px] leading-none select-none overflow-hidden text-emerald-400">{pdxIconLine}</pre>
            <span className="font-bold text-sm tracking-wide">{wallet.pdx.toLocaleString()} PDX</span>
          </div>
        </div>

        <AnimatePresence>
          {isDailyBonusAvailable && (
            <motion.button
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onClick={claimDailyBonus}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2 px-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-colors animate-pulse uppercase text-sm"
            >
              ✦ Claim {DAILY_PDX_BONUS} PDX Daily Bonus
            </motion.button>
          )}
        </AnimatePresence>

        {/* FD/PDX MODE TOGGLE */}
        <div className="flex bg-zinc-900 rounded-xl p-1 relative w-full h-12 isolation-auto shadow-inner border border-zinc-800">
          <button
            className={\`flex-1 z-10 flex items-center justify-center font-bold text-sm transition-colors \${settings.currencyMode === 'FD' ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}\`}
            onClick={() => handleCurrencyToggle('FD')}
          >
            ⬡ FD Farkle Dust
          </button>
          <button
            className={\`flex-1 z-10 flex items-center justify-center font-bold text-sm transition-colors \${settings.currencyMode === 'PDX' ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}\`}
            onClick={() => handleCurrencyToggle('PDX')}
          >
            ◆ PDX Prime Dice
          </button>
          {/* Sliding indicator */}
          <motion.div
            layoutId="currency-indicator"
            className={\`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm \${
              settings.currencyMode === 'FD' 
                ? 'bg-violet-700 left-1' 
                : 'bg-emerald-600 right-1'
            }\`}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          />
        </div>
      </div>

      {/* TITLE */}
      <div className="text-center py-2 shrink-0">
        <h1 className="text-3xl font-black text-amber-400 tracking-tight leading-none mb-1">FARKLE FRENZY</h1>
        <p className="text-zinc-400 text-sm">Match dice · Score combos · Don't Farkle</p>
      </div>

      {/* MODE CARDS */}
      <div className="flex flex-row gap-2 h-36 shrink-0 shrink items-stretch justify-center">
        {/* SOLO */}
        <button
          onClick={() => handleModeChange('SOLO')}
          className={\`flex-1 border rounded-xl overflow-hidden relative flex flex-col items-center justify-center p-2 transition-all \${
            selectedMode === 'SOLO'
              ? 'border-amber-500 bg-amber-900/20 shadow-[0_0_20px_rgba(120,53,15,0.4)]'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
          }\`}
        >
          <pre className={\`text-[4px] leading-[4px] mb-2 font-mono \${selectedMode === 'SOLO' ? 'text-amber-400' : 'text-zinc-600'}\`}>{TARGET_ART}</pre>
          <div className="font-bold text-sm uppercase tracking-wide">Solo Play</div>
          <div className="text-[10px] text-zinc-500 mt-1 mb-2 leading-tight">Personal bests, no turns</div>
          <div className="text-[10px] font-black bg-black/40 px-2 py-0.5 rounded text-amber-500/80">1 Player</div>
        </button>

        {/* VERSUS */}
        <button
          onClick={() => handleModeChange('VERSUS')}
          className={\`flex-1 border rounded-xl overflow-hidden relative flex flex-col items-center justify-center p-2 transition-all \${
            selectedMode === 'VERSUS'
              ? 'border-amber-500 bg-amber-900/20 shadow-[0_0_20px_rgba(120,53,15,0.4)]'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
          }\`}
        >
          <pre className={\`text-[4px] leading-[4px] mb-2 font-mono \${selectedMode === 'VERSUS' ? 'text-amber-400' : 'text-zinc-600'}\`}>{SWORDS_ART}</pre>
          <div className="font-bold text-sm uppercase tracking-wide">Versus</div>
          <div className="text-[10px] text-zinc-500 mt-1 mb-2 leading-tight">Real-time shared board</div>
          <div className="text-[10px] font-black bg-black/40 px-2 py-0.5 rounded text-amber-500/80">2–4 Players</div>
        </button>

        {/* RALLY */}
        <button
          onClick={() => handleModeChange('RALLY')}
          className={\`flex-1 border rounded-xl overflow-hidden relative flex flex-col items-center justify-center p-2 transition-all \${
            selectedMode === 'RALLY'
              ? 'border-amber-500 bg-amber-900/20 shadow-[0_0_20px_rgba(120,53,15,0.4)]'
              : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
          }\`}
        >
          <pre className={\`text-[3px] leading-[3px] mb-2 font-mono overflow-hidden max-w-full \${selectedMode === 'RALLY' ? 'text-amber-400' : 'text-zinc-600'}\`}>{HANDSHAKE_ART}</pre>
          <div className="font-bold text-sm uppercase tracking-wide">Rally</div>
          <div className="text-[10px] text-zinc-500 mt-1 mb-2 leading-tight">Co-op team scoring</div>
          <div className="text-[10px] font-black bg-black/40 px-2 py-0.5 rounded text-amber-500/80">2–4 Players</div>
        </button>
      </div>

      {/* PLAYER COUNT */}
      <AnimatePresence>
        {selectedMode !== 'SOLO' && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="flex items-center justify-center gap-2 overflow-hidden shrink-0"
          >
            {[2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => setSettings(s => ({ ...s, playerCount: num as any }))}
                className={\`flex-1 h-10 rounded-lg font-black transition-colors \${
                  settings.playerCount === num
                    ? 'bg-amber-500 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }\`}
              >
                {num} PLAYERS
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STAKE PANEL */}
      <div className="flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className={\`flex items-center gap-2 px-3 py-1 rounded border \${settings.currencyMode === 'FD' ? FD_COLORS.badge : PDX_COLORS.badge}\`}>
             <span className="font-bold text-xs uppercase tracking-wider">{settings.currencyMode === 'FD' ? 'Farkle Dust' : 'Prime Dice'}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/50 border border-zinc-800 rounded-lg px-2">
            <span className="text-zinc-500 font-black text-sm">$</span>
            <input
              type="number"
              min={settings.currencyMode === 'FD' ? 10 : 1}
              max={settings.currencyMode === 'FD' ? 10000 : 1000}
              step={settings.currencyMode === 'FD' ? 10 : 1}
              value={settings.stakeAmount}
              onChange={(e) => setSettings(s => ({ ...s, stakeAmount: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="bg-transparent text-right font-mono font-bold text-lg w-20 py-2 outline-none text-white focus:text-amber-400"
            />
          </div>
        </div>

        {settings.currencyMode === 'FD' ? (
          <div className="text-zinc-500 italic text-xs text-center border-t border-zinc-800/50 pt-2">
            Farkle Dust is for entertainment only and has no monetary value.
          </div>
        ) : (
          <div className="flex flex-col gap-1 border-t border-zinc-800/50 pt-2">
            <div className="text-emerald-400 text-xs text-center">
              ◆ 1 PDX = ${(PDX_USD_RATE).toFixed(2)} USD · Prize redemption requires identity verification.
            </div>
            {!canRedeemPDX() && (
              <div className="text-amber-600 text-[10px] uppercase font-bold tracking-wide text-center mt-1">
                Complete playthrough requirement to unlock redemption.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADVANCED SETTINGS TOGGLE */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => setShowAdvanced(s => !s)}
          className="text-zinc-500 hover:text-zinc-300 underline text-xs transition-colors py-2"
        >
          {showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="pb-2">
                <LobbySettings settings={settings} onChange={setSettings} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PLAY BUTTON */}
      <div className="mt-auto shrink-0 pb-4 relative group">
        <button
          onClick={handlePlay}
          disabled={isPlayDisabled}
          title={isPlayDisabled ? "Insufficient PDX balance" : undefined}
          className={\`w-full h-16 rounded-2xl font-black text-2xl tracking-widest uppercase transition-all duration-300 relative overflow-hidden \${
            isPlayDisabled 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-700 border-2' 
              : settings.currencyMode === 'FD'
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] border-b-4 border-amber-600 hover:border-amber-500 active:border-b-0 active:translate-y-1'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-2 border-amber-400/50 hover:border-amber-400 active:scale-[0.98]'
          }\`}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
             PLAY {selectedMode === 'SOLO' ? '🎯' : selectedMode === 'VERSUS' ? '⚔️' : '🤝'}
          </span>
          {/* Subtle shine effect */}
          {!isPlayDisabled && (
             <div className="absolute inset-0 -translate-x-[150%] skew-x-[-20deg] bg-white/20 group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
          )}
        </button>
      </div>

    </div>
  );
}
