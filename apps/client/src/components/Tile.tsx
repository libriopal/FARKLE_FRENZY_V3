import React, { useState, useEffect } from 'react';
import type { Cell, DieColor } from '@farkle/shared/types';
import { getDieLines, getStoneLine, getBombLines, FACE_COLOR, RenderCell } from '../assets/assetRenderer';

export interface TileProps {
  cell: Cell;
  isInChain: boolean;
  chainIndex: number;
  isAtCap: boolean;
  isRainmaker?: boolean;
  onColorChosen?: (color: DieColor) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

function colorIndexToDieColor(index: number): DieColor {
  return ([1, 2, 3, 4, 5, 6] as const)[index % 6] as DieColor;
}

function dieFaceForFuseColor(color: DieColor): number {
  const map: Record<DieColor, number> = {
    RED: 1, ORANGE: 2, YELLOW: 3, GREEN: 4, BLUE: 5, PURPLE: 6
  };
  return map[color];
}

/**
 * Pure functional display component for a single grid cell.
 * Renders ASCII art using assetRenderer.
 */
export default function Tile({
  cell,
  isInChain,
  chainIndex,
  isAtCap,
  isRainmaker,
  onColorChosen,
  onPointerDown,
  onPointerEnter,
  onPointerUp
}: TileProps) {
  const [colorIndex, setColorIndex] = useState<number>(0);

  const isFrozenRainbow = cell.type === 'BOMB_RAINBOW' && cell.fuseColor !== undefined;

  useEffect(() => {
    if (cell.type === 'BOMB_RAINBOW' && !isFrozenRainbow) {
      const interval = setInterval(() => {
        setColorIndex(prev => (prev + 1) % 6);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [cell.type, isFrozenRainbow]);

  if (cell.state === 'EMPTY') {
    return null;
  }

  let renderCell: RenderCell | null = null;
  let pointerEventsStyle: React.CSSProperties = {};
  let extraClasses = '';
  let onClickHandler: ((e: React.MouseEvent) => void) | undefined = undefined;

  if (cell.state === 'SPAWNING') {
    extraClasses += ' opacity-50 transition-opacity';
  }

  if (cell.type === 'STONE' || cell.type === 'BLOCKER_STONE') {
    renderCell = getStoneLine(cell.health === 1 ? 2 : 1);
    pointerEventsStyle = { pointerEvents: 'none' };
  } else if (cell.state === 'FROZEN') {
    renderCell = getDieLines((cell.face ?? 1) as 1 | 2 | 3 | 4 | 5 | 6, 'frozen', false);
    pointerEventsStyle = { pointerEvents: 'none' };
  } else if (cell.state === 'LOCKED') {
    renderCell = getDieLines(cell.face as 1 | 2 | 3 | 4 | 5 | 6, 'locked', isInChain);
    extraClasses += ' cursor-pointer';
  } else if (cell.type === 'BOMB_STANDARD') {
    const fuseProgress = (cell.fuseMs ?? 0) / 3000;
    renderCell = getBombLines(false, fuseProgress, 'text-red-500', false, false);
    pointerEventsStyle = { pointerEvents: 'none' };
  } else if (cell.type === 'BOMB_RAINBOW') {
    const fuseProgress = (cell.fuseMs ?? 0) / 3000;
    const currentColorCls = isFrozenRainbow
      ? FACE_COLOR[dieFaceForFuseColor(cell.fuseColor!)]
      : FACE_COLOR[(colorIndex % 6) + 1];
    
    renderCell = getBombLines(true, fuseProgress, currentColorCls, isRainmaker ?? false, isFrozenRainbow);
    pointerEventsStyle = { pointerEvents: 'none' };

    if (isRainmaker && !isFrozenRainbow) {
      pointerEventsStyle = { pointerEvents: 'auto' };
      onClickHandler = (e: React.MouseEvent) => {
        e.stopPropagation();
        onColorChosen?.(colorIndexToDieColor(colorIndex));
      };
    }
  } else {
    // Normal die
    renderCell = getDieLines(cell.face as 1 | 2 | 3 | 4 | 5 | 6, 'none', isInChain);
    if (isAtCap && !isInChain) {
      extraClasses += ' opacity-40';
    }
  }

  if (!renderCell) return null;

  const content = (
    <pre
      className={`font-mono leading-none select-none cursor-default ${extraClasses}`}
      style={{ margin: 0, padding: 0, lineHeight: '1em', ...pointerEventsStyle }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerUp={onPointerUp}
      onClick={onClickHandler}
    >
      {renderCell.map((line, i) => (
        <div key={i}>
          {line.map((seg, j) => (
            <span key={j} className={seg.cls}>
              {seg.text}
            </span>
          ))}
        </div>
      ))}
      {isInChain && chainIndex >= 0 && (
        <span 
          className="absolute text-amber-400 text-xs font-bold leading-none"
          style={{ top: 0, right: '1ch', zIndex: 10 }}
        >
          {chainIndex + 1}
        </span>
      )}
    </pre>
  );

  if (cell.type === 'BOMB_STANDARD' || cell.type === 'BOMB_RAINBOW') {
    return <div style={{ pointerEvents: 'none' }}>{content}</div>;
  }

  return content;
}
