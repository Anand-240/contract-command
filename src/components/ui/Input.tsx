import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  prefix?: string;
}

const BASE =
  'h-9 w-full rounded-md border bg-surface px-2.5 text-[13.5px] text-ink transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint disabled:bg-surface-muted disabled:text-ink-faint';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, prefix, ...props },
  ref,
) {
  if (prefix) {
    return (
      <div
        className={cn(
          'flex items-center rounded-md border bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-tint',
          invalid ? 'border-critical-line' : 'border-line-strong',
          className,
        )}
      >
        <span className="pl-2.5 pr-1 font-mono text-[13px] text-ink-faint select-none">{prefix}</span>
        <input
          ref={ref}
          className="h-9 w-full rounded-r-md bg-transparent pr-2.5 text-[13.5px] text-ink tabular focus:outline-none"
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(BASE, invalid ? 'border-critical-line' : 'border-line-strong', className)}
      {...props}
    />
  );
});

export const DateInput = forwardRef<HTMLInputElement, InputProps>(function DateInput(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});
