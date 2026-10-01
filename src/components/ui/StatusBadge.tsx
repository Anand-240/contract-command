import { cn } from '@/utils';
import type { Tone } from '@/types';
import type { StatusMeta } from '@/constants';

const TONES: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-surface-muted text-ink-muted border-line-strong', dot: 'bg-ink-faint' },
  info: { chip: 'bg-brand-tint text-brand border-brand-line', dot: 'bg-brand' },
  positive: { chip: 'bg-positive-tint text-positive border-positive-line', dot: 'bg-positive' },
  caution: { chip: 'bg-caution-tint text-caution border-caution-line', dot: 'bg-caution' },
  critical: { chip: 'bg-critical-tint text-critical border-critical-line', dot: 'bg-critical' },
};

export interface StatusBadgeProps {
  meta: StatusMeta;
  /** The dot is decorative. The label always carries the meaning. */
  withDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ meta, withDot = true, size = 'md', className }: StatusBadgeProps) {
  const tone = TONES[meta.tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[12px]',
        tone.chip,
        className,
      )}
    >
      {withDot ? <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} aria-hidden /> : null}
      {meta.label}
    </span>
  );
}
