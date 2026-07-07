'use client';

import { CaptureView } from '@/components/screens/CaptureView';

export default function CapturaPreviewPage() {
  return (
    <CaptureView
      currentStep={7}
      totalSteps={13}
      onSubmit={(data) => alert(`Dados capturados:\n${JSON.stringify(data, null, 2)}`)}
      onBack={() => alert('Voltar para a pergunta anterior')}
    />
  );
}
