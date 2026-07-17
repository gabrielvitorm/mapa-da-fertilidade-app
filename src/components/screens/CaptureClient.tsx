'use client';

import { useRouter } from 'next/navigation';
import { CaptureView, type CaptureData } from '@/components/screens/CaptureView';

export function CaptureClient({ totalSteps }: { totalSteps?: number }) {
  const router = useRouter();

  function handleSubmit(data: CaptureData) {
    sessionStorage.setItem('leadData', JSON.stringify(data));
    router.push('/quiz');
  }

  return (
    <CaptureView
      currentStep={1}
      totalSteps={totalSteps}
      onSubmit={handleSubmit}
      onBack={() => router.push('/welcome')}
    />
  );
}
