import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon ? (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-muted text-ink-faint">
          <Icon size={18} aria-hidden />
        </span>
      ) : null}
      <h3 className="text-[15px] text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'This record could not be loaded',
  description = 'The request did not complete. Try again, and if the problem continues, raise a support ticket with the reference shown in the address bar.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)} role="alert">
      <h3 className="text-[15px] text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-muted">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-surface-muted"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
