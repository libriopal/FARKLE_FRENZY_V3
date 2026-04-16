import React, { useMemo, useCallback } from 'react';
import type {
  Cell,
  GridPos,
  ScorePopup as ScorePopupType,
  LobbySettings,
  DieFace,
  RallyRole
} from '@farkle/shared/types';
import { getMultiplier } from '@farkle/shared/types';
import { scoreFarkle } from '@farkle/engine/farkleScorer';
import { useChain } from '../hooks/useChain';
import Tile from './Tile';
import ScorePopup from './ScorePopup';

export interface GridProps {
  grid: Cell[][];
  activeBombs: never[];
  popups: ScorePopupType[];
  disabled: boolean;
  settings: LobbySettings;
  multiplierStep: number;
  onCommitChain: (chain: GridPos[]) => void;
  onRemovePopup: (id: string) => void;
  isFarkleAnim?: boolean;
  playerRole?: RallyRole;
}

export default function Grid({
  grid,
  disabled,
  multiplierStep,
  isFarkleAnim,
  onCommitChain,
  playerRole,
  popups,
  onRemovePopup,
  settings
}: GridProps) {
  const { chain, startChain, handleEnter, endChain } = useChain({
    grid,
    disabled,
    onCommit: useCallback(
      (c: GridPos[]) => onCommitChain(c),
      [onCommitChain]
    ),
  });

  const previewResult = useMemo(() => {
    if (chain.length === 0) return null;
    const faces = chain
      .map(p => grid[p.row][p.col]?.face)
      .filter((f): f is DieFace => f !== null);
    return scoreFarkle(faces, settings.threeOnesScore, settings.singleOneScore);
  }, [chain, grid, settings]);

  const isAtCap = chain.length >= 6;
  const cols = grid[0]?.length || 7;
  const multiplier = getMultiplier(multiplierStep);

  const renderBanner = () => {
    if (chain.length === 0 || !previewResult) return null;

    if (previewResult.isFarkle || previewResult.score === 0) {
      return (
        <pre 
          className="text-red-500 font-mono text-sm mb-1"
          style={{ width: `${cols * 9}ch` }}
        >
{`┌─────────────────────────────┐
│ ⚠ FARKLE                    │
│ all unbanked points lost    │
└─────────────────────────────┘`}
        </pre>
      );
    }

    const comboName = previewResult.combo || 'COMBO';
    const rawScore = previewResult.score;
    const scaledScore = Math.round(rawScore * multiplier);
    
    const line1 = `│ ${comboName} = ${rawScore}`;
    const paddedLine1 = line1.padEnd(30, ' ') + '│';
    
    const line2 = `│ ×${multiplier.toFixed(2)}  →  ${scaledScore}`;
    const paddedLine2 = line2.padEnd(30, ' ') + '│';

    return (
      <pre 
        className="text-amber-400 font-mono text-sm mb-1"
        style={{ width: `${cols * 9}ch` }}
      >
{`┌─────────────────────────────┐
${paddedLine1}
${paddedLine2}
└─────────────────────────────┘`}
      </pre>
    );
  };

  return (
    <div className="flex flex-col items-center select-none touch-none">
      <div className="h-[72px] flex items-end justify-center">
        {renderBanner()}
      </div>

      <div
        className={`bg-[#1a1a1a] relative ${isFarkleAnim ? 'animate-board-shake' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 9ch)`,
          gap: '0',
          fontSize: `min(16px, calc(95vw / ${cols * 9}), calc(60vh / ${grid.length * 5}))`,
        }}
        onPointerLeave={endChain}
        onPointerUp={endChain}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const chainIndex = chain.findIndex(p => p.row === r && p.col === c);
            const isInChain = chainIndex >= 0;
            const bgClass = (r + c) % 2 === 0 ? 'bg-zinc-900' : 'bg-black';
            const isRainmaker = playerRole === 'RAINMAKER';

            return (
              <div
                key={cell.id}
                className={bgClass}
                style={{ width: '9ch', position: 'relative', overflow: 'hidden' }}
              >
                <Tile
                  cell={cell}
                  isInChain={isInChain}
                  chainIndex={chainIndex}
                  isAtCap={isAtCap}
                  isRainmaker={isRainmaker}
                  onPointerDown={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    startChain(e, r, c);
                  }}
                  onPointerEnter={() => handleEnter(r, c)}
                  onPointerUp={endChain}
                />
              </div>
            );
          })
        )}
        
        {popups.map(popup => (
          <ScorePopup
            key={popup.id}
            popup={popup}
            onComplete={() => onRemovePopup(popup.id)}
          />
        ))}
      </div>
    </div>
  );
}
