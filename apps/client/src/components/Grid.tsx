import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
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
import { useTheme } from '../hooks/useTheme';
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
  containerClassName?: string;
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
  settings,
  containerClassName
}: GridProps) {
  const { isDark } = useTheme();
  const { chain, startChain, handleEnter, endChain } = useChain({
    grid,
    disabled,
    onCommit: useCallback(
      (c: GridPos[]) => onCommitChain(c),
      [onCommitChain]
    ),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(48);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const available = Math.min(width, height);
        const dim = grid.length; // grid dimension (7, 8, 9, or 10)
        const gap = dim * 2;     // 2px gap per cell
        const computed = Math.floor((available - gap) / dim);
        setCellSize(Math.max(28, Math.min(72, computed)));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [grid.length]);

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
    <div className="flex flex-col items-center select-none touch-none w-full h-full">
      <div className="h-[72px] flex items-end justify-center shrink-0">
        {renderBanner()}
      </div>

      <div
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center ${containerClassName ?? ''}`}
      >
        <div
          className={`${isDark ? 'bg-[#1a1a1a]' : 'bg-slate-300'} relative ${isFarkleAnim ? 'animate-board-shake' : ''}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
            gap: '2px',
          }}
          onPointerLeave={endChain}
          onPointerUp={endChain}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const chainIndex = chain.findIndex(p => p.row === r && p.col === c);
              const isInChain = chainIndex >= 0;
              const bgClass = isDark
                ? ((r + c) % 2 === 0 ? 'bg-zinc-900' : 'bg-black')
                : ((r + c) % 2 === 0 ? 'bg-white' : 'bg-slate-50');
              const isRainmaker = playerRole === 'RAINMAKER';

              return (
                <div
                  key={cell.id}
                  className={bgClass}
                  style={{ width: `${cellSize}px`, height: `${cellSize}px`, position: 'relative', overflow: 'hidden' }}
                >
                  <Tile
                    cell={cell}
                    cellSize={cellSize}
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
              gridSize={grid.length}
              tileSize={cellSize}
              onDone={() => onRemovePopup(popup.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
