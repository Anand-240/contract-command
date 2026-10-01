import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchService, type SearchHit } from '@/services';
import { useDebounced, useOnClickOutside } from '@/hooks';
import { useSession } from '@/hooks';
import { canAccessPath } from '@/constants';
import { cn } from '@/utils';

export function GlobalSearch() {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(term, 200);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { role } = useSession();
  const placeholder = role === 'vendor_manager' ? 'Search vendors and orders' : role === 'approver' ? 'Search plans, contracts and invoices' : 'Search contracts, vendors, orders and invoices';

  useOnClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    let active = true;
    if (debounced.trim().length < 2) {
      setHits([]);
      return;
    }
    searchService.query(debounced).then((results) => {
      if (active) setHits(results.filter((hit) => canAccessPath(role, hit.to)));
    });
    return () => {
      active = false;
    };
  }, [debounced, role]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const groups = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    (acc[hit.group] ??= []).push(hit);
    return acc;
  }, {});

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
    setTerm('');
  };

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label="Global search"
        className={cn(
          'h-8.5 w-full rounded-md border border-line bg-canvas py-1.5 pl-8 pr-14 text-[13px] text-ink',
          'transition-colors duration-150 focus:outline-none focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand-tint',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-faint sm:block">
        Ctrl K
      </kbd>

      {open && term.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-overlay">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-ink-faint">No records match {term}.</p>
          ) : (
            Object.entries(groups).map(([group, rows]) => (
              <div key={group} className="py-1">
                <p className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{group}</p>
                {rows.map((hit) => (
                  <button
                    key={hit.code}
                    type="button"
                    onClick={() => go(hit.to)}
                    className="flex w-full items-baseline gap-3 px-3 py-1.5 text-left transition-colors duration-150 hover:bg-surface-muted"
                  >
                    <span className="code shrink-0 font-medium text-ink">{hit.code}</span>
                    <span className="truncate text-[12.5px] text-ink-muted">{hit.title}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
