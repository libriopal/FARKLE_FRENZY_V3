/**
 * Browser-compatible asset renderer.
 * Outputs typed data structures that React can render as <span> trees.
 */

export type Segment = { text: string; cls: string };
export type RenderLine = Segment[];
export type RenderCell = RenderLine[];
// RenderCell is ALWAYS exactly 5 RenderLines.
// Every RenderLine's segments sum to EXACTLY 9 characters.
// NO padding lines. NO padding segments. Art fills edge to edge.

export const FACE_COLOR: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-400',
  4: 'text-green-400',
  5: 'text-blue-500',
  6: 'text-violet-500',
};

export const FACE_COLOR_HEX: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#facc15',
  4: '#4ade80',
  5: '#3b82f6',
  6: '#8b5cf6',
};

const PIP_LAYOUTS: Record<number, string[]> = {
  1: ["       ", "   ●   ", "       "],
  2: [" ●     ", "       ", "     ● "],
  3: [" ●     ", "   ●   ", "     ● "],
  4: [" ●   ● ", "       ", " ●   ● "],
  5: [" ●   ● ", "   ●   ", " ●   ● "],
  6: [" ●   ● ", " ●   ● ", " ●   ● "],
};

function verifyLines(lines: RenderCell) {
  if (process.env.NODE_ENV === 'development') {
    for (const line of lines) {
      const len = line.reduce((sum, seg) => sum + seg.text.length, 0);
      if (len !== 9) {
        console.error(`RenderLine length is ${len}, expected 9:`, line);
      }
    }
  }
  return lines;
}

/**
 * Returns exactly 5 RenderLines for a regular die.
 */
export function getDieLines(
  value: 1 | 2 | 3 | 4 | 5 | 6,
  status: 'none' | 'frozen' | 'locked',
  isSelected: boolean
): RenderCell {
  const lines: RenderCell = [];

  if (status === 'frozen') {
    lines.push([{ text: '╔═══════╗', cls: 'text-cyan-200' }]);
    
    const pips = PIP_LAYOUTS[value];
    
    for (let i = 0; i < 3; i++) {
      const line: RenderLine = [];
      line.push({ text: '║', cls: 'text-cyan-200' });
      
      const rowStr = pips[i];
      let currentText = '';
      let currentIsPip = false;

      for (let j = 0; j < 7; j++) {
        const char = rowStr[j];
        const isPip = char === '●';
        if (j === 0) {
          currentText = char;
          currentIsPip = isPip;
        } else {
          if (isPip === currentIsPip) {
            currentText += char;
          } else {
            line.push({ text: currentText, cls: currentIsPip ? FACE_COLOR[value] : 'text-cyan-900' });
            currentText = char;
            currentIsPip = isPip;
          }
        }
      }
      if (currentText) {
        line.push({ text: currentText, cls: currentIsPip ? FACE_COLOR[value] : 'text-cyan-900' });
      }

      line.push({ text: '║', cls: 'text-cyan-200' });
      lines.push(line);
    }

    lines.push([{ text: '╚═══════╝', cls: 'text-cyan-200' }]);
    return verifyLines(lines);
  }

  // Top border
  const line0: RenderLine = [];
  if (status === 'locked') {
    const left = isSelected ? '╔══' : '┌──';
    const right = isSelected ? '══╗' : '──┐';
    const borderCls = isSelected ? 'text-white' : 'text-amber-400';
    line0.push({ text: left, cls: borderCls });
    line0.push({ text: '[L]', cls: 'text-amber-400' });
    line0.push({ text: right, cls: borderCls });
  } else {
    const left = isSelected ? '╔══' : '┌──';
    const right = isSelected ? '════╗' : '────┐';
    const borderCls = isSelected ? 'text-white' : FACE_COLOR[value];
    line0.push({ text: left, cls: borderCls });
    line0.push({ text: String(value), cls: isSelected ? 'text-white' : FACE_COLOR[value] });
    line0.push({ text: right, cls: borderCls });
  }
  lines.push(line0);

  // Middle lines
  const pips = PIP_LAYOUTS[value];
  const sideChar = isSelected ? '║' : '│';
  const sideCls = isSelected ? 'text-white' : (status === 'locked' ? 'text-zinc-500' : FACE_COLOR[value]);

  for (let i = 0; i < 3; i++) {
    const line: RenderLine = [];
    line.push({ text: sideChar, cls: sideCls });
    
    const rowStr = pips[i];
    let currentText = '';
    let currentIsPip = false;

    for (let j = 0; j < 7; j++) {
      const char = rowStr[j];
      const isPip = char === '●';
      if (j === 0) {
        currentText = char;
        currentIsPip = isPip;
      } else {
        if (isPip === currentIsPip) {
          currentText += char;
        } else {
          line.push({ text: currentText, cls: currentIsPip ? FACE_COLOR[value] : '' });
          currentText = char;
          currentIsPip = isPip;
        }
      }
    }
    if (currentText) {
      line.push({ text: currentText, cls: currentIsPip ? FACE_COLOR[value] : '' });
    }

    line.push({ text: sideChar, cls: sideCls });
    lines.push(line);
  }

  // Bottom border
  const bottomStr = isSelected ? '╚═══════╝' : '└───────┘';
  const bottomCls = isSelected ? 'text-white' : (status === 'locked' ? 'text-zinc-500' : FACE_COLOR[value]);
  lines.push([{ text: bottomStr, cls: bottomCls }]);

  return verifyLines(lines);
}

/**
 * Returns exactly 5 RenderLines for a stone blocker.
 */
export function getStoneLine(stage: 1 | 2): RenderCell {
  const lines: RenderCell = [];
  if (stage === 1) {
    lines.push([{ text: '▓▓▓▓▓▓▓▓▓', cls: 'text-zinc-500' }]);
    lines.push([{ text: '▓ ▓ ▓ ▓ ▓', cls: 'text-zinc-500' }]);
    lines.push([{ text: '▓▓▓▓▓▓▓▓▓', cls: 'text-zinc-500' }]);
    lines.push([{ text: '▓ ▓ ▓ ▓ ▓', cls: 'text-zinc-500' }]);
    lines.push([{ text: '▓▓▓▓▓▓▓▓▓', cls: 'text-zinc-500' }]);
  } else {
    lines.push([{ text: '▒▒▒▒▒▒▒▒▒', cls: 'text-zinc-600' }]);
    lines.push([
      { text: '▒ ▒ ', cls: 'text-zinc-600' },
      { text: '/', cls: 'text-zinc-400' },
      { text: ' ▒ ▒', cls: 'text-zinc-600' }
    ]);
    lines.push([{ text: '▒▒▒▒▒▒▒▒▒', cls: 'text-zinc-600' }]);
    lines.push([
      { text: '▒ ', cls: 'text-zinc-600' },
      { text: '\\', cls: 'text-zinc-400' },
      { text: ' ▒ ▒ ▒', cls: 'text-zinc-600' }
    ]);
    lines.push([{ text: '▒▒▒▒▒▒▒▒▒', cls: 'text-zinc-600' }]);
  }
  return verifyLines(lines);
}

/**
 * Returns exactly 5 RenderLines for a bomb.
 */
export function getBombLines(
  isRainbow: boolean,
  fuseProgress: number,
  currentColorCls: string,
  isRainmaker: boolean,
  isFrozen: boolean
): RenderCell {
  const lines: RenderCell = [];

  // Line 0
  lines.push([{ text: '  .---.  ', cls: 'text-zinc-500' }]);

  // Line 1
  if (isRainbow) {
    lines.push([
      { text: ' / ', cls: 'text-zinc-500' },
      { text: '~~~', cls: currentColorCls },
      { text: ' \\ ', cls: 'text-zinc-500' }
    ]);
  } else {
    lines.push([{ text: ' /     \\ ', cls: 'text-zinc-500' }]);
  }

  // Line 2 (Fuse Bar)
  const line2: RenderLine = [];
  line2.push({ text: '|[', cls: 'text-zinc-500' });
  
  const filledCount = Math.max(0, Math.min(5, Math.round(fuseProgress * 5)));
  if (filledCount > 0) {
    line2.push({ text: '█'.repeat(filledCount), cls: currentColorCls });
  }
  if (filledCount < 5) {
    line2.push({ text: '░'.repeat(5 - filledCount), cls: 'text-zinc-600' });
  }
  
  line2.push({ text: ']', cls: 'text-zinc-500' });
  
  if (isRainmaker && !isFrozen) {
    line2.push({ text: '▶', cls: 'text-amber-400' });
  } else if (isRainmaker && isFrozen) {
    line2.push({ text: '■', cls: currentColorCls });
  } else {
    line2.push({ text: '|', cls: 'text-zinc-500' });
  }
  lines.push(line2);

  // Line 3
  if (isRainbow) {
    lines.push([
      { text: ' \\ ', cls: 'text-zinc-500' },
      { text: '~~~', cls: currentColorCls },
      { text: ' / ', cls: 'text-zinc-500' }
    ]);
  } else {
    lines.push([{ text: ' \\     / ', cls: 'text-zinc-500' }]);
  }

  // Line 4
  lines.push([{ text: "  '---'  ", cls: 'text-zinc-500' }]);

  return verifyLines(lines);
}
