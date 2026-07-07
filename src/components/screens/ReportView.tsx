'use client';

import { useState } from 'react';
import {
  ArrowLeft, Flame, Moon, Brain, Calendar, Utensils, Activity,
  Droplet, Sparkles, type LucideIcon,
} from 'lucide-react';
import { PillarLevelBadge } from '@/components/ui/PillarLevelBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import {
  NIVEL_GLOBAL_LABEL,
  type AssessmentResult,
  type PillarKey,
} from '@/types/assessment';

/**
 * Tela do relatório completo, portada de `ReportView` (AI Studio).
 *
 * Diferenças deliberadas em relação ao protótipo original:
 * - Renderiza os 13 pilares reais (docs/02), não os 3 mockados + 4 rasos.
 * - Recebe `result` via props (Server Component busca no banco) em vez de
 *   ler `PILLARS_DATA`/`OTHER_PILLARS` hardcoded.
 * - Pilares com `locked: true` mostram um teaser bloqueado em vez do
 *   diagnóstico — usado na fase anônima/pré-pagamento (ver docs/03).
 */

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

interface ReportViewProps {
  result: AssessmentResult;
  onBack?: () => void;
  onUpsellClick?: () => void;
}

export function ReportView({ result, onBack, onUpsellClick }: ReportViewProps) {
  const [expandedPillar, setExpandedPillar] = useState<string>('');

  const nivelLabel = NIVEL_GLOBAL_LABEL[result.nivelGlobal];
  const lowestPillar = [...result.pillars]
    .filter((p) => !p.locked)
    .sort((a) => (a.level === 'Baixo' ? -1 : 1))[0];

  return (
    <div className="flex-grow flex flex-col bg-[var(--color-surface-cream)] min-h-screen">
      <header className="bg-white sticky top-0 z-30 flex items-center justify-between px-5 h-16 border-b border-[var(--color-border-soft)]">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-8 h-8 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-brand-terracota)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-serif italic text-sm font-bold text-[var(--color-brand-terracota)] flex-1 text-center pr-2">
          Relatório Completo
        </h1>
        <div className="w-8" />
      </header>

      <div className="flex-grow p-6 space-y-6 pb-24 text-left">
        {/* Card do score global */}
        <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[var(--color-brand-sage)]/10 rounded-full blur-2xl" />

          <div className="mb-3">
            <ScoreRing score={result.resultadoFinal} />
          </div>

          <div className="z-10 mt-1">
            <h2 className="font-serif italic text-lg font-medium text-[var(--color-brand-brown)] mb-1">
              Nível Global: {nivelLabel}
            </h2>
            <p className="text-[11.5px] leading-relaxed text-[var(--color-brand-brown)]/85 max-w-[270px] mx-auto font-sans">
              {NIVEL_DESCRICAO[result.nivelGlobal]}
            </p>
          </div>
        </section>

        {/* Os 13 pilares */}
        <div className="space-y-4">
          <h3 className="font-serif text-base font-bold text-[var(--color-brand-brown)] leading-tight">
            Pilares Examinados
          </h3>

          <div className="space-y-3">
            {result.pillars.map((pillar) => {
              const isSelected = expandedPillar === pillar.key;
              const Icon = PILLAR_ICON[pillar.key] ?? Sparkles;

              return (
                <div
                  key={pillar.key}
                  className="bg-white rounded-xl border border-[var(--color-border-soft)] overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setExpandedPillar(isSelected ? '' : pillar.key)}
                    disabled={pillar.locked}
                    className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-surface-cream)]/50 text-left disabled:cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-terracota)]/10 flex items-center justify-center text-[var(--color-brand-terracota)]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-brand-brown)]">
                          {pillar.label}
                        </h4>
                        {pillar.locked ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-[var(--color-border-soft)] text-[var(--color-brand-brown)]/60">
                            Bloqueado
                          </span>
                        ) : (
                          <PillarLevelBadge level={pillar.level} />
                        )}
                      </div>
                    </div>
                    {!pillar.locked && (
                      <span className="text-xs transition-transform duration-300 transform font-bold text-[var(--color-brand-terracota)]">
                        {isSelected ? 'Ocultar ▲' : 'Expandir ▼'}
                      </span>
                    )}
                  </button>

                  {isSelected && !pillar.locked && (
                    <div className="p-4 bg-[var(--color-surface-cream)]/50 text-xs text-[var(--color-brand-brown)]/95 space-y-3 leading-relaxed border-t border-[var(--color-border-soft)] animate-fade-in">
                      <div>
                        <strong className="text-[var(--color-brand-terracota)] block uppercase tracking-wider text-[9px] font-bold mb-0.5">
                          Diagnóstico
                        </strong>
                        <p>{pillar.diagnostico}</p>
                      </div>
                      <div>
                        <strong className="text-[var(--color-brand-sage)] block uppercase tracking-wider text-[9px] font-bold mb-0.5">
                          Recomendação personalizada
                        </strong>
                        <p>{pillar.recomendacao}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upsell para o desafio, citando o pilar mais fraco real */}
        {lowestPillar && (
          <div className="bg-[var(--color-brand-sage)] text-[var(--color-surface-cream)] p-5 rounded-xl relative overflow-hidden shadow-sm">
            <div className="space-y-1 z-10 relative">
              <h3 className="font-serif text-base font-bold">Desbloqueie o próximo nível</h3>
              <p className="text-xs leading-relaxed opacity-90">
                Seu relatório indica que o pilar de {lowestPillar.label} pode evoluir com
                ajustes focados — é exatamente o foco do Desafio de 7 Dias.
              </p>
              <div className="pt-3">
                <button
                  onClick={onUpsellClick}
                  className="bg-[var(--color-surface-cream)] hover:opacity-90 text-[var(--color-brand-brown)] text-xs font-bold px-5 py-2.5 rounded-lg transition-colors uppercase tracking-wider"
                >
                  Ver Plano Detalhado
                </button>
              </div>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-15">
              <Sparkles className="w-24 h-24 stroke-white fill-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const NIVEL_DESCRICAO: Record<AssessmentResult['nivelGlobal'], string> = {
  BAIXA: 'Você está se recolhendo. Agora é sobre cuidar de si, ouvir o corpo e confiar no tempo de pausa que prepara o novo.',
  MODERADA: 'Você está em construção. Suas bases estão sólidas, mas o florescimento exige alguns ajustes finos.',
  ALTA: 'Você está pronta. Agora é sobre aprofundar, sustentar e abrir espaço para o que está por vir.',
};
