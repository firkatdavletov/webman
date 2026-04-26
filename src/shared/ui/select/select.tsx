import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(({ className, children, ...props }, ref) => (
  <span className="relative block w-full">
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        'h-11 w-full min-w-0 appearance-none rounded-xl border border-input bg-background/80 py-1 pr-11 pl-3 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60 dark:bg-input/30 dark:disabled:bg-input/80',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDownIcon
      className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
  </span>
));

Select.displayName = 'Select';

export { Select };
