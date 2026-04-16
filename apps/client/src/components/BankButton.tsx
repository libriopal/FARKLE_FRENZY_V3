import React from 'react';

export interface BankButtonProps {
  unbanked: number;
  onClick: () => void;
}

/**
 * A single plain button for banking points.
 */
export default function BankButton({ unbanked, onClick }: BankButtonProps) {
  const isEnabled = unbanked > 0;

  return (
    <button
      onClick={isEnabled ? onClick : undefined}
      disabled={!isEnabled}
      className={`w-full py-2 px-4 rounded ${
        isEnabled
          ? 'bg-amber-500 text-zinc-900 font-black'
          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
      }`}
    >
      {isEnabled ? `BANK ${unbanked.toLocaleString()}` : 'BANK'}
    </button>
  );
}
