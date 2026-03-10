import type { CategoryImageFilter, CategoryStructureFilter } from '@/pages/catalog/categories/model/categoryPageView';

type CategoryFiltersProps = {
  searchQuery: string;
  structureFilter: CategoryStructureFilter;
  imageFilter: CategoryImageFilter;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onSearchQueryChange: (value: string) => void;
  onStructureFilterChange: (value: CategoryStructureFilter) => void;
  onImageFilterChange: (value: CategoryImageFilter) => void;
  onPageSizeChange: (value: number) => void;
};

export function CategoryFilters({
  searchQuery,
  structureFilter,
  imageFilter,
  pageSize,
  pageSizeOptions,
  onSearchQueryChange,
  onStructureFilterChange,
  onImageFilterChange,
  onPageSizeChange,
}: CategoryFiltersProps) {
  return (
    <div className="catalog-control-grid">
      <div className="field">
        <label className="field-label" htmlFor="category-search">
          Поиск
        </label>
        <input
          id="category-search"
          type="search"
          className="field-input"
          placeholder="Название, SKU, родитель или ID"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="category-structure-filter">
          Структура
        </label>
        <select
          id="category-structure-filter"
          className="field-input"
          value={structureFilter}
          onChange={(event) => onStructureFilterChange(event.target.value as CategoryStructureFilter)}
        >
          <option value="all">Все категории</option>
          <option value="root">Только корневые</option>
          <option value="branch">С дочерними</option>
          <option value="leaf">Только конечные</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="category-image-filter">
          Изображение
        </label>
        <select
          id="category-image-filter"
          className="field-input"
          value={imageFilter}
          onChange={(event) => onImageFilterChange(event.target.value as CategoryImageFilter)}
        >
          <option value="all">Все</option>
          <option value="with-image">С изображением</option>
          <option value="without-image">Без изображения</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="category-page-size">
          Размер страницы
        </label>
        <select
          id="category-page-size"
          className="field-input"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
