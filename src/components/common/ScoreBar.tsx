import { cn } from '@/utils';

export interface ScoreBarProps {
  label: string;
  score: number;
  max?: number;
  /** Shows the numeric band so the reading does not depend on bar length alone. */
  band?: boolean;
}

function bandFor(score: number): { label: string; tone: string } {
  if (score >= 85) return { label: 'Strong', tone: 'bg-positive' };
  if (score >= 70) return { label: 'Acceptable', tone: 'bg-brand' };
  if (score >= 55) return { label: 'Marginal', tone: 'bg-caution' };
  return { label: 'Below standard', tone: 'bg-critical' };
}

export function ScoreBar({ label, score, max = 100, band = true }: ScoreBarProps) {
  const { label: bandLabel, tone } = bandFor(score);
  const width = Math.max(Math.min((score / max) * 100, 100), 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink">{label}</span>
        <span className="text-[13px] font-semibold text-ink tabular">
          {score}
          <span className="text-[11.5px] font-normal text-ink-faint">/{max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', tone)}
          style={{ width: `${width}%` }}
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${score} out of ${max}, ${bandLabel}`}
        />
      </div>
      {band ? <p className="mt-1 text-[11.5px] text-ink-faint">{bandLabel}</p> : null}
    </div>
  );
}
