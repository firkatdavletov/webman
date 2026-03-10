type ProductFiltersProps = {
  searchQuery: string;
  categoryFilter: string;
  unitFilter: string;
  pageSize: number;
  categoryOptions: Array<[string, string]>;
  unitOptions: string[];
  pageSizeOptions: readonly number[];
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
};

export function ProductFilters({
  searchQuery,
  categoryFilter,
  unitFilter,
  pageSize,
  categoryOptions,
  unitOptions,
  pageSizeOptions,
  onSearchQueryChange,
  onCategoryFilterChange,
  onUnitFilterChange,
  onPageSizeChange,
}: ProductFiltersProps) {
  return (
    <div className="catalog-control-grid">
      <div className="field">
        <label className="field-label" htmlFor="product-search">
          Поиск
        </label>
        <input
          id="product-search"
          type="search"
          className="field-input"
          placeholder="Название, SKU, категория, описание или ID"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="product-category-filter">
          Категория
        </label>
        <select
          id="product-category-filter"
          className="field-input"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
        >
          <option value="all">Все категории</option>
          {categoryOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="product-unit-filter">
          Единица
        </label>
        <select
          id="product-unit-filter"
          className="field-input"
          value={unitFilter}
          onChange={(event) => onUnitFilterChange(event.target.value)}
        >
          <option value="all">Все единицы</option>
          {unitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="product-page-size">
          Размер страницы
        </label>
        <select
          id="product-page-size"
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
