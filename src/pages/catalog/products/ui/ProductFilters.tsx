import { ResourceFilters } from '@/shared/ui';

type ProductFiltersProps = {
  searchQuery: string;
  isActive: boolean;
  onSearchQueryChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
};

export function ProductFilters({ searchQuery, isActive, onSearchQueryChange, onIsActiveChange }: ProductFiltersProps) {
  return (
    <ResourceFilters
      activityAriaLabel="Фильтр товаров по активности"
      isActive={isActive}
      onIsActiveChange={onIsActiveChange}
      onSearchQueryChange={onSearchQueryChange}
      searchId="product-search"
      searchLabel="Поиск по названию"
      searchPlaceholder="Введите название товара"
      searchQuery={searchQuery}
    />
  );
}
