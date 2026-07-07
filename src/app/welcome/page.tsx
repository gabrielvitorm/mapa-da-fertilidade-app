'use client';

import { useRouter } from 'next/navigation';
import { WelcomeView } from '@/components/screens/WelcomeView';

export default function WelcomePage() {
  const router = useRouter();
  return <WelcomeView onStart={() => router.push('/captura')} />;
}
