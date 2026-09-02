'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const MESSAGES = ['Analisando suas respostas…', 'Cruzando os 13 pilares…', 'Montando o seu mapa…'];
const MESSAGE_INTERVAL_MS = 1200;

interface CalculatingViewProps {
  status: 'loading' | 'error';
  onRetry: () => void;
}

export function CalculatingView({ status, onRetry }: CalculatingViewProps) {
  const reduceMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (status !== 'loading') return;

    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-surface-cream)] px-8 text-center">
        <p className="text-sm font-medium text-[var(--color-brand-brown)]">
          Não conseguimos calcular agora.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-[var(--color-brand-terracota)] px-8 py-3 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--color-surface-cream)] px-8 text-center">
      <motion.div
        className="h-16 w-16 rounded-full border-2 border-[var(--color-border-soft)] border-t-[var(--color-brand-terracota)]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 1, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />

      <div className="h-6" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="text-sm font-medium text-[var(--color-brand-brown)]/70"
          >
            {MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
