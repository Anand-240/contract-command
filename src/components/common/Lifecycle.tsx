import { Check } from 'lucide-react';
import { cn } from '@/utils';

export const LIFECYCLE_STAGES = [
  'Plan',
  'Contract',
  'Purchase Order',
  'Delivery',
  'Invoice',
  'Verification',
  'Approval',
  'Payment',
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export interface LifecycleProgressProps {
  /** Index of the stage currently in progress. Earlier stages read as complete. */
  current: number;
  /** Stage that is blocked, if any. Shown as held rather than complete. */
  blockedAt?: number;
  compact?: boolean;
  className?: string;
}

/**
 * The spine of the product: it answers where a case stands and what happens
 * next, in one line, on every record that belongs to a lifecycle.
 */
export function LifecycleProgress({ current, blockedAt, compact, className }: LifecycleProgressProps) {
  return (
    <ol className={cn('flex w-full items-stretch overflow-x-auto', className)}>
      {LIFECYCLE_STAGES.map((stage, index) => {
        const done = index < current;
        const active = index === current;
        const blocked = blockedAt === index;
        const state = blocked ? 'Held' : done ? 'Complete' : active ? 'In progress' : 'Not started';

        return (
          <li key={stage} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div
              className={cn(
                'h-1 rounded-full',
                blocked ? 'bg-critical' : done ? 'bg-positive' : active ? 'bg-brand' : 'bg-line',
                index > 0 && 'ml-0.5',
              )}
              aria-hidden
            />
            <div className="flex items-center gap-1 px-0.5">
              {done && !blocked ? <Check size={11} className="shrink-0 text-positive" aria-hidden /> : null}
              <span
                className={cn(
                  'truncate text-[11.5px]',
                  blocked ? 'font-medium text-critical' : active ? 'font-medium text-ink' : done ? 'text-ink-muted' : 'text-ink-faint',
                )}
              >
                {stage}
              </span>
            </div>
            {!compact ? (
              <span className="truncate px-0.5 text-[10.5px] uppercase tracking-wide text-ink-faint">{state}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
