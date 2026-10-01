import { cn } from '@/utils';

export function Logo({ showWordmark = true, className }: { showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
          <path d="M8 1.6 13.6 4v4.2c0 3-2.3 5.3-5.6 6.2-3.3-.9-5.6-3.2-5.6-6.2V4L8 1.6Z" />
          <path d="M5.6 8.1 7.3 9.8l3.2-3.4" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-[14.5px] font-semibold tracking-tight text-ink">ContractCommand</span>
      ) : null}
    </span>
  );
}
