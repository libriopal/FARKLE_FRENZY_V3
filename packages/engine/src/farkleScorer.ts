import type { DieFace } from '@farkle/shared/types';
import { buildScoreTable, lookupScore } from './chainIndex';

export interface ScorerResult {
  score: number;
  isFarkle: boolean;
  combo: string;
  isSixOfAKind: boolean;
  isStraight: boolean;
}

let _defaultTable: Int32Array | null = null;

function getDefaultTable(): Int32Array {
  if (!_defaultTable) _defaultTable = buildScoreTable();
  return _defaultTable;
}

export function scoreFarkle(dice: DieFace[]): ScorerResult {
  if (dice.length === 0) {
    return { score: 0, isFarkle: true, combo: "", isSixOfAKind: false, isStraight: false };
  }

  const score = lookupScore(dice, getDefaultTable());
  const isSixOfAKind = dice.length === 6 && new Set(dice).size === 1;
  const isStraight = dice.length === 6 && new Set(dice).size === 6;
  const isFarkle = score === 0;

  let combo = "";
  if (score === 3000) {
    combo = "Six of a Kind";
  } else if (isStraight) {
    combo = "Straight";
  } else if (score === 2500) {
    combo = "Two Triplets";
  } else if (score === 2000) {
    combo = "Five of a Kind";
  } else if (score === 1500 && dice.length === 6) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const face of dice) counts[face]++;
    const pairs = counts.filter(c => c === 2).length;
    if (pairs === 3) combo = "Three Pairs";
    else combo = "Four of a Kind + Pair";
  } else if (score === 1000 && dice.length >= 4) {
    combo = "Four of a Kind";
  } else if (score === 1000 && dice.length === 3) {
    combo = "Three 1s";
  } else if (score >= 200 && score % 100 === 0 && dice.length === 3) {
    combo = `Three ${score / 100}s`;
  } else if (score > 0) {
    const parts: string[] = [];
    for (const face of dice) {
      if (face === 1) parts.push("Single 1");
      else if (face === 5) parts.push("Single 5");
    }
    combo = parts.join(" + ");
  }

  return { score, isFarkle, combo, isSixOfAKind, isStraight };
}
