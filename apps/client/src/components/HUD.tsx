import React, { useEffect, useState } from 'react';
import type { GamePhase, GameMode } from '@farkle/shared/types';
import MultiplierLadder from './MultiplierLadder';

export interface HUDProps {
  banked: number;
  unbanked: number;
  multiplierStep: number;
  lastCombo?: string;
  isFarkle: boolean;
  phase: GamePhase;
  onBank: () => void;
  mode: GameMode;
}

/**
 * Terminal ASCII panel using box-drawing characters.
 */
export default function HUD({
  banked,
  unbanked,
  multiplierStep,
  lastCombo,
  isFarkle,
  phase,
  onBank,
  mode
}: HUDProps) {
  const [flashRed, setFlashRed] = useState(false);

  useEffect(() => {
    if (isFarkle) {
      setFlashRed(true);
      const timer = setTimeout(() => setFlashRed(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isFarkle]);

  const borderCls = flashRed ? 'text-red-500' : 'text-amber-400';
  const innerWidth = 'w-[34ch]';
  
  const topBorder    = '╔══════════════════════════════════╗';
  const midBorder    = '╠══════════════════════════════════╣';
  const bottomBorder = '╚══════════════════════════════════╝';

  return (
    <pre className="font-mono text-amber-400 bg-zinc-950 p-2 leading-tight select-none text-[clamp(10px,4vw,16px)]">
      <div className={borderCls}>{topBorder}</div>
      
      {/* Header */}
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} text-center font-bold`}>FARKLE FRENZY</span>
        <span className={borderCls}>║</span>
      </div>
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} text-center text-xs`}>{mode.replace(/_/g, ' ')}</span>
        <span className={borderCls}>║</span>
      </div>
      
      <div className={borderCls}>{midBorder}</div>
      
      {/* BANKED */}
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2`}>BANKED</span>
        <span className={borderCls}>║</span>
      </div>
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2 text-white text-lg font-bold`}>{banked.toLocaleString()}</span>
        <span className={borderCls}>║</span>
      </div>

      <div className={borderCls}>{midBorder}</div>

      {/* AT RISK */}
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2 flex justify-between ${flashRed ? 'text-red-500' : unbanked > 0 ? 'text-amber-300' : 'text-zinc-600'}`}>
          <span>AT RISK</span>
          <span className={unbanked > 0 ? 'animate-pulse' : 'opacity-0'}>~~~</span>
        </span>
        <span className={borderCls}>║</span>
      </div>
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2 ${flashRed ? 'text-red-500' : unbanked > 0 ? 'text-amber-300' : 'text-zinc-600'}`}>
          +{unbanked.toLocaleString()}
        </span>
        <span className={borderCls}>║</span>
      </div>

      <div className={borderCls}>{midBorder}</div>

      {/* BANK BUTTON */}
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} flex justify-center py-1`}>
          <button
            onClick={unbanked > 0 ? onBank : undefined}
            disabled={unbanked === 0}
            className={`px-2 font-bold ${unbanked > 0 ? 'bg-amber-500 text-zinc-900 cursor-pointer hover:bg-amber-400' : 'text-zinc-600 cursor-not-allowed'}`}
          >
            {unbanked > 0 ? `[BANK +${unbanked.toLocaleString()}]` : '[  BANK  ]'}
          </button>
        </span>
        <span className={borderCls}>║</span>
      </div>

      <div className={borderCls}>{midBorder}</div>

      {/* MULTIPLIER */}
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2`}>MULTIPLIER</span>
        <span className={borderCls}>║</span>
      </div>
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2 flex items-center`}>
          <MultiplierLadder step={multiplierStep} compact />
        </span>
        <span className={borderCls}>║</span>
      </div>

      <div className={borderCls}>{midBorder}</div>

      {/* LAST COMBO */}
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2`}>LAST COMBO</span>
        <span className={borderCls}>║</span>
      </div>
      <div className="flex">
        <span className={borderCls}>║</span>
        <span className={`${innerWidth} px-2 truncate ${lastCombo ? 'text-white' : 'text-zinc-600'}`}>
          {lastCombo || '---'}
        </span>
        <span className={borderCls}>║</span>
      </div>

      <div className={borderCls}>{bottomBorder}</div>
    </pre>
  );
}
