import React from 'react';

export interface MultiplierLadderProps {
  step: number;
  compact?: boolean;
}

const STEPS = ["x1.0", "x1.25", "x1.5", "x2.0", "x3.0", "x4.0"];

/**
 * Renders the 6-step multiplier ladder as a single line of text.
 */
export default function MultiplierLadder({ step, compact }: MultiplierLadderProps) {
  return (
    <div className={`flex gap-2 font-mono ${compact ? 'text-xs' : 'text-sm'}`}>
      {STEPS.map((label, index) => {
        const isActive = index === step;
        if (isActive) {
          return (
            <span key={index} className="text-amber-400 font-black">
              [{label}]
            </span>
          );
        }
        return (
          <span key={index} className="text-zinc-500">
            {label}
          </span>
        );
      })}
    </div>
  );
}
