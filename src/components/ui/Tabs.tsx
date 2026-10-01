import { cn } from '@/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-line', className)} role="tablist">
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onChange(item.id)}
              className={cn(
                'relative whitespace-nowrap border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150',
                selected
                  ? 'border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    'ml-1.5 rounded px-1 py-px text-[11px] tabular',
                    selected ? 'bg-brand-tint text-brand' : 'bg-surface-muted text-ink-faint',
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
