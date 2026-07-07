import { CheckCircle, Lock, Sparkles } from 'lucide-react';
import { NIVEL_GLOBAL_LABEL, PILLAR_LABEL, type NivelGlobal } from '@/types/assessment';

interface CheckoutReportViewProps {
  /** URL do produto Relatório no Kiwify/Hotmart. Vem do catálogo (tabela products). */
  checkoutUrl: string;
  /** Presente quando a usuária já tem um assessment — personaliza o copy. */
  primeiroNome?: string;
  nivelGlobal?: NivelGlobal;
}

const PILARES_DESTAQUE = [
  PILLAR_LABEL.saude_hormonal,
  PILLAR_LABEL.ciclo,
  PILLAR_LABEL.sono,
  PILLAR_LABEL.estresse,
  PILLAR_LABEL.alimentacao,
  PILLAR_LABEL.tireoide,
];

const O_QUE_INCLUI = [
  'Diagnóstico completo dos 13 pilares de fertilidade',
  'Recomendações personalizadas para cada pilar',
  'Pontos de atenção prioritários para o seu perfil',
  'Acesso permanente ao relatório no app',
];

export function CheckoutReportView({
  checkoutUrl,
  primeiroNome,
  nivelGlobal,
}: CheckoutReportViewProps) {
  const nivelLabel = nivelGlobal ? NIVEL_GLOBAL_LABEL[nivelGlobal] : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Hero */}
      <div className="bg-white border-b border-[var(--color-border-soft)] px-6 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-[var(--color-brand-terracota)]/8 blur-2xl" />
        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-[var(--color-brand-sage)]/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--color-brand-terracota)]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[var(--color-brand-terracota)]" />
          </div>

          <div>
            {primeiroNome && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45 mb-1">
                {primeiroNome}
                {nivelLabel ? `, nível ${nivelLabel}` : ''}
              </p>
            )}
            <h1 className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] leading-snug">
              Relatório Completo de Fertilidade
            </h1>
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/65 max-w-[300px]">
            {nivelLabel
              ? `Seu diagnóstico personalizado para o nível ${nivelLabel} — com orientações práticas para cada pilar avaliado.`
              : 'Um diagnóstico detalhado dos 13 pilares da sua fertilidade, com orientações práticas e personalizadas.'}
          </p>
        </div>
      </div>

      <div className="flex-grow px-6 py-6 space-y-5">
        {/* O que está incluído */}
        <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40">
            O que você recebe
          </p>
          <ul className="space-y-2.5">
            {O_QUE_INCLUI.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[var(--color-brand-sage)] shrink-0 mt-0.5" />
                <span className="text-xs text-[var(--color-brand-brown)]/80 leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pilares em preview bloqueado */}
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40 px-1">
            Pilares avaliados
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PILARES_DESTAQUE.map((label) => (
              <div
                key={label}
                className="bg-white rounded-lg border border-[var(--color-border-soft)] px-3 py-2.5 flex items-center gap-2"
              >
                <Lock className="w-3 h-3 text-[var(--color-brand-brown)]/20 shrink-0" />
                <span className="text-[11px] text-[var(--color-brand-brown)]/50 truncate">
                  {label}
                </span>
              </div>
            ))}
            <div className="bg-white rounded-lg border border-dashed border-[var(--color-border-soft)] px-3 py-2.5 flex items-center justify-center col-span-2">
              <span className="text-[10px] text-[var(--color-brand-brown)]/35">
                + 7 pilares adicionais
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* CTA fixo */}
      <div className="px-6 pb-10 pt-4 bg-[var(--color-surface-cream)] border-t border-[var(--color-border-soft)]">
        <div className="flex items-end gap-2 mb-3">
          <span className="text-2xl font-bold text-[var(--color-brand-brown)]">R$&nbsp;49,90</span>
          <span className="text-[10px] text-[var(--color-brand-brown)]/40 mb-0.5">
            pagamento único · acesso permanente
          </span>
        </div>
        <a
          href={checkoutUrl}
          className="block w-full py-4 bg-[var(--color-brand-terracota)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider text-center transition-opacity"
        >
          Quero meu relatório completo
        </a>
        <p className="text-center text-[10px] text-[var(--color-brand-brown)]/35 mt-3">
          Pagamento seguro via Kiwify · Acesso imediato após a confirmação
        </p>
      </div>
    </div>
  );
}
