type CategoryFiltersProps = {
  searchQuery: string;
  isActive: boolean;
  onSearchQueryChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
};

export function CategoryFilters({ searchQuery, isActive, onSearchQueryChange, onIsActiveChange }: CategoryFiltersProps) {
  return (
    <>
      <div className="catalog-status-toggle" role="group" aria-label="Фильтр категорий по активности">
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
        <label className="field-label" htmlFor="category-search">
          Поиск по названию
        </label>
        <input
          id="category-search"
          type="search"
          className="field-input"
          placeholder="Введите название категории"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>
    </>
  );
}
