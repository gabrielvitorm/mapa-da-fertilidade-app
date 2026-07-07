import type { ChallengeProgress, ChallengeTrack } from '@/types/challenge';

/**
 * Gating híbrido: Dia N+1 abre quando o Dia N está concluído E já passou
 * o cooldown. Ver docs/04-motor-do-desafio.md.
 */
export function isDayUnlocked(
  day: number,
  progress: ChallengeProgress,
  track: Pick<ChallengeTrack, 'defaultCooldownHours'>,
  now: Date = new Date()
): boolean {
  if (day <= 1) return true; // onboarding (0) e dia 1 sempre abertos ao ativar

  const prev = progress.dayCompletions[day - 1];
  if (!prev?.completedAt) return false;

  const cooldownHours = track.defaultCooldownHours;
  const elapsedHours = (now.getTime() - new Date(prev.completedAt).getTime()) / 36e5;
  return elapsedHours >= cooldownHours;
}

export function hoursUntilUnlock(
  day: number,
  progress: ChallengeProgress,
  track: Pick<ChallengeTrack, 'defaultCooldownHours'>,
  now: Date = new Date()
): number {
  const prev = progress.dayCompletions[day - 1];
  if (!prev?.completedAt) return Infinity;
  const elapsedHours = (now.getTime() - new Date(prev.completedAt).getTime()) / 36e5;
  return Math.max(0, track.defaultCooldownHours - elapsedHours);
}

export function isDayCompleted(day: number, progress: ChallengeProgress): boolean {
  return Boolean(progress.dayCompletions[day]?.completedAt);
}
