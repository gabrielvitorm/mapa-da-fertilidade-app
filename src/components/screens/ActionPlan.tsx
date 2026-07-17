import { PillarLevelBadge } from '@/components/ui/PillarLevelBadge';
import { PillarScoreBar } from '@/components/ui/PillarScoreBar';
import { rankPillars } from '@/lib/report-priority';
import type { PillarResult } from '@/types/assessment';

interface ActionPlanProps {
  pillars: PillarResult[];
}

export function ActionPlan({ pillars }: ActionPlanProps) {
  const { actionItems } = rankPillars(pillars);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] leading-tight">
          Plano de ação
        </h3>
        <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/70">
          Sequência curta, limitada a pilares Baixo e Moderado, ordenada pela alavanca mais alta.
        </p>
      </div>

      {actionItems.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-brand-sage)]/20 bg-[var(--color-brand-sage)]/8 p-4">
          <p className="text-sm font-semibold text-[var(--color-brand-brown)]">
            Momento de manutenção
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-brand-brown)]/72">
            Todos os pilares disponíveis já estão em nível alto. O foco agora é sustentar a rotina, proteger os ganhos e monitorar regressões.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {actionItems.map((pillar, index) => (
            <li key={pillar.key} className="rounded-2xl border border-[var(--color-border-soft)] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-terracota)] text-xs font-bold text-white">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-brand-brown)]">
                        {pillar.label}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-brand-brown)]/45">
                        Passo {index + 1} · Peso {pillar.peso}
                      </p>
                    </div>
                    <PillarLevelBadge level={pillar.level} />
                  </div>

                  <PillarScoreBar pillar={pillar} />

                  <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/68">
                    {pillar.diagnostico}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--color-brand-brown)]/82">
                    {pillar.recomendacao}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
