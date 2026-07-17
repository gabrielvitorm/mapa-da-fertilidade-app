import type { AssessmentResult, PillarKey, PillarLevel, PillarResult } from '@/types/assessment';
import type { ScoreRuleInput } from './scoring';

interface PillarMessageInput {
  pillar: PillarKey;
  level: PillarLevel;
  diagnostico: string;
  recomendacao: string;
}

function pillarLevel(score: number, max: number): PillarLevel {
  const ratio = score / max;
  if (ratio >= 0.8) return 'Alto';
  if (ratio >= 0.6) return 'Moderado';
  return 'Baixo';
}

function assertValidPeso(peso: number, pillar: PillarKey): PillarResult['peso'] {
  if (peso === 1 || peso === 2 || peso === 3) {
    return peso;
  }

  throw new Error(`Peso inválido para ${pillar}: ${peso} — rode npm run db:seed`);
}

/**
 * Monta o AssessmentResult completo (13 pilares com diagnóstico e
 * recomendação reais) a partir do resultado já calculado por
 * computeAssessment + as pillarMessages cadastradas no banco.
 */
export function buildAssessmentResult(
  computation: { scoreTotal: number; resultadoFinal: number; nivelGlobal: AssessmentResult['nivelGlobal'] },
  pillarScores: Record<PillarKey, number>,
  rules: ScoreRuleInput[],
  pillarMessages: PillarMessageInput[],
  pillarLabels: Record<PillarKey, string>
): AssessmentResult {
  const messageByKey = new Map<string, PillarMessageInput>();
  for (const m of pillarMessages) {
    messageByKey.set(`${m.pillar}:${m.level}`, m);
  }

  const pillars: PillarResult[] = rules.map((rule) => {
    const score = pillarScores[rule.pillar] ?? 0;
    const max = rule.maxDoPilar;
    const ratio = Math.max(0, Math.min(1, score / max));
    const level = pillarLevel(score, max);
    const message = messageByKey.get(`${rule.pillar}:${level}`);
    if (!message) {
      throw new Error(`Faltando PillarMessage para ${rule.pillar}/${level} — rode npm run db:seed`);
    }
    return {
      key: rule.pillar,
      label: pillarLabels[rule.pillar],
      level,
      diagnostico: message.diagnostico,
      recomendacao: message.recomendacao,
      score,
      max,
      ratio,
      peso: assertValidPeso(rule.peso, rule.pillar),
    };
  });

  return {
    scoreTotal: computation.scoreTotal,
    resultadoFinal: computation.resultadoFinal,
    nivelGlobal: computation.nivelGlobal,
    pillars,
  };
}
