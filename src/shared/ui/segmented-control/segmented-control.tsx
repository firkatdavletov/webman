import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type SegmentedControlPrimitive = string | number | boolean;

type SegmentedControlOption<TValue extends SegmentedControlPrimitive> = {
  label: string;
  value: TValue;
  hint?: ReactNode;
};

type SegmentedControlProps<TValue extends SegmentedControlPrimitive> = {
  ariaLabel: string;
  className?: string;
  onValueChange: (value: TValue) => void;
  options: SegmentedControlOption<TValue>[];
  value: TValue;
};

function SegmentedControl<TValue extends SegmentedControlPrimitive>({
  ariaLabel,
  className,
  onValueChange,
  options,
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      className={cn(
        'inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-muted/60 p-1 sm:w-auto',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={String(option.value)}
            type="button"
            className={cn(
              'inline-flex min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all sm:flex-none',
              isActive
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
            onClick={() => onValueChange(option.value)}
            aria-pressed={isActive}
          >
            <span>{option.label}</span>
            {option.hint ? <span className="text-current/70">{option.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
export type { SegmentedControlOption, SegmentedControlProps };
