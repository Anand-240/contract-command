import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils';

export interface ChoiceProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(function Checkbox(
  { label, description, className, id, ...props },
  ref,
) {
  return (
    <label htmlFor={id} className={cn('flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-line-strong text-brand accent-[var(--color-brand)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] text-ink">{label}</span>
        {description ? <span className="block text-[12px] text-ink-faint">{description}</span> : null}
      </span>
    </label>
  );
});

export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(function Radio(
  { label, description, className, id, ...props },
  ref,
) {
  return (
    <label htmlFor={id} className={cn('flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <input
        ref={ref}
        id={id}
        type="radio"
        className="mt-0.5 h-4 w-4 shrink-0 border-line-strong accent-[var(--color-brand)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] text-ink">{label}</span>
        {description ? <span className="block text-[12px] text-ink-faint">{description}</span> : null}
      </span>
    </label>
  );
});
