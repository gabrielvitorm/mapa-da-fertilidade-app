'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SimulatePaymentButtonProps {
  email: string;
  nome?: string;
  productSlug: string;
}

export function SimulatePaymentButton({ email, nome, productSlug }: SimulatePaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch('/api/checkout/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome, productSlug }),
    });

    if (!res.ok) {
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3 mt-3 bg-[var(--color-brand-sage)] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-opacity"
    >
      {loading ? 'Simulando...' : '[Demo] Simular pagamento aprovado'}
    </button>
  );
}
