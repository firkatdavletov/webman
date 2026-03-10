type OrderSearchProps = {
  searchQuery: string;
  activeSearchQuery: string;
  isSearching: boolean;
  disabled?: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onResetSearch: () => void;
};

export function OrderSearch({
  searchQuery,
  activeSearchQuery,
  isSearching,
  disabled = false,
  onSearchQueryChange,
  onSearch,
  onResetSearch,
}: OrderSearchProps) {
  const hasActiveSearch = Boolean(activeSearchQuery.trim());

  return (
    <section className="orders-search-block" aria-label="Поиск заказа">
      <form
        className="orders-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <div className="field">
          <label className="field-label" htmlFor="orders-search-input">
            Поиск заказа
          </label>
          <input
            id="orders-search-input"
            type="search"
            className="field-input"
            placeholder="Введите точный номер заказа"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            disabled={disabled || isSearching}
          />
        </div>

        <div className="orders-search-actions">
          <button type="submit" className="secondary-button" disabled={disabled || isSearching || !searchQuery.trim()}>
            {isSearching ? 'Поиск...' : 'Найти'}
          </button>
          {hasActiveSearch ? (
            <button type="button" className="secondary-button" onClick={onResetSearch} disabled={disabled || isSearching}>
              Сбросить поиск
            </button>
          ) : null}
        </div>
      </form>

      {hasActiveSearch ? <p className="catalog-results-meta">Активный поиск: {activeSearchQuery}</p> : null}
    </section>
  );
}
