import type { PillarResult } from '@/types/assessment';

type RankedPillars = {
  priorities: PillarResult[];
  strengths: PillarResult[];
  actionItems: PillarResult[];
};

function priorityScore(pillar: PillarResult) {
  return (1 - pillar.ratio) * pillar.peso;
}

function sortByPriority(a: PillarResult, b: PillarResult) {
  const scoreA = priorityScore(a);
  const scoreB = priorityScore(b);
  if (scoreB !== scoreA) return scoreB - scoreA;
  if (b.peso !== a.peso) return b.peso - a.peso;
  return a.ratio - b.ratio;
}

function sortByStrength(a: PillarResult, b: PillarResult) {
  if (b.ratio !== a.ratio) return b.ratio - a.ratio;
  if (b.peso !== a.peso) return b.peso - a.peso;
  return a.key.localeCompare(b.key);
}

export function rankPillars(pillars: PillarResult[]): RankedPillars {
  const available = pillars.filter((pillar) => !pillar.locked);

  const priorities = [...available].sort(sortByPriority).slice(0, 3);
  const strengths = [...available].sort(sortByStrength).slice(0, 3);
  const actionItems = [...available].filter((pillar) => pillar.level !== 'Alto').sort(sortByPriority).slice(0, 5);

  return { priorities, strengths, actionItems };
}
