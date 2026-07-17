import { PillarLevelBadge } from '@/components/ui/PillarLevelBadge';
import { PillarScoreBar } from '@/components/ui/PillarScoreBar';
import { rankPillars } from '@/lib/report-priority';
import type { PillarResult } from '@/types/assessment';

interface PrioritySummaryProps {
  pillars: PillarResult[];
}

function SummaryCard({
  title,
  accentClassName,
  emptyMessage,
  pillars,
}: {
  title: string;
  accentClassName: string;
  emptyMessage: string;
  pillars: PillarResult[];
}) {
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${accentClassName}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-serif text-base font-bold text-[var(--color-brand-brown)]">{title}</h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-brand-brown)]/60">
            Top 3 pilares filtrados por relevância.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--color-border-soft)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-brown)]/45">
          {pillars.length}
        </span>
      </div>

      {pillars.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-cream)]/60 px-3 py-3 text-sm leading-relaxed text-[var(--color-brand-brown)]/70">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {pillars.map((pillar) => (
            <div key={pillar.key} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-cream)]/35 p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-brand-brown)]">
                    {pillar.label}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-brand-brown)]/45">
                    Peso {pillar.peso} · {pillar.score}/{pillar.max} pts
                  </p>
                </div>
                <PillarLevelBadge level={pillar.level} />
              </div>
              <PillarScoreBar pillar={pillar} />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function PrioritySummary({ pillars }: PrioritySummaryProps) {
  const { priorities, strengths } = rankPillars(pillars);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] leading-tight">
          Prioridades e fortalezas
        </h3>
        <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/70">
          Leitura objetiva dos 3 pilares mais críticos e dos 3 mais sólidos, ignorando itens bloqueados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCard
          title="Prioridades"
          accentClassName="border-[var(--color-brand-terracota)]/20"
          emptyMessage="Nenhum pilar disponível para priorização no momento."
          pillars={priorities}
        />

        <SummaryCard
          title="Fortalezas"
          accentClassName="border-[var(--color-brand-sage)]/20"
          emptyMessage="Nenhum pilar disponível para destacar como fortaleza no momento."
          pillars={strengths}
        />
      </div>
    </section>
  );
}
