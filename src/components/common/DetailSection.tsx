import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface DetailRow {
  label: string;
  value: ReactNode;
  wide?: boolean;
  mono?: boolean;
}

export interface DetailSectionProps {
  title?: string;
  rows: DetailRow[];
  columns?: 1 | 2 | 3;
  className?: string;
}

/** Label and value pairs for read-only record information. */
export function DetailSection({ title, rows, columns = 2, className }: DetailSectionProps) {
  return (
    <div className={className}>
      {title ? (
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{title}</h3>
      ) : null}
      <dl
        className={cn(
          'grid gap-x-8 gap-y-4',
          columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {rows.map((row) => (
          <div key={row.label} className={cn('min-w-0', row.wide && 'sm:col-span-full')}>
            <dt className="text-[12px] text-ink-faint">{row.label}</dt>
            <dd className={cn('mt-1 text-[13.5px] leading-relaxed text-ink', row.mono && 'code tabular')}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
