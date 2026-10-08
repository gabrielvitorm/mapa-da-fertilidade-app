import checklistSource from '../../../../prisma/seed-data/checklist-v2.json';
import { computeChecklist } from '@/lib/checklist-scoring';
import { buildChecklistReport } from '@/lib/checklist-report';
import { FAVORABLE_ANSWERS, INTERMEDIATE_ANSWERS } from '@/lib/checklist-sample-answers';
import type { ChecklistAnswers, ChecklistReport, ChecklistTexts } from '@/types/checklist';

const texts: ChecklistTexts = Object.fromEntries(
  (checklistSource.texts as { key: string; title?: string; body: string }[]).map((t) => [
    t.key,
    { title: t.title ?? null, body: t.body },
  ])
);

/** Um cenário por classificação, para revisar a tela sem banco (?perfil=...). */
const SCENARIOS: Record<string, ChecklistAnswers> = {
  favoravel: FAVORABLE_ANSWERS,
  intermediario: INTERMEDIATE_ANSWERS,
  alta: {
    ...INTERMEDIATE_ANSWERS,
    idade: ['35_39'],
    tempo_tentativa: ['gte12'],
    ciclo_duracao: ['gt35'],
    amh: ['lt1'],
    cfa: ['5_7'],
    avaliacao_trompas: ['pervias'],
    achados_pelvicos: ['endometrioma'],
    espermograma: ['alterado'],
  },
  inconclusivo: {
    ...INTERMEDIATE_ANSWERS,
    idade: ['35_39'],
    tempo_tentativa: ['lt6'],
    espermograma: ['nao'],
    riscos_masculinos: ['varicocele'],
  },
};

export function sampleChecklistReport(perfil: string | undefined): ChecklistReport {
  const answers = SCENARIOS[perfil ?? ''] ?? INTERMEDIATE_ANSWERS;
  return buildChecklistReport(computeChecklist(answers), texts);
}
