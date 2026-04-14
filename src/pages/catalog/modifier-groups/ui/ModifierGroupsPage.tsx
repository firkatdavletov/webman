import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { type ModifierGroup, formatModifierConstraints, getAllModifierGroups } from '@/entities/modifier-group';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
  LazyDataTable,
  ResourceFilters,
  buttonVariants,
} from '@/shared/ui';

function filterModifierGroups(modifierGroups: ModifierGroup[], searchQuery: string): ModifierGroup[] {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  if (!normalizedSearchQuery) {
    return modifierGroups;
  }

  return modifierGroups.filter((modifierGroup) => {
    const groupLookup = `${modifierGroup.code} ${modifierGroup.name}`.trim().toLowerCase();

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
  const requestIdRef = useRef(0);

  const loadModifierGroups = async ({ showInitialLoader = false, isActive = isActiveFilter }: { showInitialLoader?: boolean; isActive?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getAllModifierGroups({
      isActive,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    setModifierGroups(result.modifierGroups);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadModifierGroups({
      showInitialLoader: true,
      isActive: isActiveFilter,
    });
  }, []);

  const handleActivityFilterChange = (nextValue: boolean) => {
    if (nextValue === isActiveFilter) {
      return;
    }

    setIsActiveFilter(nextValue);
    setSearchQuery('');

    void loadModifierGroups({
      isActive: nextValue,
    });
  };

  const filteredModifierGroups = useMemo(
    () => filterModifierGroups(modifierGroups, searchQuery),
    [modifierGroups, searchQuery],
  );

  const sortedModifierGroups = useMemo(
    () => [...filteredModifierGroups].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'ru')),
    [filteredModifierGroups],
  );

  const columns = useMemo<ColumnDef<ModifierGroup>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
      },
      {
        id: 'name',
        header: 'Название',
        cell: ({ row }) => (
          <Link
            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            to={`/modifier-groups/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'constraints',
        header: 'Правила выбора',
        cell: ({ row }) => <span className="text-muted-foreground">{formatModifierConstraints(row.original)}</span>,
      },
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.sortOrder}</span>,
      },
      {
        id: 'status',
        header: 'Статус',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-1 text-xs font-medium',
              row.original.isActive ? 'border-emerald-300/80 bg-emerald-50 text-emerald-700' : 'border-border/80 bg-muted/50 text-muted-foreground',
            )}
          >
            {row.original.isActive ? 'Активна' : 'Выключена'}
          </span>
        ),
      },
    ],
    [],
  );

  const statusText = isLoading
    ? 'Загрузка модификаторов...'
    : `${isActiveFilter ? 'Активные' : 'Неактивные'}: ${modifierGroups.length} групп`;
  const resultsMeta = sortedModifierGroups.length
    ? `Найдено ${sortedModifierGroups.length} групп`
    : 'Группы модификаторов не найдены';

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title="Модификаторы"
        description="Рабочий список групп модификаторов: быстро находите нужную группу и переходите в детали для управления опциями."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl shadow-sm')} to="/modifier-groups/new">
              Добавить группу
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() =>
                void loadModifierGroups({
                  isActive: isActiveFilter,
                })
              }
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        aria-label="Группы модификаторов"
        eyebrow="Справочник"
        title="Группы модификаторов"
        description="Список содержит только группы. Опции редактируются отдельно в карточке группы."
      >
        <div className="space-y-4">
          <ResourceFilters
            activityAriaLabel="Фильтр активности групп модификаторов"
            isActive={isActiveFilter}
            onIsActiveChange={handleActivityFilterChange}
            onSearchQueryChange={setSearchQuery}
            searchId="modifier-group-search"
            searchLabel="Поиск"
            searchPlaceholder="Поиск по code или названию группы"
            searchQuery={searchQuery}
          />
          <p className="text-sm text-muted-foreground">{resultsMeta}</p>
        </div>

        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка групп" description="Получаем группы модификаторов из API каталога." />
        ) : sortedModifierGroups.length ? (
          <LazyDataTable
            columns={columns}
            data={sortedModifierGroups}
            getRowId={(modifierGroup) => modifierGroup.id}
            wrapperClassName="overflow-x-auto rounded-2xl border border-border/70 bg-background/80"
            tableClassName="min-w-full border-collapse text-sm"
            headerRowClassName="border-b border-border/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:text-muted-foreground [&>th]:uppercase"
            bodyRowClassName="border-b border-border/50 last:border-b-0 [&>td]:px-3 [&>td]:py-3 align-top"
            fallback={<AdminEmptyState description="Загрузка таблицы групп модификаторов..." />}
          />
        ) : (
          <AdminEmptyState
            title={modifierGroups.length ? 'Группы не найдены' : 'Группы отсутствуют'}
            description={
              modifierGroups.length
                ? 'Попробуйте изменить поисковый запрос или переключить фильтр активности.'
                : 'Создайте первую группу модификаторов, чтобы начать работу с опциями.'
            }
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
