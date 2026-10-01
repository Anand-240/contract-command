import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border bg-surface px-2.5 py-2 text-[13.5px] leading-relaxed text-ink',
        'transition-colors duration-150 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint',
        invalid ? 'border-critical-line' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  );
});
