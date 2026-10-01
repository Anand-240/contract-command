import { cn } from '@/utils';
import { initialsOf } from '@/utils';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-tint font-medium text-brand',
        size === 'sm' ? 'h-6 w-6 text-[10.5px]' : 'h-8 w-8 text-[12px]',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
