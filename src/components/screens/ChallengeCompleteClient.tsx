'use client';

import { useRouter } from 'next/navigation';
import { ChallengeCompleteView } from '@/components/screens/ChallengeCompleteView';
import type { NivelGlobal } from '@/types/assessment';

interface ChallengeCompleteClientProps {
  dayNumber: number;
  totalDays: number;
  nivelGlobal: NivelGlobal;
  hoursUntilNextDay: number;
  isLastDay: boolean;
}

export function ChallengeCompleteClient(props: ChallengeCompleteClientProps) {
  const router = useRouter();

  return (
    <ChallengeCompleteView
      {...props}
      onBackToTimeline={() => router.push('/desafio')}
    />
  );
}
