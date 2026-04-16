import { motion } from 'motion/react';
import type { ScorePopup as PopupType } from '@farkle/shared/types';

interface Props {
  popup: PopupType;
  gridSize: number;
  tileSize: number;
  onDone: () => void;
}

const COLOR_MAP: Record<string, string> = {
  green: '#86efac',
  red: '#f87171',
  gold: '#fcd34d',
};

export default function ScorePopup({ popup, gridSize, tileSize, onDone }: Props) {
  const gap = 8;
  const padding = 8;
  const left = padding + popup.col * (tileSize + gap) + tileSize / 2;
  const top  = padding + popup.row * (tileSize + gap) - 20;

  const color = COLOR_MAP[popup.color] || '#ffffff';

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -56, scale: 1.15 }}
      transition={{ duration: 0.75, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      style={{
        position: 'absolute',
        left,
        top,
        color,
        pointerEvents: 'none',
        zIndex: 40,
        fontWeight: 'bold',
        fontSize: '13px',
        whiteSpace: 'nowrap',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        transform: 'translateX(-50%)',
      }}
    >
      {popup.score > 0 ? `+${popup.score.toLocaleString()} ${popup.label}` : popup.label}
    </motion.div>
  );
}
