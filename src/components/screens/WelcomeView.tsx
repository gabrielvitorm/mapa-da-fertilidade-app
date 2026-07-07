'use client';

import { Sparkles, Leaf, BarChart2, CalendarDays } from 'lucide-react';

interface WelcomeViewProps {
  onStart: () => void;
}

export function WelcomeView({ onStart }: WelcomeViewProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Topo decorativo */}
      <div className="relative bg-white border-b border-[var(--color-border-soft)] px-6 pt-12 pb-10 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--color-brand-terracota)]/8 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[var(--color-brand-sage)]/10 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-terracota)]/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-[var(--color-brand-terracota)]" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-sage)] mb-2">
              Diagnóstico de fertilidade
            </p>
            <h1 className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] leading-tight max-w-[260px]">
              Descubra o Mapa da Sua Fertilidade
            </h1>
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/70 max-w-[280px]">
            Um diagnóstico acolhedor para você entender seu corpo e dar os próximos passos com clareza.
          </p>
        </div>
      </div>

      {/* Benefícios */}
      <div className="flex-grow px-6 py-8 space-y-4">
        <BenefitCard
          icon={<BarChart2 className="w-4 h-4 text-[var(--color-brand-terracota)]" />}
          title="Quiz de 13 pilares"
          description="Avaliamos saúde hormonal, ciclo, sono, alimentação e muito mais — de forma personalizada."
        />
        <BenefitCard
          icon={<Sparkles className="w-4 h-4 text-[var(--color-brand-gold)]" />}
          title="Relatório completo"
          description="Diagnóstico individual com recomendações práticas para cada pilar da sua fertilidade."
        />
        <BenefitCard
          icon={<CalendarDays className="w-4 h-4 text-[var(--color-brand-sage)]" />}
          title="Trilha de 7 dias"
          description="Um plano de ação diário segmentado pelo seu nível, no ritmo que o seu corpo pede."
        />
        <BenefitCard
          icon={<Leaf className="w-4 h-4 text-[var(--color-brand-terracota)]" />}
          title="Acolhedor e sem julgamentos"
          description="Criado com especialistas em saúde integrativa feminina para te apoiar onde você está."
        />
      </div>

      {/* CTA fixo no rodapé */}
      <div className="px-6 pb-10 pt-4 bg-[var(--color-surface-cream)] border-t border-[var(--color-border-soft)]">
        <button
          onClick={onStart}
          className="w-full py-4 bg-[var(--color-brand-terracota)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-sm transition-opacity"
        >
          Iniciar diagnóstico gratuito
        </button>
        <p className="text-center text-[10px] text-[var(--color-brand-brown)]/45 mt-3 leading-relaxed">
          Gratuito e sem compromisso · Leva menos de 5 minutos
        </p>
      </div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 bg-white rounded-xl border border-[var(--color-border-soft)] p-4">
      <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-cream)] border border-[var(--color-border-soft)] flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-bold text-[var(--color-brand-brown)] mb-0.5">{title}</h3>
        <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/65">{description}</p>
      </div>
    </div>
  );
}
