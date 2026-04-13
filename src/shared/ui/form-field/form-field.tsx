import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type FormFieldProps = {
  children: ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
  className?: string;
  labelClassName?: string;
  description?: ReactNode;
};

function FormField({ children, error, htmlFor, label, className, labelClassName, description }: FormFieldProps) {
  return (
    <div className={cn('grid gap-2.5', className)}>
      <label className={cn('text-sm font-medium text-foreground', labelClassName)} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
