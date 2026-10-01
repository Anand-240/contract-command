import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

export interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  activeCount?: number;
  className?: string;
}

/** One toolbar shape reused by every list page, so filters always behave alike. */
export function FilterBar({ children, onReset, activeCount = 0, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5', className)}>
      {children}
      {activeCount > 0 && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12.5px] text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        >
          <X size={12} aria-hidden />
          Clear {activeCount} {activeCount === 1 ? 'filter' : 'filters'}
        </button>
      ) : null}
    </div>
  );
}
