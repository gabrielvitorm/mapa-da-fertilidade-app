import { REPORT_THEME } from '@/lib/report-theme';
import type { PillarResult } from '@/types/assessment';

const LEVEL_COLORS: Record<PillarResult['level'], string> = {
  Alto: REPORT_THEME.sage,
  Moderado: REPORT_THEME.gold,
  Baixo: REPORT_THEME.terracota,
};

interface PillarScoreBarProps {
  pillar: PillarResult;
}

export function PillarScoreBar({ pillar }: PillarScoreBarProps) {
  const progress = Math.max(0, Math.min(100, Math.round(pillar.ratio * 100)));

  return (
    <div
      className="space-y-1.5"
      aria-label={`Barra de score do pilar ${pillar.label}: ${pillar.score} de ${pillar.max} pontos, nível ${pillar.level}`}
    >
      <div className="flex items-center justify-between gap-3 text-[10px] leading-none text-[var(--color-brand-brown)]/65">
        <span className="truncate">
          {pillar.score}/{pillar.max} pts
        </span>
        <span className="font-semibold">{progress}%</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border-soft)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: LEVEL_COLORS[pillar.level],
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
