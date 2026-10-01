import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui';
import { APPROVAL_DECISION, statusMeta } from '@/constants';
import { cn, formatDateTime, formatTime } from '@/utils';
import type { ApprovalEvent, AuditEntry } from '@/types';

/** Approval history: who acted, on what authority, with what remark. */
export function ApprovalTimeline({ events }: { events: ApprovalEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[13px] text-ink-faint">No approval activity has been recorded against this record.</p>;
  }

  return (
    <ol className="relative">
      {events.map((event, index) => {
        const last = index === events.length - 1;
        const pending = event.decision === 'pending';
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? <span className="absolute left-[5px] top-3 h-full w-px bg-line" aria-hidden /> : null}
            <span
              className={cn(
                'relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-surface',
                pending ? 'border-line-strong' : event.decision === 'approved' ? 'border-positive' : event.decision === 'rejected' ? 'border-critical' : 'border-brand',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13.5px] font-medium text-ink">{event.stage}</p>
                <StatusBadge meta={statusMeta(APPROVAL_DECISION, event.decision)} size="sm" withDot={false} />
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                {event.actor} <span className="text-ink-faint">({event.role})</span>
                {event.actedOn ? <span className="text-ink-faint"> on {formatDateTime(event.actedOn)}</span> : null}
              </p>
              {event.remarks ? (
                <p className="mt-1.5 border-l-2 border-line pl-2.5 text-[12.5px] leading-relaxed text-ink-muted">
                  {event.remarks}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Append only record trail. Rendered read only, with no edit affordance. */
export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-ink-faint">No audit entries have been written against this record yet.</p>;
  }

  return (
    <ol className="divide-y divide-line">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
          <span className="w-28 shrink-0 text-[12px] text-ink-faint tabular">{formatDateTime(entry.timestamp)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] text-ink">
              {entry.action}
              {entry.previousState || entry.newState ? (
                <span className="ml-2 text-[12.5px] text-ink-muted">
                  {entry.previousState ?? 'New'} <span className="text-ink-faint">to</span> {entry.newState ?? 'Removed'}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-faint">
              {entry.user} <span>({entry.role})</span>
            </p>
            {entry.detail ? <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{entry.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Compact activity feed for the dashboard. */
export function ActivityTimeline({ entries, linkFor }: { entries: AuditEntry[]; linkFor: (entry: AuditEntry) => string }) {
  return (
    <ol className="divide-y divide-line">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-baseline gap-3 px-4 py-2.5">
          <span className="w-10 shrink-0 text-[11.5px] text-ink-faint tabular">{formatTime(entry.timestamp)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink-muted">
              {entry.action}{' '}
              <Link
                to={linkFor(entry)}
                className="code font-medium text-ink hover:text-brand hover:underline underline-offset-2"
              >
                {entry.entityCode}
              </Link>
            </p>
            <p className="truncate text-[11.5px] text-ink-faint">{entry.user}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
