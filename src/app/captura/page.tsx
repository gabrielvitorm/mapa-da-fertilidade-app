'use client';

import { useRouter } from 'next/navigation';
import { CaptureView, type CaptureData } from '@/components/screens/CaptureView';

const TOTAL_STEPS = 42; // 1 (captura) + 41 perguntas do quiz

export default function CapturaPage() {
  const router = useRouter();

  function handleSubmit(data: CaptureData) {
    sessionStorage.setItem('leadData', JSON.stringify(data));
    router.push('/quiz');
  }

  return (
    <CaptureView
      currentStep={1}
      totalSteps={TOTAL_STEPS}
      onSubmit={handleSubmit}
      onBack={() => router.push('/welcome')}
    />
  );
}
