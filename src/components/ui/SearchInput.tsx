import { Search, X } from 'lucide-react';
import { cn } from '@/utils';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search', className, ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={rest['aria-label'] ?? placeholder}
        className={cn(
          'h-9 w-full rounded-md border border-line-strong bg-surface pl-8 pr-8 text-[13.5px] text-ink',
          'transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <X size={13} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
