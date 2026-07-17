'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { REPORT_THEME } from '@/lib/report-theme';
import { PILLAR_SHORT_LABEL, type PillarResult } from '@/types/assessment';

type RadarDatum = {
  key: PillarResult['key'];
  label: string;
  value: number;
};

interface PillarRadarChartProps {
  pillars: PillarResult[];
}

export function PillarRadarChart({ pillars }: PillarRadarChartProps) {
  const data: RadarDatum[] = pillars.map((pillar) => ({
    key: pillar.key,
    label: PILLAR_SHORT_LABEL[pillar.key],
    value: Math.round(pillar.ratio * 100),
  }));

  return (
    <div className="w-full">
      <div className="mx-auto h-[270px] w-full max-w-[420px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%" margin={{ top: 12, right: 18, bottom: 12, left: 18 }}>
            <PolarGrid stroke={REPORT_THEME.borderSoft} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: REPORT_THEME.brown, fontSize: 10, fontWeight: 600 }}
              tickLine={false}
            />
            <Radar
              dataKey="value"
              stroke={REPORT_THEME.terracota}
              fill={REPORT_THEME.sage}
              fillOpacity={0.34}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
