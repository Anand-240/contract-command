import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '@/services';
import { useOnClickOutside } from '@/hooks';
import { cn, formatDateTime } from '@/utils';
import type { Notification, Tone } from '@/types';

const MARKER: Record<Tone, string> = {
  neutral: 'bg-ink-faint',
  info: 'bg-brand',
  positive: 'bg-positive',
  caution: 'bg-caution',
  critical: 'bg-critical',
};

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const hasOpened = useRef(false);
  useOnClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    notificationService.list()
      .then((rows) => { if (!hasOpened.current) setItems(rows); })
      .catch(() => { if (!hasOpened.current) setError('Could not load notifications.'); });
  }, []);

  const unread = items.filter((item) => !item.read).length;
  const togglePanel = () => {
    if (open) {
      setOpen(false);
      return;
    }
    hasOpened.current = true;
    setOpen(true);
    setError('');
    setItems((rows) => rows.map((item) => ({ ...item, read: true })));
    notificationService.markAllRead()
      .then(setItems)
      .catch(() => {
        setError('Could not mark notifications as read.');
        notificationService.list().then(setItems).catch(() => undefined);
      });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={togglePanel}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-ink-muted',
          'transition-colors duration-150 hover:border-line hover:bg-surface-muted hover:text-ink',
          open && 'border-line bg-surface-muted text-ink',
        )}
      >
        <Bell size={16} aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-ink-invert tabular">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-96 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-surface shadow-overlay">
          <header className="border-b border-line px-3.5 py-2.5">
            <h2 className="text-[13px] font-semibold text-ink">Notifications</h2>
          </header>
          {error ? <p role="alert" className="px-3.5 py-2 text-[12px] text-critical">{error}</p> : null}

          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.link}
                  onClick={() => setOpen(false)}
                  className="flex gap-2.5 px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
                >
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', MARKER[item.tone])} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn('text-[13px]', item.read ? 'text-ink-muted' : 'font-medium text-ink')}>
                        {item.title}
                      </span>
                      {!item.read ? <span className="sr-only">Unread</span> : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">{item.description}</span>
                    <span className="mt-1 block text-[11px] text-ink-faint">{formatDateTime(item.timestamp)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
