import { ResourceFilters } from '@/shared/ui';

type CategoryFiltersProps = {
  searchQuery: string;
  isActive: boolean;
  onSearchQueryChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
};

export function CategoryFilters({ searchQuery, isActive, onSearchQueryChange, onIsActiveChange }: CategoryFiltersProps) {
  return (
    <ResourceFilters
      activityAriaLabel="Фильтр категорий по активности"
      isActive={isActive}
      onIsActiveChange={onIsActiveChange}
      onSearchQueryChange={onSearchQueryChange}
      searchId="category-search"
      searchLabel="Поиск по названию"
      searchPlaceholder="Введите название категории"
      searchQuery={searchQuery}
    />
  );
}
