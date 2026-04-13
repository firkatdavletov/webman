import { SearchIcon } from 'lucide-react';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { SegmentedControl } from '@/shared/ui/segmented-control';

type ResourceFiltersProps = {
  activityAriaLabel: string;
  isActive: boolean;
  onIsActiveChange: (value: boolean) => void;
  onSearchQueryChange: (value: string) => void;
  searchId: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchQuery: string;
};

function ResourceFilters({
  activityAriaLabel,
  isActive,
  onIsActiveChange,
  onSearchQueryChange,
  searchId,
  searchLabel,
  searchPlaceholder,
  searchQuery,
}: ResourceFiltersProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[auto_minmax(18rem,22rem)] xl:items-end xl:justify-between">
      <SegmentedControl
        ariaLabel={activityAriaLabel}
        onValueChange={onIsActiveChange}
        options={[
          { label: 'Активные', value: true },
          { label: 'Неактивные', value: false },
        ]}
        value={isActive}
      />

      <FormField className="min-w-0" htmlFor={searchId} label={searchLabel}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            type="search"
            className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
      </FormField>
    </div>
  );
}

export { ResourceFilters };
