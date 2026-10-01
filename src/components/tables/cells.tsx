import { Link } from 'react-router-dom';
import { cn, formatDate, formatMoney, relativeDays, daysUntil } from '@/utils';
import type { Currency } from '@/types';

/** Entity identifier. Monospaced so codes line up, and the keyboard route into the record. */
export function CodeCell({ code, to, muted }: { code: string; to?: string; muted?: boolean }) {
  const classes = cn('code font-medium', muted ? 'text-ink-muted' : 'text-ink');
  return to ? (
    <Link to={to} className={cn(classes, 'hover:text-brand hover:underline underline-offset-2')} onClick={(e) => e.stopPropagation()}>
      {code}
    </Link>
  ) : (
    <span className={classes}>{code}</span>
  );
}

export function TitleCell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-w-0 max-w-56">
      <p className="truncate text-[13.5px] text-ink">{title}</p>
      {subtitle ? <p className="truncate text-[12px] text-ink-faint">{subtitle}</p> : null}
    </div>
  );
}

export function MoneyCell({ value, currency = 'INR' }: { value: number; currency?: Currency }) {
  return <span className="tabular text-ink">{formatMoney(value, currency)}</span>;
}

export function DateCell({ value }: { value: string | null }) {
  return <span className="tabular whitespace-nowrap">{formatDate(value)}</span>;
}

/** Date with a deadline reading, so an overdue row states the fact rather than relying on colour. */
export function DueCell({ value }: { value: string }) {
  const days = daysUntil(value);
  return (
    <div className="whitespace-nowrap">
      <p className="tabular text-ink">{formatDate(value)}</p>
      <p className={cn('text-[11.5px]', days < 0 ? 'text-critical' : days <= 7 ? 'text-caution' : 'text-ink-faint')}>
        {relativeDays(value)}
      </p>
    </div>
  );
}
