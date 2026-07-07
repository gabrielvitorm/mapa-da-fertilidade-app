import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-serif text-2xl font-bold text-[var(--color-brand-brown)]">
        Mapa da Fertilidade
      </h1>
      <p className="text-sm text-[var(--color-brand-brown)]/70 max-w-sm">
        Esqueleto do app. Use as rotas de preview abaixo para ver as telas
        portadas do protótipo do AI Studio.
      </p>
      <div className="flex flex-col gap-2 mt-2">
        <Link
          href="/welcome"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Funil real: Boas-vindas
        </Link>
        <Link
          href="/preview/welcome"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-terracota)] text-white text-sm font-bold"
        >
          Preview: Boas-vindas
        </Link>
        <Link
          href="/preview/quiz-pergunta"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-terracota)] text-white text-sm font-bold"
        >
          Preview: Pergunta do Quiz
        </Link>
        <Link
          href="/preview/captura"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-terracota)] text-white text-sm font-bold"
        >
          Preview: Captura de Contato
        </Link>
        <Link
          href="/preview/resultado-teaser"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-terracota)] text-white text-sm font-bold"
        >
          Preview: Resultado Teaser
        </Link>
        <Link
          href="/preview/dashboard"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Preview: Dashboard
        </Link>
        <Link
          href="/preview/checkout-relatorio"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-terracota)] text-white text-sm font-bold"
        >
          Preview: Checkout Relatório
        </Link>
        <Link
          href="/preview/challenge-offer"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Preview: Oferta do Desafio
        </Link>
        <Link
          href="/preview/challenge-timeline"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Preview: Timeline do Desafio
        </Link>
        <Link
          href="/preview/challenge-complete"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Preview: Dia Concluído
        </Link>
        <Link
          href="/preview/relatorio"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-terracota)] text-white text-sm font-bold"
        >
          Preview: Relatório
        </Link>
        <Link
          href="/preview/desafio"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Preview: Dia do Desafio
        </Link>
      </div>
    </main>
  );
}
