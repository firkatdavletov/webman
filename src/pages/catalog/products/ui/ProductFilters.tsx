type ProductFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function ProductFilters({ searchQuery, onSearchQueryChange }: ProductFiltersProps) {
  return (
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
  );
}
