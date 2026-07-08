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
      onUpsellClick={() => router.push('/desafio/oferta')}
    />
  );
}
