'use client';

import { ArrowLeft, CheckCircle, Lock, Play } from 'lucide-react';
import {
  isDayCompleted,
  isDayUnlocked,
  hoursUntilUnlock,
} from '@/lib/challenge-gating';
import { NIVEL_GLOBAL_LABEL } from '@/types/assessment';
import type { ChallengeProgress, ChallengeTrack } from '@/types/challenge';

/**
 * Tela da jornada: lista os 7 dias (+ onboarding Dia 0) com estado de bloqueio.
 *
 * Segue o padrão das telas já portadas (ReportView, ChallengePlayerView):
 * - Header sticky com botão voltar + título da trilha + badge do nível
 * - Lista de cards, um por dia
 * - Dados via props (zero mock hardcoded aqui)
 * - Client Component apenas por causa dos onClick handlers dos cards
 */

interface DayMeta {
  dayNumber: number;
  title: string;
}

interface ChallengeTimelineViewProps {
  track: ChallengeTrack;
  days: DayMeta[];
  progress: ChallengeProgress;
  onSelectDay: (dayNumber: number) => void;
  onBack?: () => void;
}

export function ChallengeTimelineView({
  track,
  days,
  progress,
  onSelectDay,
  onBack,
}: ChallengeTimelineViewProps) {
  const nivelLabel = NIVEL_GLOBAL_LABEL[track.level];

  const completedCount = days.filter((d) =>
    isDayCompleted(d.dayNumber, progress)
  ).length;

  return (
    <div className="flex-grow flex flex-col bg-[var(--color-surface-cream)] min-h-screen">
      {/* Header sticky */}
      <header className="bg-white sticky top-0 z-30 flex items-center justify-between px-5 h-16 border-b border-[var(--color-border-soft)]">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-serif italic text-sm font-bold text-[var(--color-brand-terracota)] flex-1 text-center px-2">
          {track.title}
        </h1>

        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--color-brand-sage)]/15 text-[var(--color-brand-sage)] border border-[var(--color-brand-sage)]/30 shrink-0">
          {nivelLabel}
        </span>
      </header>

      <div className="flex-grow p-6 space-y-6 pb-24 text-left">
        {/* Barra de progresso geral */}
        <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif italic text-sm font-bold text-[var(--color-brand-brown)]">
              Sua jornada
            </h2>
            <span className="text-[11px] font-bold text-[var(--color-brand-sage)]">
              {completedCount}/{days.length} dias
            </span>
          </div>

          {/* Barra visual de progresso */}
          <div className="w-full h-1.5 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-brand-sage)] rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / days.length) * 100}%` }}
            />
          </div>
        </section>

        {/* Lista de dias */}
        <div className="space-y-3">
          {days.map((day) => {
            const completed = isDayCompleted(day.dayNumber, progress);
            const unlocked = isDayUnlocked(day.dayNumber, progress, track);
            const hoursLeft =
              unlocked || completed
                ? 0
                : hoursUntilUnlock(day.dayNumber, progress, track);

            const isAccessible = completed || unlocked;

            return (
              <DayCard
                key={day.dayNumber}
                day={day}
                completed={completed}
                unlocked={unlocked}
                hoursLeft={hoursLeft}
                isAccessible={isAccessible}
                onSelect={onSelectDay}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Card individual de cada dia ─────────────────────────────────────────────

interface DayCardProps {
  day: DayMeta;
  completed: boolean;
  unlocked: boolean;
  hoursLeft: number;
  isAccessible: boolean;
  onSelect: (dayNumber: number) => void;
}

function DayCard({
  day,
  completed,
  unlocked,
  hoursLeft,
  isAccessible,
  onSelect,
}: DayCardProps) {
  const isOnboarding = day.dayNumber === 0;
  const dayLabel = isOnboarding ? 'Boas-vindas' : `Dia ${day.dayNumber}`;

  // Estilos condicionais por estado
  let containerClass =
    'bg-white rounded-xl border overflow-hidden transition-all duration-200 ';
  let iconBgClass = '';
  let iconElement: React.ReactNode;
  let actionLabel = '';

  if (completed) {
    containerClass += 'border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/5';
    iconBgClass = 'bg-[var(--color-brand-gold)]/15';
    iconElement = (
      <CheckCircle
        className="w-5 h-5"
        style={{ color: 'var(--color-brand-gold)' }}
      />
    );
    actionLabel = 'Concluído';
  } else if (unlocked) {
    containerClass +=
      'border-[var(--color-brand-terracota)]/50 shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--color-brand-terracota)]';
    iconBgClass = 'bg-[var(--color-brand-terracota)]/10';
    iconElement = (
      <Play
        className="w-5 h-5 fill-[var(--color-brand-terracota)]/30"
        style={{ color: 'var(--color-brand-terracota)' }}
      />
    );
    actionLabel = isOnboarding ? 'Começar' : 'Continuar';
  } else {
    containerClass += 'border-[var(--color-border-soft)] opacity-60';
    iconBgClass = 'bg-[var(--color-border-soft)]';
    iconElement = (
      <Lock
        className="w-4 h-4"
        style={{ color: 'var(--color-brand-brown)', opacity: 0.45 }}
      />
    );
    actionLabel =
      hoursLeft !== Infinity && hoursLeft > 0
        ? `Libera em ${Math.ceil(hoursLeft)}h`
        : 'Bloqueado';
  }

  return (
    <button
      disabled={!isAccessible}
      onClick={() => isAccessible && onSelect(day.dayNumber)}
      className={`w-full text-left p-4 flex items-center gap-4 ${containerClass} disabled:cursor-default`}
    >
      {/* Ícone de estado */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}
      >
        {iconElement}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-brown)]/50 leading-none mb-0.5">
          {dayLabel}
        </p>
        <h3 className="text-xs font-bold text-[var(--color-brand-brown)] leading-tight truncate">
          {day.title}
        </h3>
      </div>

      {/* Badge de ação */}
      <ActionBadge
        completed={completed}
        unlocked={unlocked}
        label={actionLabel}
      />
    </button>
  );
}

// ─── Badge de ação no lado direito do card ───────────────────────────────────

function ActionBadge({
  completed,
  unlocked,
  label,
}: {
  completed: boolean;
  unlocked: boolean;
  label: string;
}) {
  if (completed) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--color-brand-gold)]/20 text-[var(--color-brand-gold)] border border-[var(--color-brand-gold)]/30 shrink-0">
        {label}
      </span>
    );
  }

  if (unlocked) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--color-brand-terracota)]/10 text-[var(--color-brand-terracota)] border border-[var(--color-brand-terracota)]/30 shrink-0">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--color-border-soft)] text-[var(--color-brand-brown)]/50 shrink-0">
      {label}
    </span>
  );
}
