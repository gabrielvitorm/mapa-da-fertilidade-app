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
    const level = pillarLevel(pillarScores[rule.pillar] ?? 0, rule.maxDoPilar);
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
    };
  });

  return {
    scoreTotal: computation.scoreTotal,
    resultadoFinal: computation.resultadoFinal,
    nivelGlobal: computation.nivelGlobal,
    pillars,
  };
}
