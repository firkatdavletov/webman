import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatModifierConstraints,
  type ModifierGroup,
  getAllModifierGroups,
} from '@/entities/modifier-group';
import { NavBar } from '@/shared/ui/NavBar';

function filterModifierGroups(modifierGroups: ModifierGroup[], searchQuery: string): ModifierGroup[] {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  if (!normalizedSearchQuery) {
    return modifierGroups;
  }

  return modifierGroups.filter((modifierGroup) => {
    const optionLookup = modifierGroup.options
      .map((option) => `${option.code} ${option.name}`.trim().toLowerCase())
      .join(' ');
    const groupLookup = `${modifierGroup.code} ${modifierGroup.name} ${optionLookup}`.trim().toLowerCase();

    return groupLookup.includes(normalizedSearchQuery);
  });
}

export function ModifierGroupsPage() {
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadModifierGroups = async (isActive: boolean, showInitialLoader = false) => {
    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const result = await getAllModifierGroups({
      isActive,
    });

    setModifierGroups(result.modifierGroups);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadModifierGroups(isActiveFilter, true);
  }, []);

  const filteredModifierGroups = useMemo(
    () => filterModifierGroups(modifierGroups, searchQuery),
    [modifierGroups, searchQuery],
  );

  const handleActivityFilterChange = (nextValue: boolean) => {
    if (nextValue === isActiveFilter) {
      return;
    }

    setIsActiveFilter(nextValue);
    void loadModifierGroups(nextValue);
  };

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Модификаторы</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading ? 'Загрузка модификаторов...' : `${isActiveFilter ? 'Активные' : 'Неактивные'}: ${modifierGroups.length} групп`}
            </span>
            <Link className="secondary-link" to="/modifier-groups/new">
              Добавить группу
            </Link>
            <Link className="secondary-link" to="/modifier-import">
              Импорт CSV
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadModifierGroups(isActiveFilter)}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <section className="catalog-card catalog-data-card" aria-label="Группы модификаторов">
          <div className="catalog-section-header">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Справочник</p>
              <h3 className="catalog-card-title">Группы модификаторов</h3>
              <p className="catalog-card-text">Управляйте наборами опций, которые можно подключать к карточкам товаров.</p>
            </div>
          </div>

          <div className="catalog-controls">
            <div className="catalog-control-grid">
              <div className="field">
                <label className="field-label" htmlFor="modifier-group-search">
                  Поиск
                </label>
                <input
                  id="modifier-group-search"
                  className="field-input"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск по code, названию или опциям"
                />
              </div>
            </div>

            <div className="catalog-status-toggle" role="tablist" aria-label="Фильтр активности групп модификаторов">
              <button
                type="button"
                className={`catalog-status-toggle-button${isActiveFilter ? ' catalog-status-toggle-button-active' : ''}`}
                aria-pressed={isActiveFilter}
                onClick={() => handleActivityFilterChange(true)}
              >
                Активные
              </button>
              <button
                type="button"
                className={`catalog-status-toggle-button${!isActiveFilter ? ' catalog-status-toggle-button-active' : ''}`}
                aria-pressed={!isActiveFilter}
                onClick={() => handleActivityFilterChange(false)}
              >
                Неактивные
              </button>
            </div>

            <p className="catalog-results-meta">
              {filteredModifierGroups.length ? `Найдено ${filteredModifierGroups.length} групп` : 'Группы модификаторов не найдены'}
            </p>
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="catalog-empty-state">Загрузка справочника модификаторов...</p>
          ) : filteredModifierGroups.length ? (
            <div className="products-table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Название</th>
                    <th scope="col">Опций</th>
                    <th scope="col">Правила выбора</th>
                    <th scope="col">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModifierGroups.map((modifierGroup) => (
                    <tr key={modifierGroup.id}>
                      <td className="products-cell-muted">{modifierGroup.code}</td>
                      <td>
                        <Link className="product-table-title-link" to={`/modifier-groups/${modifierGroup.id}`}>
                          {modifierGroup.name}
                        </Link>
                      </td>
                      <td className="products-cell-muted">{modifierGroup.options.length}</td>
                      <td className="products-cell-muted">{formatModifierConstraints(modifierGroup)}</td>
                      <td className="products-cell-muted">{modifierGroup.isActive ? 'Активна' : 'Выключена'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="catalog-empty-state">В выбранном статусе групп модификаторов пока нет.</p>
          )}
        </section>
      </main>
    </div>
  );
}
