import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridPos, Cell } from '@farkle/shared/types';
import { GAME_CONSTANTS } from '@farkle/shared/types';
import { isDieTile } from '@farkle/engine/gridUtils';

interface UseChainOptions {
  grid: Cell[][];
  onCommit: (chain: GridPos[]) => void;
  disabled?: boolean;
}

export function useChain({ grid, onCommit, disabled = false }: UseChainOptions) {
  const [chain, setChain] = useState<GridPos[]>([]);
  const isDragging = useRef<boolean>(false);

  const isAdjacent = (a: GridPos, b: GridPos): boolean => {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  };

  const chainable = (cell: Cell): boolean => {
    return isDieTile(cell) && cell.state !== 'EMPTY' && cell.state !== 'LOCKED';
  };

  const startChain = useCallback(
    (e: React.PointerEvent, row: number, col: number) => {
      if (disabled) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (!chainable(grid[row][col])) return;
      isDragging.current = true;
      setChain([{ row, col }]);
    },
    [grid, disabled]
  );

  const handleEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging.current || disabled) return;

      setChain((prev) => {
        if (prev.length === 0) return prev;

        const last = prev[prev.length - 1];
        const secondLast = prev.length >= 2 ? prev[prev.length - 2] : undefined;

        if (secondLast && secondLast.row === row && secondLast.col === col) {
          return prev.slice(0, -1);
        }

        if (prev.some((p) => p.row === row && p.col === col)) {
          return prev;
        }

        if (!isAdjacent(last, { row, col })) {
          return prev;
        }

        if (!chainable(grid[row][col])) {
          return prev;
        }

        if (prev.length >= GAME_CONSTANTS.MAX_CHAIN) {
          return prev;
        }

        return [...prev, { row, col }];
      });
    },
    [grid, disabled]
  );

  const pendingCommit = useRef<GridPos[] | null>(null);

  const endChain = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    setChain((prev) => {
      if (prev.length > 0) {
        pendingCommit.current = prev;
      }
      return [];
    });
  }, []);

  useEffect(() => {
    if (pendingCommit.current) {
      onCommit(pendingCommit.current);
      pendingCommit.current = null;
    }
  });

  const cancelChain = useCallback(() => {
    isDragging.current = false;
    setChain([]);
  }, []);

  return {
    chain,
    isDragging: isDragging.current,
    startChain,
    handleEnter,
    endChain,
    cancelChain,
  };
}
