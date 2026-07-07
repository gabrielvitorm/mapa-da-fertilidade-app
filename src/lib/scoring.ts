import type { NivelGlobal, PillarKey, PillarLevel } from '@/types/assessment';

export interface ScoreRuleInput {
  pillar: PillarKey;
  peso: number;
  maxDoPilar: number;
}

export interface PontoAtencao {
  pillar: PillarKey;
  level: PillarLevel;
}

export interface AssessmentComputation {
  scoreTotal: number;
  resultadoFinal: number;
  nivelGlobal: NivelGlobal;
  pontosAtencao: PontoAtencao[];
}

function pillarLevel(score: number, max: number): PillarLevel {
  const ratio = score / max;
  if (ratio >= 0.8) return 'Alto';
  if (ratio >= 0.6) return 'Moderado';
  return 'Baixo';
}

function globalLevel(resultadoFinal: number): NivelGlobal {
  if (resultadoFinal > 80) return 'ALTA';
  if (resultadoFinal >= 60) return 'MODERADA';
  return 'BAIXA';
}

export function computeAssessment(
  pillarScores: Record<PillarKey, number>,
  rules: ScoreRuleInput[],
  scoreDenominator: number
): AssessmentComputation {
  const scoreTotal = rules.reduce((sum, r) => sum + (pillarScores[r.pillar] ?? 0), 0);
  const resultadoFinal = Number(((scoreTotal / scoreDenominator) * 100).toFixed(2));
  const nivelGlobal = globalLevel(resultadoFinal);
  const pontosAtencao: PontoAtencao[] = rules.map((r) => ({
    pillar: r.pillar,
    level: pillarLevel(pillarScores[r.pillar] ?? 0, r.maxDoPilar),
  }));

  return { scoreTotal, resultadoFinal, nivelGlobal, pontosAtencao };
}
