'use client';

import { WelcomeView } from '@/components/screens/WelcomeView';

export default function WelcomePreviewPage() {
  return (
    <WelcomeView
      onStart={() => alert('Quiz iniciado! (placeholder — vai navegar para /quiz)')}
    />
  );
}
