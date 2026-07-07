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
  /** 2–3 pilares exibidos como teaser bloqueado para motivar o desbloqueio. */
  pontosAtencao: Pick<PillarResult, 'label' | 'level'>[];
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
              className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-[var(--color-brand-brown)]/30" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--color-brand-brown)]">{pilar.label}</p>
                  <PillarLevelBadge level={pilar.level} />
                </div>
              </div>
              <span className="text-[10px] font-bold text-[var(--color-brand-brown)]/25 uppercase tracking-wider">
                Bloqueado
              </span>
            </div>
          ))}

          {/* Card indicando que há mais pilares ocultos */}
          <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-soft)] p-4 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[var(--color-brand-brown)]/20" />
            <p className="text-[11px] text-[var(--color-brand-brown)]/35">
              + {13 - pontosAtencao.length} pilares disponíveis no relatório completo
            </p>
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
