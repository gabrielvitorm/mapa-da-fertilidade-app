import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-serif text-2xl font-bold text-[var(--color-brand-brown)]">
        Mapa da Fertilidade
      </h1>
      <p className="text-sm text-[var(--color-brand-brown)]/70 max-w-sm">
        Comece o funil real ou entre com a conta demo.
      </p>
      <div className="flex flex-col gap-2 mt-2">
        <Link
          href="/welcome"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Funil real: Boas-vindas
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-sage)] text-white text-sm font-bold"
        >
          Funil real: Login
        </Link>
      </div>
    </main>
  );
}
