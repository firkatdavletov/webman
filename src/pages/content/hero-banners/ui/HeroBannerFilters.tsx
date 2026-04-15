import type { BannerStatus } from '@/entities/hero-banner';
import { Input } from '@/shared/ui';

type HeroBannerFiltersProps = {
  searchQuery: string;
  statusFilter: BannerStatus | '';
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: BannerStatus | '') => void;
};

const STATUS_OPTIONS: { value: BannerStatus | ''; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'PUBLISHED', label: 'Опубликованные' },
  { value: 'ARCHIVED', label: 'В архиве' },
];

const SELECT_CLASSNAME =
  'h-8 min-w-[10rem] rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

export function HeroBannerFilters({
  searchQuery,
  statusFilter,
  onSearchQueryChange,
  onStatusFilterChange,
}: HeroBannerFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        type="search"
        placeholder="Поиск по коду или заголовку..."
        value={searchQuery}
        className="h-8 w-64"
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />
      <select
        className={SELECT_CLASSNAME}
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as BannerStatus | '')}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
