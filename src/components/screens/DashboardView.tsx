import Link from 'next/link';
import { FileText, Flame, ChevronRight, Lock } from 'lucide-react';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { NIVEL_GLOBAL_LABEL, type NivelGlobal } from '@/types/assessment';

interface DashboardViewProps {
  primeiroNome: string;
  nivelGlobal: NivelGlobal;
  resultadoFinal: number;
  relatorioHref: string;
  /** Rota interna (/desafio) se a usuária tem acesso; checkoutUrl se não tem. */
  desafioHref: string;
  temDesafio: boolean;
  /** Dia atual da trilha — só presente quando temDesafio é true. */
  progressoDesafio?: { diaAtual: number };
}

const NIVEL_COR: Record<NivelGlobal, string> = {
  BAIXA: 'var(--color-brand-terracota)',
  MODERADA: 'var(--color-brand-gold)',
  ALTA: 'var(--color-brand-sage)',
};

export function DashboardView({
  primeiroNome,
  nivelGlobal,
  resultadoFinal,
  relatorioHref,
  desafioHref,
  temDesafio,
  progressoDesafio,
}: DashboardViewProps) {
  const nivelLabel = NIVEL_GLOBAL_LABEL[nivelGlobal];
  const nivelCor = NIVEL_COR[nivelGlobal];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--color-border-soft)] px-6 h-16 flex items-center justify-between">
        <p className="font-serif italic text-sm font-bold text-[var(--color-brand-terracota)]">
          Mapa da Fertilidade
        </p>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: nivelCor }}
          aria-hidden
        >
          {primeiroNome[0].toUpperCase()}
        </div>
      </header>

      <div className="flex-grow px-6 py-6 space-y-5 pb-10">
        {/* Saudação */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40 mb-0.5">
            Bem-vinda de volta
          </p>
          <h1 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)]">
            {primeiroNome} 🌷
          </h1>
        </div>

        {/* Card hero — nível + score */}
        <div className="bg-white rounded-2xl border border-[var(--color-border-soft)] p-5 flex items-center gap-5 relative overflow-hidden">
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-15"
            style={{ background: nivelCor }}
          />
          <ScoreRing score={resultadoFinal} />
          <div className="flex-1 z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40 mb-0.5">
              Nível de fertilidade
            </p>
            <p
              className="font-serif italic text-2xl font-bold leading-tight"
              style={{ color: nivelCor }}
            >
              {nivelLabel}
            </p>
            <p className="text-[11px] text-[var(--color-brand-brown)]/55 mt-1 leading-relaxed">
              {Math.round(resultadoFinal)}% dos pilares avaliados
            </p>
          </div>
        </div>

        {/* Card — Relatório */}
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40 px-1">
            Seu diagnóstico
          </p>
          <Link
            href={relatorioHref}
            className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4 flex items-center gap-4 hover:border-[var(--color-brand-terracota)]/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-terracota)]/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[var(--color-brand-terracota)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--color-brand-brown)]">Relatório completo</p>
              <p className="text-[11px] text-[var(--color-brand-brown)]/55">
                13 pilares · diagnóstico e recomendações
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-brand-brown)]/30 shrink-0" />
          </Link>
        </section>

        {/* Card — Desafio */}
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40 px-1">
            Desafio 7 dias
          </p>

          {temDesafio ? (
            <Link
              href={desafioHref}
              className="bg-white rounded-xl border border-[var(--color-border-soft)] p-4 flex items-center gap-4 hover:border-[var(--color-brand-sage)]/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-sage)]/10 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-[var(--color-brand-sage)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-brand-brown)]">Trilha {nivelLabel}</p>
                {progressoDesafio ? (
                  <>
                    <p className="text-[11px] text-[var(--color-brand-brown)]/55">
                      Dia {progressoDesafio.diaAtual} de 7 em andamento
                    </p>
                    {/* Barra de progresso da trilha */}
                    <div className="mt-2 h-1 rounded-full bg-[var(--color-border-soft)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-sage)] transition-all"
                        style={{ width: `${(progressoDesafio.diaAtual / 7) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--color-brand-brown)]/55">Começar agora</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-brand-brown)]/30 shrink-0" />
            </Link>
          ) : (
            <a
              href={desafioHref}
              className="bg-[var(--color-brand-sage)] rounded-xl p-4 flex items-center gap-4 hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Desafio 7 dias</p>
                <p className="text-[11px] text-white/75">
                  R$&nbsp;197,90 · Trilha personalizada para o seu nível
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
            </a>
          )}
        </section>
      </div>
    </div>
  );
}
