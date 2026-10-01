import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui';
import type { StatusMeta } from '@/constants';
import { cn } from '@/utils';

export interface HeaderFact {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export interface EntityHeaderProps {
  code: string;
  title: string;
  status: StatusMeta;
  secondaryStatus?: StatusMeta;
  facts: HeaderFact[];
  actions?: ReactNode;
}

/**
 * Detail page identity block: code, title, state and the handful of facts a
 * reader needs before acting. Facts sit in a row, not in separate cards.
 */
export function EntityHeader({ code, title, status, secondaryStatus, facts, actions }: EntityHeaderProps) {
  return (
    <div className="panel">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="code text-[12.5px] font-semibold tracking-tight text-ink-faint">{code}</span>
            <StatusBadge meta={status} size="sm" />
            {secondaryStatus ? <StatusBadge meta={secondaryStatus} size="sm" /> : null}
          </div>
          <h1 className="mt-1.5 text-[19px] font-semibold leading-snug text-ink">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {facts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line px-5 py-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{fact.label}</dt>
              <dd className={cn('mt-0.5 truncate text-[13.5px] text-ink', fact.mono && 'code tabular')}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
