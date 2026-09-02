'use client';

import { motion, useReducedMotion } from 'motion/react';

interface SegmentedProgressBarProps {
  /** Quantidade total de seções (pilares) do quiz. */
  totalSections: number;
  /** Índice (0-based) da seção atual. */
  currentSectionIndex: number;
  /** Preenchimento da seção atual, de 0 a 1. */
  currentSectionProgress: number;
}

export function SegmentedProgressBar({
  totalSections,
  currentSectionIndex,
  currentSectionProgress,
}: SegmentedProgressBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="flex gap-[3px]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={totalSections}
      aria-valuenow={currentSectionIndex + Math.max(0, Math.min(1, currentSectionProgress))}
      aria-label={`Pilar ${currentSectionIndex + 1} de ${totalSections}`}
    >
      {Array.from({ length: totalSections }, (_, i) => {
        const fill = i < currentSectionIndex ? 1 : i === currentSectionIndex ? Math.max(0, Math.min(1, currentSectionProgress)) : 0;

        return (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-border-soft)]">
            <motion.div
              className="h-full rounded-full bg-[var(--color-brand-terracota)]"
              initial={false}
              animate={{ width: `${fill * 100}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 26 }}
            />
          </div>
        );
      })}
    </div>
  );
}
