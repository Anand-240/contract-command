import { useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOnClickOutside } from '@/hooks';
import { cn } from '@/utils';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  to?: string;
  onSelect?: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  separatorBefore?: boolean;
}

export interface DropdownProps {
  items: MenuItem[];
  trigger?: ReactNode;
  align?: 'left' | 'right';
  label?: string;
}

export function Dropdown({ items, trigger, align = 'right', label = 'Open menu' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-ink-faint',
          'transition-colors duration-150 hover:border-line hover:bg-surface-muted hover:text-ink',
          open && 'border-line bg-surface-muted text-ink',
        )}
      >
        {trigger ?? <MoreHorizontal size={16} aria-hidden />}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-1 min-w-52 rounded-md border border-line bg-surface py-1 shadow-overlay',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => {
            const content = (
              <>
                {item.icon ? <item.icon size={14} aria-hidden /> : null}
                {item.label}
              </>
            );
            const classes = cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors duration-150',
              item.tone === 'danger' ? 'text-critical hover:bg-critical-tint' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              item.disabled && 'pointer-events-none opacity-40',
            );

            return (
              <div key={item.label}>
                {item.separatorBefore ? <div className="my-1 border-t border-line" /> : null}
                {item.to ? (
                  <Link role="menuitem" to={item.to} className={classes} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <button
                    role="menuitem"
                    type="button"
                    className={classes}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect?.();
                    }}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
