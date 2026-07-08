'use client';

import { useRouter } from 'next/navigation';
import { ChallengeTimelineView } from '@/components/screens/ChallengeTimelineView';
import type { ChallengeProgress, ChallengeTrack } from '@/types/challenge';

interface DayMeta {
  dayNumber: number;
  title: string;
}

interface ChallengeTimelineClientProps {
  track: ChallengeTrack;
  days: DayMeta[];
  progress: ChallengeProgress;
}

export function ChallengeTimelineClient({ track, days, progress }: ChallengeTimelineClientProps) {
  const router = useRouter();

  return (
    <ChallengeTimelineView
      track={track}
      days={days}
      progress={progress}
      onSelectDay={(dayNumber) => router.push(`/desafio/${dayNumber}`)}
      onBack={() => router.push('/dashboard')}
    />
  );
}
