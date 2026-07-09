import { db } from '@/lib/db';

export async function completeDay(userId: string, trackId: string, dayNumber: number): Promise<void> {
  const progress = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId, trackId } },
  });

  const dayCompletions = (progress.dayCompletions as Record<string, { completedAt: string }>) ?? {};
  dayCompletions[String(dayNumber)] = { completedAt: new Date().toISOString() };

  await db.challengeProgress.update({
    where: { userId_trackId: { userId, trackId } },
    data: {
      dayCompletions: dayCompletions as unknown as object,
      currentDay: Math.max(progress.currentDay, dayNumber + 1),
    },
  });
}

export async function updateLastSeenOrdem(
  userId: string,
  trackId: string,
  dayNumber: number,
  ordem: number
): Promise<void> {
  const progress = await db.challengeProgress.findUniqueOrThrow({
    where: { userId_trackId: { userId, trackId } },
  });

  const lastSeenOrdem = (progress.lastSeenOrdem as Record<string, number>) ?? {};
  lastSeenOrdem[String(dayNumber)] = ordem;

  await db.challengeProgress.update({
    where: { userId_trackId: { userId, trackId } },
    data: { lastSeenOrdem: lastSeenOrdem as unknown as object },
  });
}

export interface SubmitDevolutivaInput {
  userId: string;
  dayNumber: number;
  texto: string;
}

export async function submitDevolutiva(input: SubmitDevolutivaInput): Promise<void> {
  await db.devolutiva.create({
    data: {
      userId: input.userId,
      dayNumber: input.dayNumber,
      texto: input.texto,
    },
  });
}
