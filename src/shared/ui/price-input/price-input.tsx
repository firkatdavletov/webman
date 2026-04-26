import * as React from 'react';
import { formatMinorToPriceInput, parsePriceInputToMinor, sanitizePriceInput } from '@/shared/lib/money/price';
import { Input } from '@/shared/ui/input';

type PriceInputProps = Omit<React.ComponentProps<typeof Input>, 'inputMode' | 'onChange' | 'value'> & {
  normalizeOnBlur?: boolean;
  onValueChange: (value: string) => void;
  value: string;
};

const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  ({ normalizeOnBlur = true, onBlur, onValueChange, value, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        inputMode="decimal"
        value={value}
        onChange={(event) => onValueChange(sanitizePriceInput(event.target.value))}
        onBlur={(event) => {
          if (normalizeOnBlur) {
            const parsedValue = parsePriceInputToMinor(event.currentTarget.value);

            if (parsedValue !== null || !event.currentTarget.value.trim()) {
              onValueChange(formatMinorToPriceInput(parsedValue));
            }
          }

          onBlur?.(event);
        }}
        {...props}
      />
    );
  },
);

PriceInput.displayName = 'PriceInput';

export { PriceInput };
