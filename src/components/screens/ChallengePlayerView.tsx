'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { ChallengeMessageBubble } from '@/components/ui/ChallengeMessageBubble';
import { useMessageSequence } from '@/lib/useMessageSequence';
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';

/**
 * Tela do dia do desafio, portada de `ChallengePlayerView` (AI Studio).
 *
 * Diferenças deliberadas em relação ao protótipo original:
 * - Recebe `day` (ChallengeMessage[] real, do seed/banco) em vez de mensagens
 *   e vídeo hardcoded para "Dia 3".
 * - O índice de mensagens já vistas (`initialVisibleCount`) é persistido,
 *   permitindo retomar sem reiniciar a sequência (docs/04).
 * - A devolutiva é sempre opcional e desacoplada da conclusão do dia —
 *   "Concluí o dia" nunca fica bloqueado esperando a devolutiva.
 */

interface ChallengePlayerViewProps {
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount?: number;
  onBack?: () => void;
  onCompleteDay: () => void;
  onSubmitDevolutiva: (input: DevolutivaInput) => void;
  onProgressChange?: (visibleCount: number) => void;
}

export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
  onProgressChange,
}: ChallengePlayerViewProps) {
  const { visibleMessages, isTyping, isComplete, visibleCount } = useMessageSequence(
    day.messages,
    initialVisibleCount
  );

  useEffect(() => {
    onProgressChange?.(visibleCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount]);

  const [devolutivaOpen, setDevolutivaOpen] = useState(false);
  const [devolutivaText, setDevolutivaText] = useState('');

  function saveDevolutiva() {
    if (!devolutivaText.trim()) return;
    onSubmitDevolutiva({ dayNumber: day.dayNumber, texto: devolutivaText });
    setDevolutivaOpen(false);
    setDevolutivaText('');
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-surface-cream)] min-h-screen">
      <header className="bg-white flex items-center justify-between px-5 h-16 sticky top-0 z-40 border-b border-[var(--color-border-soft)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Voltar à jornada"
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-serif italic text-sm font-bold text-[var(--color-brand-terracota)]">
            {dayTitle}
          </h1>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] text-[var(--color-brand-brown)] flex items-center justify-center">
          <Sparkles className="w-4 h-4 fill-[var(--color-brand-terracota)]/10 text-[var(--color-brand-terracota)]" />
        </div>
      </header>

      <div className="flex-grow p-5 space-y-4 pb-48 text-left">
        {visibleMessages.map((message) => (
          <ChallengeMessageBubble key={message.ordem} message={message} />
        ))}

        {isTyping && <TypingIndicator />}

        {isComplete && (
          <div className="pt-3 flex justify-center w-full">
            <button
              onClick={onCompleteDay}
              className="w-full py-4 bg-[var(--color-brand-terracota)] text-white hover:opacity-90 font-bold rounded-lg text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 fill-white text-[var(--color-brand-terracota)]" />
              <span>Concluí o dia de hoje</span>
            </button>
          </div>
        )}
      </div>

      {isComplete && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 flex flex-col gap-3 shadow-sm z-30 justify-end">
          <button
            onClick={() => setDevolutivaOpen((o) => !o)}
            className="text-[10px] font-bold text-center text-[var(--color-brand-brown)]/50 uppercase tracking-widest leading-none"
          >
            Como foi o seu desafio hoje? (opcional)
          </button>

          {devolutivaOpen && (
            <div className="bg-[var(--color-surface-cream)] rounded-xl p-3 border border-[var(--color-border-soft)] space-y-2.5 animate-fade-in">
              <textarea
                placeholder="Compartilhe como você se sentiu hoje... Algum desconforto?"
                className="w-full text-xs p-2.5 rounded-lg border-none bg-white resize-none h-14 placeholder:text-[var(--color-brand-brown)]/45"
                value={devolutivaText}
                onChange={(e) => setDevolutivaText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDevolutivaOpen(false)}
                  className="px-3 py-1 text-[10px] font-bold uppercase text-[var(--color-brand-brown)]/60"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDevolutiva}
                  disabled={!devolutivaText.trim()}
                  className="px-4 py-1.5 bg-[var(--color-brand-sage)] hover:opacity-90 text-white rounded text-[10px] uppercase font-bold disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 opacity-70">
      <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] shrink-0 flex items-center justify-center text-xs mt-1">
        🌷
      </div>
      <div className="bg-white px-4 py-3 rounded-xl border border-[var(--color-border-soft)] text-[10px] text-[var(--color-brand-brown)]/50">
        digitando…
      </div>
    </div>
  );
}
