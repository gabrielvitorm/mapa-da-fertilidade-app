'use client';

import { Star, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { NIVEL_GLOBAL_LABEL, type NivelGlobal } from '@/types/assessment';

interface ChallengeCompleteViewProps {
  dayNumber: number;
  totalDays: number;
  nivelGlobal: NivelGlobal;
  /** Horas até o próximo dia desbloquear. 0 = já desbloqueado. Irrelevante se isLastDay. */
  hoursUntilNextDay: number;
  isLastDay: boolean;
  onBackToTimeline: () => void;
}

const ENCOURAGEMENT_BY_DAY: Record<number, string> = {
  1: 'Primeiro passo dado. Seu corpo já está respondendo.',
  2: 'Dois dias seguidos. Você está construindo um novo ritmo.',
  3: 'Você está no meio da jornada — é aqui que a transformação acontece.',
  4: 'Mais da metade do caminho percorrido. Sinta a diferença.',
  5: 'Cinco dias de cuidado intencional. Seu organismo agradece.',
  6: 'Quase lá. Cada prática que você fez está se consolidando.',
  7: 'Sete dias completos. Você fez tudo isso por você.',
};

function getEncouragement(dayNumber: number): string {
  return ENCOURAGEMENT_BY_DAY[dayNumber] ?? 'Parabéns por mais um dia de cuidado com você.';
}

export function ChallengeCompleteView({
  dayNumber,
  totalDays,
  nivelGlobal,
  hoursUntilNextDay,
  isLastDay,
  onBackToTimeline,
}: ChallengeCompleteViewProps) {
  const nivelLabel = NIVEL_GLOBAL_LABEL[nivelGlobal];
  const progressPercent = Math.round((dayNumber / totalDays) * 100);

  if (isLastDay) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
        {/* Hero dourado para conclusão da trilha */}
        <div
          className="relative flex flex-col items-center text-center px-6 pt-14 pb-12 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, var(--color-brand-gold)/12 0%, var(--color-brand-terracota)/8 100%)' }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--color-brand-gold)]/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[var(--color-brand-terracota)]/10 blur-3xl" />

          {/* Ícones de celebração */}
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-[var(--color-brand-gold)]/15 border border-[var(--color-brand-gold)]/30 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-[var(--color-brand-gold)]" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--color-brand-terracota)] flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 fill-white text-[var(--color-brand-terracota)]" />
              </div>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-gold)]">
              Trilha completa
            </p>

            <h1 className="font-serif italic text-3xl font-bold text-[var(--color-brand-brown)] leading-tight max-w-[280px]">
              Trilha {nivelLabel} concluída!
            </h1>

            <p className="text-sm leading-relaxed text-[var(--color-brand-brown)]/70 max-w-[300px]">
              Você completou os 7 dias com intenção e constância. Isso não é pouco — é a base de uma fertilidade que floresce.
            </p>

            {/* Badge de conquista */}
            <div className="flex items-center gap-2 bg-white/70 border border-[var(--color-brand-gold)]/30 rounded-full px-4 py-2 mt-1">
              <Star className="w-3.5 h-3.5 text-[var(--color-brand-gold)] fill-[var(--color-brand-gold)]" />
              <span className="text-[11px] font-bold text-[var(--color-brand-brown)]/80 tracking-wide">
                7 dias · Trilha {nivelLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Mensagem de conquista */}
        <div className="flex-grow px-6 py-8 space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-sage)]">
              Sua jornada
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-brand-brown)]/75">
              Cada dia que você apareceu para si mesma importa. As práticas que você vivenciou são sementes — continue regando no seu próprio tempo.
            </p>
          </div>

          {/* Barra de progresso 100% */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50">
                Progresso da trilha
              </p>
              <p className="text-[10px] font-bold text-[var(--color-brand-gold)]">
                100%
              </p>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-border-soft)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-700"
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-[11px] text-[var(--color-brand-brown)]/55">
              {totalDays} de {totalDays} dias concluídos
            </p>
          </div>
        </div>

        {/* CTA fixo no rodapé */}
        <div className="px-6 pb-10 pt-4 bg-[var(--color-surface-cream)] border-t border-[var(--color-border-soft)]">
          <button
            onClick={onBackToTimeline}
            className="w-full py-4 bg-[var(--color-brand-gold)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-sm transition-opacity"
          >
            Ver minha jornada
          </button>
        </div>
      </div>
    );
  }

  // Modo: dia intermediário
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Topo de celebração */}
      <div className="relative bg-white border-b border-[var(--color-border-soft)] px-6 pt-12 pb-10 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--color-brand-gold)]/8 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[var(--color-brand-sage)]/10 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-gold)]/12 border border-[var(--color-brand-gold)]/20 flex items-center justify-center">
            <Star className="w-8 h-8 text-[var(--color-brand-gold)] fill-[var(--color-brand-gold)]/20" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-sage)] mb-2">
              Parabéns!
            </p>
            <h1 className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] leading-tight max-w-[260px]">
              Dia {dayNumber} concluído!
            </h1>
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/70 max-w-[280px]">
            {getEncouragement(dayNumber)}
          </p>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="flex-grow px-6 py-8 space-y-4">
        {/* Card: próximo dia */}
        <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-sage)]/10 border border-[var(--color-brand-sage)]/20 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5 text-[var(--color-brand-sage)]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50 mb-1">
              Próximo dia
            </p>
            {hoursUntilNextDay > 0 ? (
              <>
                <p className="text-sm font-bold text-[var(--color-brand-brown)]">
                  Disponível em ~{hoursUntilNextDay}h
                </p>
                <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/60 mt-0.5">
                  Seu corpo precisa de tempo para integrar. Volte amanhã.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[var(--color-brand-sage)]">
                  Próximo dia já disponível!
                </p>
                <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/60 mt-0.5">
                  Continue sua jornada quando sentir que está pronta.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Barra de progresso da trilha */}
        <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50">
              Progresso da trilha
            </p>
            <p className="text-[10px] font-bold text-[var(--color-brand-terracota)]">
              {progressPercent}%
            </p>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-border-soft)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-brand-terracota)] transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--color-brand-brown)]/55">
            {dayNumber} de {totalDays} dias concluídos
          </p>
        </div>
      </div>

      {/* CTA fixo no rodapé */}
      <div className="px-6 pb-10 pt-4 bg-[var(--color-surface-cream)] border-t border-[var(--color-border-soft)]">
        <button
          onClick={onBackToTimeline}
          className="w-full py-4 bg-[var(--color-brand-terracota)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-sm transition-opacity"
        >
          Voltar à jornada
        </button>
        <p className="text-center text-[10px] text-[var(--color-brand-brown)]/45 mt-3 leading-relaxed">
          Trilha {NIVEL_GLOBAL_LABEL[nivelGlobal]} · Dia {dayNumber} de {totalDays}
        </p>
      </div>
    </div>
  );
}
