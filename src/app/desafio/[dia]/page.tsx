import { redirect, notFound } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { isDayCompleted, isDayUnlocked } from '@/lib/challenge-gating';
import { ChallengePlayerClient } from '@/components/screens/ChallengePlayerClient';
import type { ChallengeProgress as ChallengeProgressVM, DayCompletion } from '@/types/challenge';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

interface DesafioDiaPageProps {
  params: Promise<{ dia: string }>;
}

export default async function DesafioDiaPage({ params }: DesafioDiaPageProps) {
  const { dia } = await params;
  const dayNumber = Number(dia);

  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (!hasChallenge) redirect('/dashboard');

  const entitlement = await db.entitlement.findFirst({
    where: { userId: user.id, type: 'CHALLENGE', status: 'ACTIVE' },
    orderBy: { grantedAt: 'desc' },
  });
  const trackLevel = (entitlement?.metadata as { track?: NivelGlobal } | null)?.track;
  if (!trackLevel) redirect('/dashboard');

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: trackLevel } });
  const day = await db.challengeDay.findUnique({
    where: { trackId_dayNumber: { trackId: track.id, dayNumber } },
    include: { messages: { orderBy: { ordem: 'asc' } } },
  });
  if (!day) notFound();

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

  const accessible =
    isDayCompleted(dayNumber, progressVM) ||
    isDayUnlocked(dayNumber, progressVM, { defaultCooldownHours: track.defaultCooldownHours });
  if (!accessible) redirect('/desafio');

  const lastSeenOrdem = (progressRow.lastSeenOrdem as Record<string, number>) ?? {};
  const initialVisibleCount = lastSeenOrdem[String(dayNumber)] ?? 0;

  return (
    <ChallengePlayerClient
      trackId={track.id}
      day={{
        dayNumber: day.dayNumber,
        isOnboarding: day.isOnboarding,
        messages: day.messages.map((m) => ({
          ordem: m.ordem,
          tipo: m.tipo,
          texto: m.texto ?? undefined,
          mediaKey: m.mediaKey ?? undefined,
          delayMs: m.delayMs,
        })),
      }}
      dayTitle={day.title}
      initialVisibleCount={initialVisibleCount}
    />
  );
}
