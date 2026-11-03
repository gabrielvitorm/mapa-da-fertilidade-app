'use client';

import { useRouter } from 'next/navigation';
import { ReportView } from '@/components/screens/ReportView';
import type { AssessmentResult } from '@/types/assessment';

interface ReportClientProps {
  result: AssessmentResult;
}

export function ReportClient({ result }: ReportClientProps) {
  const router = useRouter();

  return (
    <ReportView
      result={result}
      onBack={() => router.push('/dashboard')}
      onPrintClick={() => {
        // Esta rota devolve um PDF binário; navegação de documento é intencional.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/relatorio/pdf');
      }}
      onUpsellClick={() => router.push('/desafio/oferta')}
    />
  );
}
