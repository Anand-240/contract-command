import type { ReactNode } from 'react';
import { cn } from '@/utils';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A form section is a heading with its fields, separated by a rule. Fields are
 * not wrapped in individual cards, which keeps long forms readable.
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('grid gap-6 border-b border-line px-5 py-6 last:border-b-0 lg:grid-cols-[220px_1fr]', className)}>
      <div>
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Sticky action bar for long forms, so save and cancel stay reachable. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
      {children}
    </div>
  );
}
