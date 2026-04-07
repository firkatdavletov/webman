import type { BannerStatus } from '@/entities/hero-banner';

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

export function HeroBannerFilters({
  searchQuery,
  statusFilter,
  onSearchQueryChange,
  onStatusFilterChange,
}: HeroBannerFiltersProps) {
  return (
    <div className="catalog-filter-bar">
      <input
        className="field-input catalog-search-input"
        type="search"
        placeholder="Поиск по коду или заголовку..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />

      <select
        className="field-input"
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
