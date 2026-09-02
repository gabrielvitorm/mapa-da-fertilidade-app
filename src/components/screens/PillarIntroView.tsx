'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

const AUTO_ADVANCE_MS = 2500;

interface PillarIntroViewProps {
  icon: LucideIcon;
  pillarLabel: string;
  pillarNumber: number;
  totalPillars: number;
  introText: string;
  onContinue: () => void;
}

export function PillarIntroView({
  icon: Icon,
  pillarLabel,
  pillarNumber,
  totalPillars,
  introText,
  onContinue,
}: PillarIntroViewProps) {
  const reduceMotion = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const timer = setTimeout(onContinue, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-surface-cream)] px-8 text-center"
    >
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : 0.1 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-brand-sage)]/15 text-[var(--color-brand-sage)]"
      >
        <Icon className="h-9 w-9" />
      </motion.div>

      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50">
        Pilar {pillarNumber} de {totalPillars}
      </span>

      <h2
        ref={titleRef}
        tabIndex={-1}
        className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] outline-none"
      >
        {pillarLabel}
      </h2>

      <p className="max-w-xs text-sm leading-relaxed text-[var(--color-brand-brown)]/70">{introText}</p>

      <button
        type="button"
        onClick={onContinue}
        className="relative mt-2 overflow-hidden rounded-xl bg-[var(--color-brand-terracota)] px-8 py-3 text-sm font-semibold text-white"
      >
        <span className="relative z-10">Continuar</span>
        {!reduceMotion && (
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
            style={{ originX: 0 }}
            className="absolute inset-0 bg-white/15"
            aria-hidden="true"
          />
        )}
      </button>
    </motion.div>
  );
}
