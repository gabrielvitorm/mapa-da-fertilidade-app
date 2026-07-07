'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Não foi possível entrar');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--color-surface-cream)] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--color-border-soft)] p-6 flex flex-col gap-4">
        <div>
          <h1 className="font-serif italic text-xl font-bold text-[var(--color-brand-brown)]">
            Entrar
          </h1>
          <p className="text-xs text-[var(--color-brand-brown)]/60 mt-1">
            Use o e-mail da sua conta pra acessar seu relatório.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-soft)] text-sm bg-white text-[var(--color-brand-brown)] placeholder:text-[var(--color-brand-brown)]/35 outline-none focus:border-[var(--color-brand-terracota)]/60"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[var(--color-brand-terracota)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-opacity"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
