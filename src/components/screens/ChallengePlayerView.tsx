'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { ChallengeMessageBubble } from '@/components/ui/ChallengeMessageBubble';
import { useChallengeStepper } from '@/lib/useChallengeStepper';
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';

/**
 * Tela do dia do desafio — formato de aula em passos (stepper), um
 * `ChallengeMessage` por vez, navegação controlada pela usuária
 * (Voltar/Próximo). Ver
 * docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md.
 *
 * `initialVisibleCount` é o índice do passo em que a usuária parou da
 * última vez (persistido via `lastSeenOrdem` no backend). O nome do prop
 * ficou o mesmo por compatibilidade com quem já o consome
 * (`ChallengePlayerClient`, `/desafio/[dia]/page.tsx`), mas agora é um
 * índice de passo, não uma contagem de mensagens reveladas por delay.
 *
 * A devolutiva é sempre opcional e desacoplada da conclusão do dia —
 * "Concluí o dia" nunca fica bloqueado esperando a devolutiva.
 */

interface ChallengePlayerViewProps {
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount?: number;
  /** Progresso de checklist já salvo, chave "<dayNumber>:<ordem>" -> índices marcados. */
  initialChecklistProgress?: Record<string, number[]>;
  onBack?: () => void;
  onCompleteDay: () => void;
  onSubmitDevolutiva: (input: DevolutivaInput) => void;
  onProgressChange?: (visibleCount: number) => void;
  onChecklistChange?: (ordem: number, checkedIndices: number[]) => void;
}

export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  initialChecklistProgress = {},
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
  onProgressChange,
  onChecklistChange,
}: ChallengePlayerViewProps) {
  const totalSteps = day.messages.length;
  const { currentIndex, maxVisitedIndex, next, previous, canGoNext, canGoBack, isLastStep } =
    useChallengeStepper(totalSteps, initialVisibleCount);

  useEffect(() => {
    onProgressChange?.(maxVisitedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxVisitedIndex]);

  const [devolutivaText, setDevolutivaText] = useState('');

  function handleComplete() {
    if (devolutivaText.trim()) {
      onSubmitDevolutiva({ dayNumber: day.dayNumber, texto: devolutivaText });
    }
    onCompleteDay();
  }

  const currentMessage = day.messages[currentIndex];

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-surface-cream)] min-h-screen">
      <header className="bg-white px-5 pt-5 pb-4 sticky top-0 z-40 border-b border-[var(--color-border-soft)] space-y-3">
        <div className="flex items-center justify-between gap-3">
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
        </div>
        <div className="space-y-1.5">
          <div className="h-1 bg-[var(--color-border-soft)] rounded overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-terracota)] rounded transition-all"
              style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-[var(--color-brand-brown)]/45 uppercase tracking-widest">
            Passo {currentIndex + 1} de {totalSteps}
          </p>
        </div>
      </header>

      <div className="flex-grow p-5 pb-32">
        <ChallengeMessageBubble
          key={currentMessage.ordem}
          message={currentMessage}
          initialCheckedIndices={initialChecklistProgress[`${day.dayNumber}:${currentMessage.ordem}`] ?? []}
          onChecklistChange={(checkedIndices) => onChecklistChange?.(currentMessage.ordem, checkedIndices)}
        />
      </div>

      {!isLastStep && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 shadow-sm z-30">
          <div className="flex gap-3">
            <button
              onClick={previous}
              disabled={!canGoBack}
              className="flex-1 py-3.5 border border-[var(--color-border-soft)] text-[var(--color-brand-brown)]/70 font-bold rounded-lg text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <button
              onClick={next}
              disabled={!canGoNext}
              className="flex-1 py-3.5 bg-[var(--color-brand-terracota)] text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:opacity-90 flex items-center justify-center gap-1.5"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}

      {isLastStep && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 flex flex-col gap-3 shadow-sm z-30 justify-end">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-center text-[var(--color-brand-brown)]/50 uppercase tracking-widest leading-none">
              Como foi o seu desafio hoje? (opcional)
            </p>
            <textarea
              placeholder="Compartilhe como você se sentiu hoje... Algum desconforto?"
              className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-cream)] resize-none h-14 placeholder:text-[var(--color-brand-brown)]/45"
              value={devolutivaText}
              onChange={(e) => setDevolutivaText(e.target.value)}
            />
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-4 bg-[var(--color-brand-terracota)] text-white hover:opacity-90 font-bold rounded-lg text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4 fill-white text-[var(--color-brand-terracota)]" />
            <span>{devolutivaText.trim() ? 'Concluir' : 'Concluir sem enviar devolutiva'}</span>
          </button>
        </footer>
      )}
    </div>
  );
}
