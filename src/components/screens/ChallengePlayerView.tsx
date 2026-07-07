'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft, CheckCircle, CheckSquare, Sparkles, Volume2,
} from 'lucide-react';
import { ChallengeMessageBubble } from '@/components/ui/ChallengeMessageBubble';
import { useMessageSequence } from '@/lib/useMessageSequence';
import type { ChallengeDay, DevolutivaInput, DevolutivaTipo } from '@/types/challenge';

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
}

export function ChallengePlayerView({
  day,
  dayTitle,
  initialVisibleCount = 0,
  onBack,
  onCompleteDay,
  onSubmitDevolutiva,
}: ChallengePlayerViewProps) {
  const { visibleMessages, isTyping, isComplete } = useMessageSequence(
    day.messages,
    initialVisibleCount
  );

  const [journalType, setJournalType] = useState<DevolutivaTipo | 'none'>('none');
  const [journalText, setJournalText] = useState('');

  function saveTextDevolutiva() {
    if (!journalText.trim()) return;
    onSubmitDevolutiva({ dayNumber: day.dayNumber, tipo: 'TEXTO', conteudo: journalText });
    setJournalType('none');
    setJournalText('');
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
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-soft)]/80 px-6 pt-4 pb-8 flex flex-col gap-4 shadow-sm z-30 justify-end">
          <p className="text-[10px] font-bold text-center text-[var(--color-brand-brown)]/50 uppercase tracking-widest leading-none">
            Como foi o seu desafio hoje? (opcional)
          </p>

          <div className="flex justify-around items-center">
            <DevolutivaButton
              icon={<CheckSquare className="w-4.5 h-4.5" />}
              label="Texto"
              active={journalType === 'TEXTO'}
              onClick={() => setJournalType(journalType === 'TEXTO' ? 'none' : 'TEXTO')}
            />
            <DevolutivaButton
              icon={<Volume2 className="w-4.5 h-4.5" />}
              label="Áudio"
              active={journalType === 'AUDIO'}
              onClick={() => setJournalType('AUDIO')}
            />
            <DevolutivaButton
              icon={<Sparkles className="w-4.5 h-4.5" />}
              label="Foto"
              active={journalType === 'FOTO'}
              onClick={() => setJournalType('FOTO')}
            />
          </div>

          {journalType === 'TEXTO' && (
            <div className="bg-[var(--color-surface-cream)] rounded-xl p-3 border border-[var(--color-border-soft)] space-y-2.5 animate-fade-in mt-1">
              <textarea
                placeholder="Compartilhe como você se sentiu hoje... Algum desconforto?"
                className="w-full text-xs p-2.5 rounded-lg border-none bg-white resize-none h-14 placeholder:text-[var(--color-brand-brown)]/45"
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setJournalType('none')}
                  className="px-3 py-1 text-[10px] font-bold uppercase text-[var(--color-brand-brown)]/60"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveTextDevolutiva}
                  disabled={!journalText.trim()}
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

function DevolutivaButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group outline-none">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all border ${
          active
            ? 'bg-[var(--color-brand-terracota)] border-[var(--color-brand-terracota)] text-white'
            : 'bg-[var(--color-surface-cream)] border-[var(--color-border-soft)] text-[var(--color-brand-terracota)] hover:bg-[var(--color-brand-terracota)]/10'
        }`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold text-[var(--color-brand-brown)]/70 tracking-wide">
        {label}
      </span>
    </button>
  );
}
