import { buildAssessmentResult } from './report-assembly';
import type { ScoreRuleInput } from './scoring';
import type { PillarKey } from '@/types/assessment';

const rules: ScoreRuleInput[] = [
  { pillar: 'sono', peso: 2, maxDoPilar: 20 },
  { pillar: 'estresse', peso: 3, maxDoPilar: 30 },
];

const pillarMessages = [
  { pillar: 'sono' as PillarKey, level: 'Alto' as const, diagnostico: 'Sono ótimo', recomendacao: 'Mantenha' },
  { pillar: 'sono' as PillarKey, level: 'Moderado' as const, diagnostico: 'Sono ok', recomendacao: 'Ajuste' },
  { pillar: 'sono' as PillarKey, level: 'Baixo' as const, diagnostico: 'Sono ruim', recomendacao: 'Priorize' },
  { pillar: 'estresse' as PillarKey, level: 'Alto' as const, diagnostico: 'Estresse alto controlado', recomendacao: 'Respire' },
  { pillar: 'estresse' as PillarKey, level: 'Moderado' as const, diagnostico: 'Estresse moderado', recomendacao: 'Pratique' },
  { pillar: 'estresse' as PillarKey, level: 'Baixo' as const, diagnostico: 'Estresse baixo controlado', recomendacao: 'Continue' },
];

const pillarLabels: Record<PillarKey, string> = {
  fatores_infertilidade: 'Fatores', saude_hormonal: 'Saúde Hormonal', ciclo: 'Ciclo',
  sono: 'Sono', imunidade: 'Imunidade', atividade_fisica: 'Atividade Física',
  alimentacao: 'Alimentação', saude_intestinal: 'Saúde Intestinal', figado: 'Fígado',
  estresse: 'Estresse', tireoide: 'Tireoide', toxinas: 'Toxinas', historico: 'Histórico',
};

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL: ${msg}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

// sono: score 18/20 = 0.9 -> Alto; estresse: score 15/30 = 0.5 -> Baixo
const pillarScores: Record<PillarKey, number> = { sono: 18, estresse: 15 } as Record<PillarKey, number>;

const result = buildAssessmentResult(
  { scoreTotal: 33, resultadoFinal: 68.07, nivelGlobal: 'MODERADA' },
  pillarScores,
  rules,
  pillarMessages,
  pillarLabels
);

assertEqual(result.scoreTotal, 33, 'scoreTotal passa direto');
assertEqual(result.resultadoFinal, 68.07, 'resultadoFinal passa direto');
assertEqual(result.nivelGlobal, 'MODERADA', 'nivelGlobal passa direto');
assertEqual(result.pillars.length, 2, 'um PillarResult por rule');

const sono = result.pillars.find((p) => p.key === 'sono')!;
assertEqual(sono.level, 'Alto', 'sono classifica Alto (0.9 >= 0.8)');
assertEqual(sono.diagnostico, 'Sono ótimo', 'sono pega o diagnostico certo pro nível Alto');
assertEqual(sono.label, 'Sono', 'sono usa o label correto');

const estresse = result.pillars.find((p) => p.key === 'estresse')!;
assertEqual(estresse.level, 'Baixo', 'estresse classifica Baixo (0.5 < 0.6)');
assertEqual(estresse.diagnostico, 'Estresse baixo controlado', 'estresse pega o diagnostico certo pro nível Baixo');

console.log('report-assembly.test.ts: all assertions passed');
