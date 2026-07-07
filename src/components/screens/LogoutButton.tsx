'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[11px] text-[var(--color-brand-brown)]/40 underline px-6 pb-8"
    >
      Sair
    </button>
  );
}
