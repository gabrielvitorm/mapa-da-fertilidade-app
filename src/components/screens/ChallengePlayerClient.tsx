'use client';

import { useRouter } from 'next/navigation';
import { ChallengePlayerView } from '@/components/screens/ChallengePlayerView';
import type { ChallengeDay, DevolutivaInput } from '@/types/challenge';

interface ChallengePlayerClientProps {
  trackId: string;
  day: ChallengeDay;
  dayTitle: string;
  initialVisibleCount: number;
}

export function ChallengePlayerClient({
  trackId,
  day,
  dayTitle,
  initialVisibleCount,
}: ChallengePlayerClientProps) {
  const router = useRouter();

  async function handleCompleteDay() {
    await fetch('/api/challenge/complete-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber }),
    });
    router.push(`/desafio/${day.dayNumber}/concluido`);
  }

  async function handleSubmitDevolutiva(input: DevolutivaInput) {
    await fetch('/api/challenge/devolutiva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  }

  function handleProgressChange(visibleCount: number) {
    void fetch('/api/challenge/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, dayNumber: day.dayNumber, ordem: visibleCount }),
    });
  }

  return (
    <ChallengePlayerView
      day={day}
      dayTitle={dayTitle}
      initialVisibleCount={initialVisibleCount}
      onBack={() => router.push('/desafio')}
      onCompleteDay={handleCompleteDay}
      onSubmitDevolutiva={handleSubmitDevolutiva}
      onProgressChange={handleProgressChange}
    />
  );
}
