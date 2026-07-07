/**
 * Anel circular do score global (0–100), portado do protótipo do AI Studio.
 * No original o valor (75) e o stroke-dashoffset eram fixos; aqui ambos
 * derivam de `score` real.
 */
export function ScoreRing({ score }: { score: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius; // ~301.59, igual ao valor fixo do protótipo
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center bg-[var(--color-surface-cream)] rounded-full border border-[var(--color-border-soft)]">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="transparent"
          stroke="var(--color-border-soft)"
          strokeWidth="6"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="transparent"
          stroke="var(--color-brand-terracota)"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="6"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl font-extrabold text-[var(--color-brand-terracota)]">
          {Math.round(clamped)}
        </span>
        <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Score</span>
      </div>
    </div>
  );
}
