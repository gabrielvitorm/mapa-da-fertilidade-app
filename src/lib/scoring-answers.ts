import type { PillarKey } from '@/types/assessment';

export interface AnsweredOption {
  pillar: PillarKey;
  rawScore: number;
}

export function computePillarScores(
  answeredOptions: AnsweredOption[],
  weights: Record<PillarKey, number>
): Record<PillarKey, number> {
  const rawSums: Partial<Record<PillarKey, number>> = {};
  for (const { pillar, rawScore } of answeredOptions) {
    rawSums[pillar] = (rawSums[pillar] ?? 0) + rawScore;
  }

  const result = {} as Record<PillarKey, number>;
  for (const pillar of Object.keys(weights) as PillarKey[]) {
    result[pillar] = (rawSums[pillar] ?? 0) * weights[pillar];
  }
  return result;
}
