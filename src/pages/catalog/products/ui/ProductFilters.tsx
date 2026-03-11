type ProductFiltersProps = {
  searchQuery: string;
  isActive: boolean;
  onSearchQueryChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
};

export function ProductFilters({ searchQuery, isActive, onSearchQueryChange, onIsActiveChange }: ProductFiltersProps) {
  return (
    <>
      <div className="catalog-status-toggle" role="group" aria-label="Фильтр товаров по активности">
        <button
          type="button"
          className={`catalog-status-toggle-button${isActive ? ' catalog-status-toggle-button-active' : ''}`}
          onClick={() => onIsActiveChange(true)}
          aria-pressed={isActive}
        >
          Активные
        </button>
        <button
          type="button"
          className={`catalog-status-toggle-button${!isActive ? ' catalog-status-toggle-button-active' : ''}`}
          onClick={() => onIsActiveChange(false)}
          aria-pressed={!isActive}
        >
          Неактивные
        </button>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="product-search">
          Поиск по названию
        </label>
        <input
          id="product-search"
          type="search"
          className="field-input"
          placeholder="Введите название товара"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>
    </>
  );
}
