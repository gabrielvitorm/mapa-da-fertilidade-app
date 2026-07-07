'use client';

import { useEffect, useState } from 'react';
import type { ChallengeMessage } from '@/types/challenge';

/**
 * Revela as mensagens do dia em sequência, respeitando `delayMs` —
 * recria o ritmo "digitando..." do WhatsApp (docs/04-motor-do-desafio.md).
 *
 * `initialVisibleCount` permite retomar de onde a usuária parou (persistido
 * no backend) sem reaplicar delays já consumidos.
 *
 * `isTyping` é derivado de `visibleCount` (não setado manualmente dentro do
 * efeito), para evitar a cascata de renders que o ESLint
 * (react-hooks/set-state-in-effect) sinaliza ao chamar setState
 * sincronamente no corpo de um useEffect.
 */
export function useMessageSequence(
  messages: ChallengeMessage[],
  initialVisibleCount = 0
) {
  const [visibleCount, setVisibleCount] = useState(
    Math.min(initialVisibleCount, messages.length)
  );

  const isComplete = visibleCount >= messages.length;
  const isTyping = !isComplete;

  useEffect(() => {
    if (isComplete) return;

    const next = messages[visibleCount];
    const timeoutId = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, next.delayMs);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, isComplete]);

  const visibleMessages = messages.slice(0, visibleCount);

  return { visibleMessages, isTyping, isComplete, visibleCount };
}
