/**
 * Anel circular do score global (0–100), com ticks de faixa e legenda opcional.
 * O valor continua clampado e o SVG segue puro, sem dependências extras.
 */
const VIEWBOX_SIZE = 112;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const THRESHOLD_TICKS = [
  { value: 60, color: 'var(--color-brand-gold)' },
  { value: 80, color: 'var(--color-brand-sage)' },
] as const;

const THRESHOLD_BANDS = [
  { label: 'Semente', range: '<60', color: 'var(--color-brand-terracota)' },
  { label: 'Raízes', range: '60–80', color: 'var(--color-brand-gold)' },
  { label: 'Floração', range: '>80', color: 'var(--color-brand-sage)' },
] as const;

type ScoreRingProps = {
  score: number;
  showThresholds?: boolean;
};

function ThresholdTick({ value, color }: { value: number; color: string }) {
  return (
    <g transform={`rotate(${value * 3.6} ${CENTER} ${CENTER})`} aria-hidden="true">
      <line
        x1={CENTER}
        y1="5"
        x2={CENTER}
        y2="14"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </g>
  );
}

export function ScoreRing({ score, showThresholds = true }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-cream)]">
        <svg className="h-full w-full transform -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
          <circle
            cx="56"
            cy="56"
            r={RADIUS}
            fill="transparent"
            stroke="var(--color-border-soft)"
            strokeWidth="6"
          />
          <circle
            cx="56"
            cy="56"
            r={RADIUS}
            fill="transparent"
            stroke="var(--color-brand-terracota)"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="6"
          />
          {showThresholds && THRESHOLD_TICKS.map((tick) => (
            <ThresholdTick key={tick.value} value={tick.value} color={tick.color} />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-3xl font-extrabold text-[var(--color-brand-terracota)]">
            {Math.round(clamped)}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Score</span>
        </div>
      </div>

      {showThresholds && (
        <div className="flex max-w-[8.5rem] flex-col items-center gap-0.5 text-[9px] leading-none text-[var(--color-brand-brown)]/70">
          {THRESHOLD_BANDS.map((band) => (
            <span key={band.label} className="inline-flex items-center gap-1 whitespace-nowrap">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: band.color }}
                aria-hidden="true"
              />
              <span className="font-semibold" style={{ color: band.color }}>
                {band.label}
              </span>
              <span>({band.range})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
