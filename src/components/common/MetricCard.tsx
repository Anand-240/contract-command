import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils';

export interface MetricCardProps {
  label: string;
  value: string;
  /** Short context line: a comparison, a count, or the reason the figure matters. */
  note?: string;
  noteTone?: 'neutral' | 'caution' | 'critical';
  to?: string;
  children?: ReactNode;
}

/**
 * Restrained metric: label, figure, one line of context. No icon, no colour
 * block, so a row of these reads as a table rather than a wall of cards.
 */
export function MetricCard({ label, value, note, noteTone = 'neutral', to, children }: MetricCardProps) {
  const body = (
    <>
      <p className="text-[12px] font-medium text-ink-faint">{label}</p>
      <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-ink tabular">{value}</p>
      {note ? (
        <p
          className={cn(
            'mt-2 text-[12px]',
            noteTone === 'critical' ? 'text-critical' : noteTone === 'caution' ? 'text-caution' : 'text-ink-faint',
          )}
        >
          {note}
        </p>
      ) : null}
      {children}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block bg-surface px-4 py-3.5 transition-colors duration-150 hover:bg-surface-muted"
      >
        {body}
      </Link>
    );
  }

  return <div className="bg-surface px-4 py-3.5">{body}</div>;
}

/** Hairline grid that keeps metrics visually joined instead of floating apart. */
export function MetricRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px overflow-hidden rounded-lg border border-line bg-line">
      {children}
    </div>
  );
}
