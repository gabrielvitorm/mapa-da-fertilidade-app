import { redirect, notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { hoursUntilUnlock } from '@/lib/challenge-gating';
import { ChallengeCompleteClient } from '@/components/screens/ChallengeCompleteClient';
import type { ChallengeProgress as ChallengeProgressVM, DayCompletion } from '@/types/challenge';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

const TOTAL_DAYS = 7;

interface ConcluidoPageProps {
  params: Promise<{ dia: string }>;
}

export default async function DesafioConcluidoPage({ params }: ConcluidoPageProps) {
  const { dia } = await params;
  const dayNumber = Number(dia);
  if (!Number.isInteger(dayNumber)) notFound();

  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) redirect('/desafio/oferta');

  const entitlement = await db.entitlement.findFirst({
    where: { userId: user.id, type: 'CHALLENGE', status: 'ACTIVE' },
    orderBy: { grantedAt: 'desc' },
  });
  const trackLevel = (entitlement?.metadata as { track?: NivelGlobal } | null)?.track;
  if (!trackLevel) redirect('/dashboard');

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: trackLevel } });
  const progressRow = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });

  const dayCompletions =
    (progressRow.dayCompletions as unknown as Record<string, DayCompletion>) ?? {};
  const progressVM: ChallengeProgressVM = {
    trackLevel: track.level,
    currentDay: progressRow.currentDay,
    dayCompletions: Object.fromEntries(
      Object.entries(dayCompletions).map(([d, c]) => [Number(d), c])
    ),
  };

  const isLastDay = dayNumber >= TOTAL_DAYS;
  const hours = isLastDay
    ? 0
    : Math.ceil(hoursUntilUnlock(dayNumber + 1, progressVM, track));

  return (
    <ChallengeCompleteClient
      dayNumber={dayNumber}
      totalDays={TOTAL_DAYS}
      nivelGlobal={track.level}
      hoursUntilNextDay={hours}
      isLastDay={isLastDay}
    />
  );
}
