import {
  CHECKLIST_PILLAR_LABEL,
  CLASSIFICATION_LABEL,
  PILLAR_STATUS_LABEL,
  type ChecklistComputation,
  type ChecklistPillarResult,
  type ChecklistReport,
  type ChecklistReportPillar,
  type ChecklistTexts,
} from '@/types/checklist';

function text(texts: ChecklistTexts, key: string) {
  const entry = texts[key];
  if (!entry) {
    throw new Error(`Faltando ChecklistText "${key}" — rode npm run db:seed`);
  }
  return entry;
}

function optionalText(texts: ChecklistTexts, key: string, fallbackKey: string) {
  return (texts[key] ?? text(texts, fallbackKey)).body;
}

/**
 * Próximo passo do pilar, em ordem de especificidade:
 * 1. `next.<achado>` quando o achado principal pede conduta própria (ex.: SOMP já diagnosticada);
 * 2. texto do nível: favorável (0), atenção (1), frase do manual (2–3), ND ou NA;
 * 3. a frase do manual `pillar.<pilar>` como fallback.
 */
function nextStep(p: ChecklistPillarResult, texts: ChecklistTexts): string {
  const top = p.findings[0];
  if (top && texts[`next.${top.key}`]) return texts[`next.${top.key}`].body;

  const base = `pillar.${p.pillar}`;
  if (p.status === 0) return optionalText(texts, `pillar_favoravel.${p.pillar}`, base);
  if (p.status === 1) return optionalText(texts, `pillar_atencao.${p.pillar}`, base);
  if (p.status === 'NA') return optionalText(texts, `pillar_na.${p.pillar}`, base);
  if (p.status === 'ND') return optionalText(texts, `pillar_nd.${p.pillar}`, base);
  return text(texts, base).body;
}

function priorityRank(p: ChecklistReportPillar) {
  return typeof p.status === 'number' ? p.status : -1;
}

function countStatuses(pillars: ChecklistReportPillar[]): ChecklistReport['statusCounts'] {
  const counts: ChecklistReport['statusCounts'] = { '0': 0, '1': 0, '2': 0, '3': 0, ND: 0, NA: 0 };
  for (const p of pillars) counts[`${p.status}`] += 1;
  return counts;
}

export function buildChecklistReport(computation: ChecklistComputation, texts: ChecklistTexts): ChecklistReport {
  const pillars: ChecklistReportPillar[] = computation.pillars.map((p) => {
    return {
      key: p.pillar,
      label: CHECKLIST_PILLAR_LABEL[p.pillar],
      status: p.status,
      statusLabel: PILLAR_STATUS_LABEL[`${p.status}`],
      critical: p.critical,
      findings: p.findings.map((f) => {
        const t = text(texts, `finding.${f.key}`);
        return { key: f.key, points: f.points, title: t.title ?? '', body: t.body };
      }),
      nextStep: nextStep(p, texts),
    };
  });

  // Ordem estável: pontos desc, críticos primeiro, depois a ordem dos pilares.
  const priorities = pillars
    .filter((p) => priorityRank(p) >= 1)
    .map((p, index) => ({ p, index }))
    .sort((a, b) => priorityRank(b.p) - priorityRank(a.p) || Number(b.p.critical) - Number(a.p.critical) || a.index - b.index)
    .slice(0, 3)
    .map(({ p }) => p);

  const locks = computation.locks.map((key) => {
    const t = texts[`finding.${key}`] ?? text(texts, `lock.${key}`);
    return { key, title: t.title ?? '', body: t.body };
  });

  return {
    classification: computation.classification,
    classificationLabel: CLASSIFICATION_LABEL[computation.classification],
    classificationText: text(texts, `classification.${computation.classification}`).body,
    completeness: computation.completeness,
    total: computation.total,
    locks,
    missingData: computation.missingData.map((key) => ({
      key,
      label: CHECKLIST_PILLAR_LABEL[key],
      text: optionalText(texts, `pillar_nd.${key}`, `pillar.${key}`),
    })),
    statusCounts: countStatuses(pillars),
    findingsCount: pillars.reduce((n, p) => n + p.findings.filter((f) => f.points > 0).length, 0),
    priorities,
    favorables: pillars.filter((p) => p.status === 0),
    pillars,
    closing: text(texts, 'closing').body,
    disclaimer: text(texts, 'disclaimer').body,
  };
}
