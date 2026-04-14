import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import {
  formatModifierApplicationScopeLabel,
  formatModifierConstraints,
  getModifierGroupById,
  getModifierGroupOptions,
  saveModifierGroup,
  type ModifierGroup,
  type ModifierOption,
} from '@/entities/modifier-group';
import {
  buildModifierGroupEditorValues,
  mapModifierGroupEditorValuesToModifierGroup,
  ModifierGroupEditor,
  type ModifierGroupEditorValues,
  validateModifierGroupEditorValues,
} from '@/features/modifier-group-editor';
import { cn } from '@/shared/lib/cn';
import { isUuid } from '@/shared/lib/uuid/isUuid';
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

function formatModifierOptionPrice(option: ModifierOption): string {
  if (option.priceType === 'FREE') {
    return 'Бесплатно';
  }

  const formattedValue = (option.price / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

  return `+${formattedValue} ₽`;
}

function filterModifierOptions(options: ModifierOption[], searchQuery: string): ModifierOption[] {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  if (!normalizedSearchQuery) {
    return options;
  }

  return options.filter((option) => {
    const optionLookup = `${option.code} ${option.name} ${option.description ?? ''}`.trim().toLowerCase();

    return optionLookup.includes(normalizedSearchQuery);
  });
}

export function ModifierGroupDetailsPage() {
  const { modifierGroupId } = useParams();
  const [modifierGroup, setModifierGroup] = useState<ModifierGroup | null>(null);
  const [formValues, setFormValues] = useState<ModifierGroupEditorValues | null>(null);
  const [options, setOptions] = useState<ModifierOption[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isRefreshingOptions, setIsRefreshingOptions] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOptionActiveFilter, setIsOptionActiveFilter] = useState(true);
  const groupRequestIdRef = useRef(0);
  const optionsRequestIdRef = useRef(0);

  const normalizedModifierGroupId = useMemo(() => (modifierGroupId ?? '').trim(), [modifierGroupId]);

  const loadOptions = async ({ showInitialLoader = false, isActive = isOptionActiveFilter }: { showInitialLoader?: boolean; isActive?: boolean } = {}) => {
    if (!isUuid(normalizedModifierGroupId)) {
      setOptions([]);
      setOptionsError('Некорректный идентификатор группы модификаторов.');
      setIsLoadingOptions(false);
      setIsRefreshingOptions(false);
      return;
    }

    const requestId = optionsRequestIdRef.current + 1;
    optionsRequestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoadingOptions(true);
    } else {
      setIsRefreshingOptions(true);
    }

    setOptionsError('');

    const result = await getModifierGroupOptions(normalizedModifierGroupId, {
      isActive,
    });

    if (requestId !== optionsRequestIdRef.current) {
      return;
    }

    setOptions(result.options);
    setOptionsError(result.error ?? '');
    setIsLoadingOptions(false);
    setIsRefreshingOptions(false);
  };

  useEffect(() => {
    const loadModifierGroup = async () => {
      if (!isUuid(normalizedModifierGroupId)) {
        setModifierGroup(null);
        setFormValues(null);
        setErrorMessage('Некорректный идентификатор группы модификаторов.');
        setIsLoadingGroup(false);
        setOptions([]);
        setIsLoadingOptions(false);
        return;
      }

      const requestId = groupRequestIdRef.current + 1;
      groupRequestIdRef.current = requestId;

      setIsLoadingGroup(true);
      setErrorMessage('');

      const result = await getModifierGroupById(normalizedModifierGroupId);

      if (requestId !== groupRequestIdRef.current) {
        return;
      }

      setModifierGroup(result.modifierGroup);
      setFormValues(result.modifierGroup ? buildModifierGroupEditorValues(result.modifierGroup) : null);
      setErrorMessage(result.error ?? '');
      setSaveError('');
      setSaveSuccess('');
      setIsLoadingGroup(false);

      if (!result.error) {
        void loadOptions({
          showInitialLoader: true,
          isActive: isOptionActiveFilter,
        });
      }
    };

    void loadModifierGroup();
  }, [normalizedModifierGroupId]);

  const handleValuesChange = (updater: (currentValues: ModifierGroupEditorValues) => ModifierGroupEditorValues) => {
    setFormValues((currentValues) => (currentValues ? updater(currentValues) : currentValues));

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleSaveGroup = async () => {
    if (!modifierGroup || !formValues) {
      return;
    }

    const validationError = validateModifierGroupEditorValues(formValues);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSavingGroup(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveModifierGroup(mapModifierGroupEditorValuesToModifierGroup(formValues, modifierGroup.id));

    if (result.modifierGroup) {
      setModifierGroup(result.modifierGroup);
      setFormValues(buildModifierGroupEditorValues(result.modifierGroup));
      setSaveSuccess('Изменения сохранены.');
    } else {
      setSaveError(result.error ?? 'Не удалось сохранить изменения группы модификаторов.');
    }

    setIsSavingGroup(false);
  };

  const handleOptionActivityFilterChange = (nextValue: boolean) => {
    if (nextValue === isOptionActiveFilter) {
      return;
    }

    setIsOptionActiveFilter(nextValue);
    setSearchQuery('');

    void loadOptions({
      isActive: nextValue,
    });
  };

  const filteredOptions = useMemo(() => filterModifierOptions(options, searchQuery), [options, searchQuery]);

  const sortedOptions = useMemo(
    () => [...filteredOptions].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'ru')),
    [filteredOptions],
  );

  const optionColumns = useMemo<ColumnDef<ModifierOption>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            to={`/modifier-groups/${normalizedModifierGroupId}/options/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        id: 'name',
        header: 'Название',
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        id: 'price',
        header: 'Цена',
        cell: ({ row }) => <span className="text-muted-foreground">{formatModifierOptionPrice(row.original)}</span>,
      },
      {
        id: 'scope',
        header: 'Применение',
        cell: ({ row }) => <span className="text-muted-foreground">{formatModifierApplicationScopeLabel(row.original.applicationScope)}</span>,
      },
      {
        id: 'default',
        header: 'По умолчанию',
        cell: ({ row }) => (row.original.isDefault ? 'Да' : 'Нет'),
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
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.sortOrder}</span>,
      },
    ],
    [normalizedModifierGroupId],
  );

  const optionsStatusText = isLoadingOptions
    ? 'Загрузка опций...'
    : `${isOptionActiveFilter ? 'Активные' : 'Неактивные'}: ${options.length} опций`;

  if (isLoadingGroup) {
    return (
      <AdminPage>
        <AdminPageHeader kicker="Каталог" title="Группа модификаторов" description="Загружаем данные группы и связанные опции." />
        <AdminEmptyState title="Загрузка группы" description="Получаем параметры группы модификаторов из API." />
      </AdminPage>
    );
  }

  if (!modifierGroup || !formValues) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Группа модификаторов"
          actions={
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/modifier-groups">
              К списку групп
            </Link>
          }
        />
        <AdminNotice tone="destructive" role="alert">
          {errorMessage || 'Группа модификаторов не найдена.'}
        </AdminNotice>
      </AdminPage>
    );
  }

  const optionResultsMeta = sortedOptions.length ? `Найдено ${sortedOptions.length} опций` : 'Опции модификаторов не найдены';

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title={`Группа: ${modifierGroup.name}`}
        description="Сначала редактируйте параметры группы, затем управляйте опциями на отдельном уровне."
        actions={
          <>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/modifier-groups">
              К списку групп
            </Link>
            <Link className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl')} to={`/modifier-groups/${modifierGroup.id}/options/new`}>
              Добавить опцию
            </Link>
          </>
        }
      />

      {errorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {errorMessage}
        </AdminNotice>
      ) : null}

      <AdminSectionCard
        aria-label="Параметры группы модификаторов"
        eyebrow="Группа"
        title="Параметры группы"
        description="Эти поля влияют на ограничения выбора в карточках товара."
      >
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase">ID и Code</p>
            <p className="mt-1 break-all font-mono text-xs">{modifierGroup.id}</p>
            <p className="mt-1 font-mono text-xs">{modifierGroup.code}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase">Ограничения</p>
            <p className="mt-1">{formatModifierConstraints(modifierGroup)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase">Технически</p>
            <p className="mt-1">Sort order: {modifierGroup.sortOrder}</p>
            <p className="mt-1">Статус: {modifierGroup.isActive ? 'Активна' : 'Выключена'}</p>
          </div>
        </div>

        <ModifierGroupEditor
          idPrefix="modifier-group-details"
          ariaLabel="Редактирование группы модификаторов"
          eyebrow="Редактирование"
          title="Изменить группу"
          description="Изменения сохраняются сразу в API модификаторов."
          formValues={formValues}
          isSaving={isSavingGroup}
          saveError={saveError}
          saveSuccess={saveSuccess}
          submitLabel="Сохранить группу"
          savingLabel="Сохранение..."
          onValuesChange={handleValuesChange}
          onSubmit={() => void handleSaveGroup()}
        />
      </AdminSectionCard>

      <AdminSectionCard
        aria-label="Опции группы модификаторов"
        eyebrow="Опции"
        title="Опции группы"
        description="Каждая опция редактируется в отдельной карточке."
        action={<AdminPageStatus>{optionsStatusText}</AdminPageStatus>}
      >
        <div className="space-y-4">
          <ResourceFilters
            activityAriaLabel="Фильтр активности опций модификаторов"
            isActive={isOptionActiveFilter}
            onIsActiveChange={handleOptionActivityFilterChange}
            onSearchQueryChange={setSearchQuery}
            searchId="modifier-option-search"
            searchLabel="Поиск"
            searchPlaceholder="Поиск по code, названию или описанию опции"
            searchQuery={searchQuery}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{optionResultsMeta}</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                void loadOptions({
                  isActive: isOptionActiveFilter,
                })
              }
              disabled={isLoadingOptions || isRefreshingOptions}
            >
              {isRefreshingOptions ? 'Обновление...' : 'Обновить список опций'}
            </Button>
          </div>
        </div>

        {optionsError ? (
          <AdminNotice tone="destructive" role="alert">
            {optionsError}
          </AdminNotice>
        ) : null}

        {isLoadingOptions ? (
          <AdminEmptyState title="Загрузка опций" description="Получаем список опций выбранной группы." />
        ) : sortedOptions.length ? (
          <LazyDataTable
            columns={optionColumns}
            data={sortedOptions}
            getRowId={(option) => option.id}
            wrapperClassName="overflow-x-auto rounded-2xl border border-border/70 bg-background/80"
            tableClassName="min-w-full border-collapse text-sm"
            headerRowClassName="border-b border-border/70 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:text-muted-foreground [&>th]:uppercase"
            bodyRowClassName="border-b border-border/50 last:border-b-0 [&>td]:px-3 [&>td]:py-3 align-top"
            fallback={<AdminEmptyState description="Загрузка таблицы опций..." />}
          />
        ) : (
          <AdminEmptyState
            title={options.length ? 'Опции не найдены' : 'Опции отсутствуют'}
            description={
              options.length
                ? 'Попробуйте изменить поисковый запрос или переключить фильтр активности.'
                : 'Добавьте первую опцию в этой группе модификаторов.'
            }
          />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
