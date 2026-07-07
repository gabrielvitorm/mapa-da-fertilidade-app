import { CheckCircle, Sprout, TreeDeciduous, Flower2 } from 'lucide-react';
import { NIVEL_GLOBAL_LABEL, type NivelGlobal } from '@/types/assessment';

interface ChallengeOfferViewProps {
  /** URL Kiwify/Hotmart do produto desafio. */
  checkoutUrl: string;
  /** Se conhecido, destaca a trilha da usuária. */
  nivelGlobal?: NivelGlobal;
  /** Personalização do copy. */
  primeiroNome?: string;
}

const TRILHAS: {
  nivel: NivelGlobal;
  codename: string;
  icon: React.ElementType;
  cor: string;
  descricao: string;
}[] = [
  {
    nivel: 'BAIXA',
    codename: 'Semente',
    icon: Sprout,
    cor: 'var(--color-brand-terracota)',
    descricao: 'Para quem está começando a cuidar da fertilidade e precisa construir bases sólidas.',
  },
  {
    nivel: 'MODERADA',
    codename: 'Raízes',
    icon: TreeDeciduous,
    cor: 'var(--color-brand-gold)',
    descricao: 'Para quem já tem alguma base e quer aprofundar o equilíbrio hormonal e ciclo.',
  },
  {
    nivel: 'ALTA',
    codename: 'Floração',
    icon: Flower2,
    cor: 'var(--color-brand-sage)',
    descricao: 'Para quem tem boas bases e quer potencializar e sustentar o nível de fertilidade.',
  },
];

const O_QUE_VOCE_RECEBE = [
  '7 dias de conteúdo guiado e progressivo',
  'Mensagens em formato WhatsApp — práticas, no seu ritmo',
  'Áudios e práticas diárias para cada etapa',
  'Devolutiva opcional ao final de cada dia',
  'Trilha segmentada pelo seu nível de fertilidade',
  'Acesso permanente ao conteúdo no app',
];

export function ChallengeOfferView({
  checkoutUrl,
  nivelGlobal,
  primeiroNome,
}: ChallengeOfferViewProps) {
  const trilhaDaUsuaria = nivelGlobal
    ? TRILHAS.find((t) => t.nivel === nivelGlobal) ?? null
    : null;

  const nivelLabel = nivelGlobal ? NIVEL_GLOBAL_LABEL[nivelGlobal] : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-cream)]">
      {/* Hero */}
      <div className="bg-white border-b border-[var(--color-border-soft)] px-6 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[var(--color-brand-sage)]/8 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-[var(--color-brand-gold)]/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--color-brand-sage)]/12 flex items-center justify-center">
            <TreeDeciduous className="w-5 h-5 text-[var(--color-brand-sage)]" />
          </div>

          <div>
            {primeiroNome && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/45 mb-1">
                {primeiroNome}
                {nivelLabel ? `, trilha ${nivelLabel}` : ''}
              </p>
            )}
            <h1 className="font-serif italic text-2xl font-bold text-[var(--color-brand-brown)] leading-snug">
              Desafio 7 Dias de Fertilidade
            </h1>
          </div>

          <p className="text-xs leading-relaxed text-[var(--color-brand-brown)]/65 max-w-[300px]">
            {trilhaDaUsuaria
              ? `Uma jornada personalizada para o seu nível ${nivelLabel} — ${trilhaDaUsuaria.descricao.toLowerCase()}`
              : '7 dias de conteúdo guiado, segmentado pelo seu nível de fertilidade, para transformar rotinas e resultados.'}
          </p>

          {/* Badge de trilha da usuária */}
          {trilhaDaUsuaria && (
            <div
              className="self-start flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold"
              style={{
                borderColor: trilhaDaUsuaria.cor,
                color: trilhaDaUsuaria.cor,
                background: `color-mix(in srgb, ${trilhaDaUsuaria.cor} 10%, transparent)`,
              }}
            >
              <trilhaDaUsuaria.icon className="w-3.5 h-3.5" />
              Sua trilha: {trilhaDaUsuaria.codename}
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow px-6 py-6 space-y-5">
        {/* As 3 trilhas */}
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40 px-1">
            As 3 trilhas do desafio
          </p>
          <div className="flex flex-col gap-2.5">
            {TRILHAS.map((trilha) => {
              const isDestaque = nivelGlobal === trilha.nivel;
              const Icon = trilha.icon;
              return (
                <div
                  key={trilha.nivel}
                  className="bg-white rounded-xl border p-4 flex items-start gap-3 transition-shadow"
                  style={{
                    borderColor: isDestaque
                      ? trilha.cor
                      : 'var(--color-border-soft)',
                    boxShadow: isDestaque
                      ? `0 0 0 1px ${trilha.cor}40`
                      : undefined,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: `color-mix(in srgb, ${trilha.cor} 12%, transparent)`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: trilha.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-bold"
                        style={{ color: trilha.cor }}
                      >
                        {trilha.codename}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/30">
                        {NIVEL_GLOBAL_LABEL[trilha.nivel]}
                      </span>
                      {isDestaque && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{
                            color: trilha.cor,
                            background: `color-mix(in srgb, ${trilha.cor} 12%, transparent)`,
                          }}
                        >
                          Sua trilha
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-[var(--color-brand-brown)]/65">
                      {trilha.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* O que você recebe */}
        <section className="bg-white rounded-xl border border-[var(--color-border-soft)] p-5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-brown)]/40">
            O que você recebe
          </p>
          <ul className="space-y-2.5">
            {O_QUE_VOCE_RECEBE.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[var(--color-brand-sage)] shrink-0 mt-0.5" />
                <span className="text-xs text-[var(--color-brand-brown)]/80 leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* CTA fixo */}
      <div className="px-6 pb-10 pt-4 bg-[var(--color-surface-cream)] border-t border-[var(--color-border-soft)]">
        <div className="flex items-end gap-2 mb-3">
          <span className="text-2xl font-bold text-[var(--color-brand-brown)]">
            R$&nbsp;197,90
          </span>
          <span className="text-[10px] text-[var(--color-brand-brown)]/40 mb-0.5">
            pagamento único · acesso permanente
          </span>
        </div>
        <a
          href={checkoutUrl}
          className="block w-full py-4 bg-[var(--color-brand-sage)] hover:opacity-90 text-white font-bold rounded-xl text-sm uppercase tracking-wider text-center transition-opacity"
        >
          Quero meu desafio de 7 dias
        </a>
        <p className="text-center text-[10px] text-[var(--color-brand-brown)]/35 mt-3">
          Acesso imediato após a confirmação do pagamento
        </p>
      </div>
    </div>
  );
}
