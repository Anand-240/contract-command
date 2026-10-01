import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface PanelProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes body padding, for panels that hold a table. */
  flush?: boolean;
}

/** The standard bordered container. Header is optional so panels can nest quietly. */
export function Panel({ title, description, action, children, className, bodyClassName, flush }: PanelProps) {
  return (
    <section className={cn('panel', className)}>
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[12.5px] text-ink-faint">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn(flush ? '' : 'p-4', bodyClassName)}>{children}</div>
    </section>
  );
}
