'use client';

import { useEffect, useRef } from 'react';
import { type LucideIcon, Activity, Calendar, Download, Droplet, Flame, Moon, Brain, Sparkles, Utensils } from 'lucide-react';
import { PillarRadarChart } from '@/components/charts/PillarRadarChart';
import { ActionPlan } from '@/components/screens/ActionPlan';
import { PrioritySummary } from '@/components/screens/PrioritySummary';
import { PillarLevelBadge } from '@/components/ui/PillarLevelBadge';
import { PillarScoreBar } from '@/components/ui/PillarScoreBar';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { NIVEL_GLOBAL_LABEL, type AssessmentResult, type PillarKey, type PillarResult } from '@/types/assessment';
import styles from '@/app/relatorio/imprimir/print.module.css';

const PILLAR_ICON: Record<PillarKey, LucideIcon> = {
  fatores_infertilidade: Sparkles,
  saude_hormonal: Flame,
  ciclo: Calendar,
  sono: Moon,
  imunidade: Activity,
  atividade_fisica: Activity,
  alimentacao: Utensils,
  saude_intestinal: Droplet,
  figado: Flame,
  estresse: Brain,
  tireoide: Sparkles,
  toxinas: Droplet,
  historico: Calendar,
};

const PILLAR_GROUP_META: Record<1 | 2 | 3, { title: string; description: string }> = {
  3: {
    title: 'Fundamentais',
    description: 'Pilares estruturais com maior peso no resultado e maior alavanca de mudança.',
  },
  2: {
    title: 'Estilo de vida',
    description: 'Hábitos e rotina que sustentam a evolução do quadro atual.',
  },
  1: {
    title: 'Complementares',
    description: 'Ajustes de suporte e refinamento que fecham as lacunas restantes.',
  },
};

function sortPillarsByRatio(a: PillarResult, b: PillarResult) {
  if (a.ratio !== b.ratio) {
    return a.ratio - b.ratio;
  }

  return a.key.localeCompare(b.key);
}

function buildPillarGroups(pillars: PillarResult[]) {
  const grouped: Record<1 | 2 | 3, PillarResult[]> = {
    1: [],
    2: [],
    3: [],
  };

  for (const pillar of pillars) {
    grouped[pillar.peso].push(pillar);
  }

  return ([3, 2, 1] as const)
    .map((peso) => ({
      peso,
      ...PILLAR_GROUP_META[peso],
      pillars: [...grouped[peso]].sort(sortPillarsByRatio),
    }))
    .filter((group) => group.pillars.length > 0);
}

export function ReportPrintView({
  result,
  userName,
  generatedAtLabel,
  autoPrint = true,
  showControls = true,
}: {
  result: AssessmentResult;
  userName: string;
  generatedAtLabel: string;
  autoPrint?: boolean;
  showControls?: boolean;
}) {
  const hasPrintedRef = useRef(false);
  const pillarGroups = buildPillarGroups(result.pillars);

  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    if (hasPrintedRef.current) {
      return;
    }

    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <main className={styles.printRoot}>
      <div className="mx-auto max-w-[210mm] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-4 border-b border-[var(--color-border-soft)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--color-brand-terracota)]/80">
              Mapa da Fertilidade
            </p>
            <h1 className="font-serif text-2xl font-bold text-[var(--color-brand-brown)]">
              Relatório para {userName}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--color-brand-brown)]/75">
              Versão pronta para impressão com score global, radar, prioridades e plano de ação.
            </p>
          </div>

          {showControls ? (
            <div className={`${styles.screenOnly} flex items-center gap-3 sm:justify-end`}>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-brand-brown)]/55">
                Gerado em
              </p>
              <p className="text-sm font-semibold text-[var(--color-brand-brown)]">{generatedAtLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-terracota)] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar PDF
            </button>
          </div>
          ) : null}
        </header>

        <section className={styles.avoidBreak}>
          <div className="rounded-xl border border-[var(--color-border-soft)] bg-white p-5 text-center">
            <ScoreRing score={result.resultadoFinal} />
            <div className="mt-4 space-y-1">
              <h2 className="font-serif text-lg font-bold text-[var(--color-brand-brown)]">
                Nível Global: {NIVEL_GLOBAL_LABEL[result.nivelGlobal]}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-brand-brown)]/80">
                {NIVEL_DESCRICAO[result.nivelGlobal]}
              </p>
            </div>
          </div>
        </section>

        <section className={styles.avoidBreak}>
          <div className="rounded-xl border border-[var(--color-border-soft)] bg-white p-5 space-y-3">
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-bold text-[var(--color-brand-brown)]">
                Radar dos 13 pilares
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-brand-brown)]/70">
                Leitura normalizada para comparação direta entre os pilares.
              </p>
            </div>
            <div className="h-[320px]">
              <PillarRadarChart pillars={result.pillars} />
            </div>
          </div>
        </section>

        <section className={styles.avoidBreak}>
          <PrioritySummary pillars={result.pillars} />
        </section>

        <section className={styles.avoidBreak}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-bold text-[var(--color-brand-brown)]">
                Pilares por grupo
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-brand-brown)]/70">
                Os pilares abaixo já saem abertos na versão impressa.
              </p>
            </div>

            <div className="space-y-4">
              {pillarGroups.map((group) => (
                <section key={group.peso} className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)]">
                        {group.title}
                      </h3>
                      <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/70">
                        {group.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--color-border-soft)] bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-brown)]/55">
                      {group.pillars.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.pillars.map((pillar) => {
                      const Icon = PILLAR_ICON[pillar.key];

                      return (
                        <article
                          key={pillar.key}
                          className="space-y-3 rounded-xl border border-[var(--color-border-soft)] bg-white p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-terracota)]/10 text-[var(--color-brand-terracota)]">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xs font-bold text-[var(--color-brand-brown)]">
                                  {pillar.label}
                                </h4>
                                <PillarLevelBadge level={pillar.level} />
                              </div>
                              <PillarScoreBar pillar={pillar} />
                            </div>
                          </div>

                          <div className="grid gap-3 text-sm leading-relaxed text-[var(--color-brand-brown)]/90 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-terracota)]">
                                Diagnóstico
                              </p>
                              <p>{pillar.diagnostico}</p>
                            </div>
                            <div>
                              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-sage)]">
                                Recomendação personalizada
                              </p>
                              <p>{pillar.recomendacao}</p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.avoidBreak}>
          <ActionPlan pillars={result.pillars} />
        </section>
      </div>
    </main>
  );
}

const NIVEL_DESCRICAO: Record<AssessmentResult['nivelGlobal'], string> = {
  BAIXA: 'Você está se recolhendo. Agora é sobre cuidar de si, ouvir o corpo e confiar no tempo de pausa que prepara o novo.',
  MODERADA: 'Você está em construção. Suas bases estão sólidas, mas o florescimento exige alguns ajustes finos.',
  ALTA: 'Você está pronta. Agora é sobre aprofundar, sustentar e abrir espaço para o que está por vir.',
};
