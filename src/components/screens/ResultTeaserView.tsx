import { Lock, Sparkles } from 'lucide-react';
import { PillarLevelBadge } from '@/components/ui/PillarLevelBadge';
import {
  NIVEL_GLOBAL_LABEL,
  type NivelGlobal,
  type PillarResult,
} from '@/types/assessment';

interface ResultTeaserViewProps {
  primeiroNome: string;
  nivelGlobal: NivelGlobal;
  /** 2–3 pilares exibidos como teaser: diagnóstico liberado, recomendação borrada. */
  pontosAtencao: (Pick<PillarResult, 'label' | 'level' | 'diagnostico' | 'recomendacao'> & {
    /** As respostas reais da usuária que mais pesaram nesse pilar, com insight próprio de cada uma. */
    evidencias: { pergunta: string; resposta: string; insight: string }[];
  })[];
  /** Nomes dos demais pilares do mapa, exibidos como lista (não abstrato). */
  outrosPilares: string[];
  /** URL do produto no Kiwify/Hotmart. Vem do catálogo (tabela products). */
  checkoutUrl: string;
}

const NIVEL_CONFIG: Record<NivelGlobal, { cor: string; descricao: string }> = {
  BAIXA: {
    cor: 'var(--color-brand-terracota)',
    descricao:
      'Seu corpo está pedindo atenção em vários pilares. O relatório completo mostra exatamente onde agir.',
  },
  MODERADA: {
    cor: 'var(--color-brand-gold)',
    descricao:
      'Você tem bases sólidas, mas alguns pilares precisam de ajustes finos. O relatório detalha cada um.',
  },
  ALTA: {
    cor: 'var(--color-brand-sage)',
    descricao:
      'Seu nível de fertilidade é elevado. O relatório aponta como sustentar e aprofundar esse resultado.',
  },
};

export function ResultTeaserView({
  primeiroNome,
  nivelGlobal,
  pontosAtencao,
  outrosPilares,
  checkoutUrl,
}: ResultTeaserViewProps) {
  const nivelLabel = NIVEL_GLOBAL_LABEL[nivelGlobal];
  const config = NIVEL_CONFIG[nivelGlobal];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Cabeçalho do resultado */}
      <div className="bg-white border-b border-[var(--color-border-soft)] px-6 pt-10 pb-8 flex flex-col items-center text-center relative overflow-hidden">
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20"
          style={{ background: config.cor }}
        />

        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative z-10"
          style={{ background: `color-mix(in srgb, ${config.cor} 12%, transparent)` }}
        >
          <Sparkles className="w-7 h-7" style={{ color: config.cor }} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/50 mb-1 relative z-10">
          Diagnóstico inicial
        </p>
        <h1 className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] mb-1 relative z-10">
          {primeiroNome}, você é
        </h1>
        <p
          className="font-serif italic text-3xl font-bold mb-3 relative z-10"
          style={{ color: config.cor }}
        >
          {nivelLabel}
        </p>
        <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/65 max-w-[280px] relative z-10">
          {config.descricao}
        </p>
      </div>

      {/* Pilares bloqueados — teaser */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45 mb-3">
          Pontos de atenção identificados
        </p>

        <div className="flex flex-col gap-3">
          {pontosAtencao.map((pilar) => (
            <div
              key={pilar.label}
              className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--color-brand-brown)]">{pilar.label}</p>
                <PillarLevelBadge level={pilar.level} />
              </div>

              <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/70">
                {pilar.diagnostico}
              </p>

              {pilar.evidencias.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pilar.evidencias.map((ev) => (
                    <div key={ev.pergunta} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[var(--color-brand-terracota)] shrink-0 mt-[5px]" />
                      <div>
                        <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/65">
                          {ev.insight}
                        </p>
                        <p className="text-[9px] text-[var(--color-brand-brown)]/35 mt-0.5">
                          {ev.pergunta} — sua resposta: &ldquo;{ev.resposta}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-1.5 pt-2 border-t border-dashed border-[var(--color-border-soft)]">
                <Lock className="w-3 h-3 shrink-0 mt-0.5 text-[var(--color-brand-brown)]/30" />
                <p
                  className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/50 blur-[3px] select-none line-clamp-1"
                  aria-hidden="true"
                >
                  {pilar.recomendacao}
                </p>
              </div>
            </div>
          ))}

          {/* Lista com os demais pilares do mapa (concreta, não um número abstrato) */}
          <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-soft)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-[var(--color-brand-brown)]/20" />
              <p className="text-[11px] text-[var(--color-brand-brown)]/45">
                + {outrosPilares.length} pilares no seu mapa completo
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {outrosPilares.map((label) => (
                <span
                  key={label}
                  className="text-[10px] font-medium text-[var(--color-brand-brown)]/40 bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] rounded-full px-2.5 py-1"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA de desbloqueio */}
      <div className="px-6 pt-2 pb-10 mt-auto">
        <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 flex flex-col gap-4">
          <div>
            <p className="font-serif italic text-base font-bold text-[var(--color-brand-brown)] mb-1">
              Desbloqueie o relatório completo
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/65">
              Diagnóstico detalhado dos 13 pilares com recomendações personalizadas para o seu perfil.
            </p>
          </div>

          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold text-[var(--color-brand-brown)]">R$&nbsp;49,90</span>
            <span className="text-[10px] text-[var(--color-brand-brown)]/40 mb-0.5 leading-tight">
              pagamento único
            </span>
          </div>

          <a
            href={checkoutUrl}
            className="block w-full py-4 bg-[var(--color-brand-terracota)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider text-center transition-opacity"
          >
            Quero meu relatório completo
          </a>

          <p className="text-center text-[10px] text-[var(--color-brand-brown)]/35 leading-relaxed">
            Acesso imediato após o pagamento · Seguro e sem assinatura
          </p>
        </div>
      </div>
    </div>
  );
}
