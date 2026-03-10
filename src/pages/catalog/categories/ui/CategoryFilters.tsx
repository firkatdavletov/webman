type CategoryFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function CategoryFilters({ searchQuery, onSearchQueryChange }: CategoryFiltersProps) {
  return (
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
  );
}
