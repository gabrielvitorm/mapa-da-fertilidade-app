import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { ChallengeTimelineClient } from '@/components/screens/ChallengeTimelineClient';
import type { ChallengeProgress as ChallengeProgressVM, DayCompletion } from '@/types/challenge';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function DesafioPage() {
  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) {
    redirect('/desafio/oferta');
  }

  const entitlement = await db.entitlement.findFirst({
    where: { userId: user.id, type: 'CHALLENGE', status: 'ACTIVE' },
    orderBy: { grantedAt: 'desc' },
  });
  const trackLevel = (entitlement?.metadata as { track?: NivelGlobal } | null)?.track;
  if (!trackLevel) {
    redirect('/dashboard');
  }

  const track = await db.challengeTrack.findUniqueOrThrow({
    where: { level: trackLevel },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });

  const progressRow = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
  });

  const dayCompletions =
    (progressRow.dayCompletions as unknown as Record<string, DayCompletion>) ?? {};
  const progressVM: ChallengeProgressVM = {
    trackLevel: track.level,
    currentDay: progressRow.currentDay,
    dayCompletions: Object.fromEntries(
      Object.entries(dayCompletions).map(([day, completion]) => [Number(day), completion])
    ),
  };

  return (
    <ChallengeTimelineClient
      track={{
        level: track.level,
        codename: track.codename,
        title: track.title,
        defaultCooldownHours: track.defaultCooldownHours,
      }}
      days={track.days.map((d) => ({ dayNumber: d.dayNumber, title: d.title }))}
      progress={progressVM}
    />
  );
}
