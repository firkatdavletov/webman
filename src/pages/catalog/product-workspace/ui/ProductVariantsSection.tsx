import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'react-router-dom';
import {
  formatPrice,
  saveProductOptionGroup,
  saveProductOptionValue,
  saveProductVariant,
  type Product,
  type ProductOptionGroup,
  type ProductOptionValue,
  type ProductVariant,
} from '@/entities/product';
import {
  buildOptionGroupFormValues,
  buildOptionValueFormValues,
  buildVariantFormValues,
  buildVariantGenerationPreviewRows,
  mapOptionGroupFormToProductOptionGroup,
  mapOptionValueFormToProductOptionValue,
  mapVariantFormToProductVariantDetails,
  type OptionGroupFormValues,
  type OptionValueFormValues,
  type VariantFormValues,
  type VariantGenerationPreviewRow,
} from '@/pages/catalog/product-workspace/model/productVariantsSection';
import type { ProductWorkspaceMutationResult } from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminSectionCard,
  Badge,
  Button,
  FormField,
  Input,
  LazyDataTable,
  PriceInput,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui';

type ProductVariantsSectionProps = {
  onRefreshProduct: () => Promise<ProductWorkspaceMutationResult>;
  product: Product;
};

type OptionGroupDrawerState = {
  mode: 'create' | 'edit';
  optionGroup: ProductOptionGroup | null;
  values: OptionGroupFormValues;
};

type OptionValueDrawerState = {
  mode: 'create' | 'edit';
  optionGroup: ProductOptionGroup;
  optionValue: ProductOptionValue | null;
  values: OptionValueFormValues;
};

type VariantDrawerState = {
  sourceVariant: ProductVariant | null;
  values: VariantFormValues;
};

const checkboxInputClassName =
  'size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50';
const tableWrapperClassName = 'overflow-x-auto rounded-2xl border border-border/70 bg-background/70';
const tableClassName = 'min-w-full border-separate border-spacing-0 text-sm';
const headerClassName = 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase';
const cellClassName = 'px-3 py-2 align-middle';
const OPTION_GROUP_ACTION_SEARCH_PARAM = 'optionGroup';
const OPTION_GROUP_ID_SEARCH_PARAM = 'optionGroupId';
const OPTION_GROUP_CREATE_ACTION = 'create';

function getStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

function getOptionValueLabel(optionGroup: ProductOptionGroup, optionValueCode: string): string {
  const optionValue = optionGroup.values.find((value) => value.code === optionValueCode);

  if (!optionValue) {
    return optionValueCode || '—';
  }

  return optionValue.title ? `${optionValue.title} (${optionValue.code})` : optionValue.code;
}

function getVariantOptionLabel(variant: ProductVariant, optionGroup: ProductOptionGroup): string {
  const option = variant.options.find((item) => item.optionGroupCode === optionGroup.code);

  if (!option) {
    return '—';
  }

  return getOptionValueLabel(optionGroup, option.optionValueCode);
}

function getPreviewOptionLabel(row: VariantGenerationPreviewRow, optionGroup: ProductOptionGroup): string {
  const option = row.options.find((item) => item.optionGroupCode === optionGroup.code);

  if (!option) {
    return '—';
  }

  return getOptionValueLabel(optionGroup, option.optionValueCode);
}

function getVariantRowId(variant: ProductVariant, index: number): string {
  return variant.id ?? `${variant.sku}-${index}`;
}

export function ProductVariantsSection({ onRefreshProduct, product }: ProductVariantsSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOptionGroupAction = searchParams.get(OPTION_GROUP_ACTION_SEARCH_PARAM);
  const requestedOptionGroupId = searchParams.get(OPTION_GROUP_ID_SEARCH_PARAM);
  const [optionGroupDrawer, setOptionGroupDrawer] = useState<OptionGroupDrawerState | null>(null);
  const [optionValueDrawer, setOptionValueDrawer] = useState<OptionValueDrawerState | null>(null);
  const [variantDrawer, setVariantDrawer] = useState<VariantDrawerState | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [selectedGenerationKeys, setSelectedGenerationKeys] = useState<string[]>([]);
  const [mutationError, setMutationError] = useState('');
  const [mutationSuccess, setMutationSuccess] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const [isSavingOptionGroup, setIsSavingOptionGroup] = useState(false);
  const [isSavingOptionValue, setIsSavingOptionValue] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  const variantGenerationRows = useMemo(() => buildVariantGenerationPreviewRows(product), [product]);
  const creatableGenerationRows = useMemo(
    () => variantGenerationRows.filter((row) => !row.existingVariantId),
    [variantGenerationRows],
  );
  const selectedVariantIdSet = useMemo(() => new Set(selectedVariantIds), [selectedVariantIds]);
  const selectedGenerationKeySet = useMemo(() => new Set(selectedGenerationKeys), [selectedGenerationKeys]);

  useEffect(() => {
    const availableVariantIds = new Set(product.variants.map((variant) => variant.id).filter((id): id is string => Boolean(id)));

    setSelectedVariantIds((currentIds) => currentIds.filter((id) => availableVariantIds.has(id)));
    setSelectedGenerationKeys((currentKeys) =>
      currentKeys.filter((key) => creatableGenerationRows.some((row) => row.key === key)),
    );
  }, [creatableGenerationRows, product.variants]);

  const openOptionGroupCreateDrawer = () => {
    setOptionGroupDrawer({
      mode: 'create',
      optionGroup: null,
      values: buildOptionGroupFormValues(undefined, product.optionGroups.length * 10),
    });
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');
  };

  const openOptionGroupEditDrawer = (optionGroup: ProductOptionGroup) => {
    setOptionGroupDrawer({
      mode: 'edit',
      optionGroup,
      values: buildOptionGroupFormValues(optionGroup),
    });
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');
  };

  const openOptionValueCreateDrawer = (optionGroup: ProductOptionGroup) => {
    setOptionValueDrawer({
      mode: 'create',
      optionGroup,
      optionValue: null,
      values: buildOptionValueFormValues(undefined, optionGroup.values.length * 10),
    });
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');
  };

  const openOptionValueEditDrawer = (optionGroup: ProductOptionGroup, optionValue: ProductOptionValue) => {
    setOptionValueDrawer({
      mode: 'edit',
      optionGroup,
      optionValue,
      values: buildOptionValueFormValues(optionValue),
    });
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');
  };

  const openVariantDrawer = (variant: ProductVariant | null, previewRow?: VariantGenerationPreviewRow) => {
    setVariantDrawer({
      sourceVariant: variant,
      values: buildVariantFormValues(product, variant, previewRow),
    });
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');
  };

  useEffect(() => {
    const shouldOpenCreateDrawer = requestedOptionGroupAction === OPTION_GROUP_CREATE_ACTION;

    if (!shouldOpenCreateDrawer && !requestedOptionGroupId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete(OPTION_GROUP_ACTION_SEARCH_PARAM);
    nextSearchParams.delete(OPTION_GROUP_ID_SEARCH_PARAM);
    setSearchParams(nextSearchParams, { replace: true });

    if (shouldOpenCreateDrawer) {
      openOptionGroupCreateDrawer();
      return;
    }

    const requestedOptionGroup = product.optionGroups.find((optionGroup) => optionGroup.id === requestedOptionGroupId);

    if (!requestedOptionGroup) {
      setMutationError('Группа опций не найдена в текущем снимке продукта.');
      return;
    }

    openOptionGroupEditDrawer(requestedOptionGroup);
  }, [product.optionGroups, requestedOptionGroupAction, requestedOptionGroupId, searchParams, setSearchParams]);

  const handleOptionGroupValueChange = (field: keyof OptionGroupFormValues, value: string) => {
    setOptionGroupDrawer((currentState) =>
      currentState
        ? {
            ...currentState,
            values: {
              ...currentState.values,
              [field]: value,
            },
          }
        : currentState,
    );
    setDrawerError('');
  };

  const handleOptionValueChange = (field: keyof OptionValueFormValues, value: string) => {
    setOptionValueDrawer((currentState) =>
      currentState
        ? {
            ...currentState,
            values: {
              ...currentState.values,
              [field]: value,
            },
          }
        : currentState,
    );
    setDrawerError('');
  };

  const handleVariantValueChange = (updater: (values: VariantFormValues) => VariantFormValues) => {
    setVariantDrawer((currentState) =>
      currentState
        ? {
            ...currentState,
            values: updater(currentState.values),
          }
        : currentState,
    );
    setDrawerError('');
  };

  const handleSaveOptionGroup = async () => {
    if (!optionGroupDrawer) {
      return;
    }

    const mappingResult = mapOptionGroupFormToProductOptionGroup(product, optionGroupDrawer.values);

    if (!mappingResult.value) {
      setDrawerError(mappingResult.error);
      return;
    }

    setIsSavingOptionGroup(true);
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');

    const saveResult = await saveProductOptionGroup(product.id, mappingResult.value);

    if (!saveResult.optionGroup) {
      setDrawerError(saveResult.error ?? 'Не удалось сохранить группу опций.');
      setIsSavingOptionGroup(false);
      return;
    }

    const refreshResult = await onRefreshProduct();

    setIsSavingOptionGroup(false);
    setOptionGroupDrawer(null);

    if (!refreshResult.product) {
      setMutationError(refreshResult.error ?? 'Группа опций сохранена, но снимок продукта не обновился.');
      return;
    }

    setMutationSuccess('Группа опций сохранена.');
  };

  const handleSaveOptionValue = async () => {
    if (!optionValueDrawer || !optionValueDrawer.optionGroup.id) {
      setDrawerError('Сначала сохраните группу опций, затем добавляйте значения.');
      return;
    }

    const mappingResult = mapOptionValueFormToProductOptionValue(optionValueDrawer.optionGroup, optionValueDrawer.values);

    if (!mappingResult.value) {
      setDrawerError(mappingResult.error);
      return;
    }

    setIsSavingOptionValue(true);
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');

    const saveResult = await saveProductOptionValue(product.id, optionValueDrawer.optionGroup.id, mappingResult.value);

    if (!saveResult.optionValue) {
      setDrawerError(saveResult.error ?? 'Не удалось сохранить значение опции.');
      setIsSavingOptionValue(false);
      return;
    }

    const refreshResult = await onRefreshProduct();

    setIsSavingOptionValue(false);
    setOptionValueDrawer(null);

    if (!refreshResult.product) {
      setMutationError(refreshResult.error ?? 'Значение опции сохранено, но снимок продукта не обновился.');
      return;
    }

    setMutationSuccess('Значение опции сохранено.');
  };

  const handleSaveVariant = async () => {
    if (!variantDrawer) {
      return;
    }

    const mappingResult = mapVariantFormToProductVariantDetails(product, variantDrawer.values, variantDrawer.sourceVariant);

    if (!mappingResult.value) {
      setDrawerError(mappingResult.error);
      return;
    }

    setIsSavingVariant(true);
    setDrawerError('');
    setMutationError('');
    setMutationSuccess('');

    const saveResult = await saveProductVariant(product.id, mappingResult.value);

    if (!saveResult.variant) {
      setDrawerError(saveResult.error ?? 'Не удалось сохранить вариант.');
      setIsSavingVariant(false);
      return;
    }

    const refreshResult = await onRefreshProduct();

    setIsSavingVariant(false);
    setVariantDrawer(null);

    if (!refreshResult.product) {
      setMutationError(refreshResult.error ?? 'Вариант сохранен, но снимок продукта не обновился.');
      return;
    }

    setMutationSuccess('Вариант сохранен.');
  };

  const toggleVariantSelection = (variantId: string, isSelected: boolean) => {
    setSelectedVariantIds((currentIds) => {
      if (isSelected) {
        return currentIds.includes(variantId) ? currentIds : [...currentIds, variantId];
      }

      return currentIds.filter((id) => id !== variantId);
    });
  };

  const toggleAllVariants = (isSelected: boolean) => {
    if (!isSelected) {
      setSelectedVariantIds([]);
      return;
    }

    setSelectedVariantIds(product.variants.map((variant) => variant.id).filter((id): id is string => Boolean(id)));
  };

  const toggleGenerationRowSelection = (rowKey: string, isSelected: boolean) => {
    setSelectedGenerationKeys((currentKeys) => {
      if (isSelected) {
        return currentKeys.includes(rowKey) ? currentKeys : [...currentKeys, rowKey];
      }

      return currentKeys.filter((key) => key !== rowKey);
    });
  };

  const toggleAllGenerationRows = (isSelected: boolean) => {
    if (!isSelected) {
      setSelectedGenerationKeys([]);
      return;
    }

    setSelectedGenerationKeys(creatableGenerationRows.map((row) => row.key));
  };

  const variantColumns = useMemo<ColumnDef<ProductVariant>[]>(
    () => {
      const selectableVariantIds = product.variants.map((variant) => variant.id).filter((id): id is string => Boolean(id));
      const areAllVariantsSelected =
        selectableVariantIds.length > 0 && selectableVariantIds.every((variantId) => selectedVariantIdSet.has(variantId));

      return [
        {
          id: 'selected',
          header: () => (
            <input
              className={checkboxInputClassName}
              type="checkbox"
              aria-label="Выбрать все варианты"
              checked={areAllVariantsSelected}
              disabled={!selectableVariantIds.length}
              onChange={(event) => toggleAllVariants(event.target.checked)}
            />
          ),
          cell: ({ row }) => {
            const variantId = row.original.id;

            return (
              <input
                className={checkboxInputClassName}
                type="checkbox"
                aria-label={`Выбрать вариант ${row.original.sku}`}
                checked={variantId ? selectedVariantIdSet.has(variantId) : false}
                disabled={!variantId}
                onChange={(event) => {
                  if (variantId) {
                    toggleVariantSelection(variantId, event.target.checked);
                  }
                }}
              />
            );
          },
        },
        {
          id: 'sku',
          header: 'SKU',
          cell: ({ row }) => (
            <div className="min-w-40">
              <p className="font-medium text-foreground">{row.original.sku || '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.original.title || 'Название не указано'}</p>
            </div>
          ),
        },
        {
          id: 'price',
          header: 'Цена',
          cell: ({ row }) => (
            <div className="whitespace-nowrap">
              <p className="font-medium text-foreground">{row.original.price === null ? '—' : formatPrice(row.original.price)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.original.oldPrice === null ? 'Без старой цены' : `Старая: ${formatPrice(row.original.oldPrice)}`}
              </p>
            </div>
          ),
        },
        ...product.optionGroups.map<ColumnDef<ProductVariant>>((optionGroup, optionGroupIndex) => ({
          id: `option-${optionGroup.id ?? optionGroup.code}-${optionGroupIndex}`,
          header: optionGroup.title || optionGroup.code,
          cell: ({ row }) => <span className="whitespace-nowrap">{getVariantOptionLabel(row.original, optionGroup)}</span>,
        })),
        {
          id: 'sortOrder',
          header: 'Порядок',
          cell: ({ row }) => row.original.sortOrder,
        },
        {
          id: 'status',
          header: 'Статус',
          cell: ({ row }) => (
            <Badge className={cn('border', getStatusClassName(row.original.isActive))}>
              {row.original.isActive ? 'Активен' : 'Выключен'}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: '',
          cell: ({ row }) => (
            <Button type="button" variant="outline" size="sm" onClick={() => openVariantDrawer(row.original)}>
              Изменить
            </Button>
          ),
        },
      ];
    },
    [product.optionGroups, product.variants, selectedVariantIdSet],
  );

  const generationColumns = useMemo<ColumnDef<VariantGenerationPreviewRow>[]>(
    () => {
      const areAllGenerationRowsSelected =
        creatableGenerationRows.length > 0
        && creatableGenerationRows.every((row) => selectedGenerationKeySet.has(row.key));

      return [
        {
          id: 'selected',
          header: () => (
            <input
              className={checkboxInputClassName}
              type="checkbox"
              aria-label="Выбрать все новые комбинации"
              checked={areAllGenerationRowsSelected}
              disabled={!creatableGenerationRows.length}
              onChange={(event) => toggleAllGenerationRows(event.target.checked)}
            />
          ),
          cell: ({ row }) => (
            <input
              className={checkboxInputClassName}
              type="checkbox"
              aria-label={`Выбрать комбинацию ${row.original.sku}`}
              checked={selectedGenerationKeySet.has(row.original.key)}
              disabled={Boolean(row.original.existingVariantId)}
              onChange={(event) => toggleGenerationRowSelection(row.original.key, event.target.checked)}
            />
          ),
        },
        {
          id: 'sku',
          header: 'SKU',
          cell: ({ row }) => (
            <div className="min-w-44">
              <p className="font-medium text-foreground">{row.original.sku}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.original.title}</p>
            </div>
          ),
        },
        ...product.optionGroups.map<ColumnDef<VariantGenerationPreviewRow>>((optionGroup, optionGroupIndex) => ({
          id: `generation-option-${optionGroup.id ?? optionGroup.code}-${optionGroupIndex}`,
          header: optionGroup.title || optionGroup.code,
          cell: ({ row }) => <span className="whitespace-nowrap">{getPreviewOptionLabel(row.original, optionGroup)}</span>,
        })),
        {
          id: 'state',
          header: 'Состояние',
          cell: ({ row }) =>
            row.original.existingVariantId ? (
              <Badge className="border border-border bg-muted/40 text-muted-foreground">
                Уже есть: {row.original.existingVariantSku}
              </Badge>
            ) : (
              <Badge className="border border-blue-200 bg-blue-50 text-blue-700">Новая комбинация</Badge>
            ),
        },
        {
          id: 'actions',
          header: '',
          cell: ({ row }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={Boolean(row.original.existingVariantId)}
              onClick={() => openVariantDrawer(null, row.original)}
            >
              Открыть черновик
            </Button>
          ),
        },
      ];
    },
    [creatableGenerationRows, product.optionGroups, selectedGenerationKeySet],
  );

  const optionGroupsWithoutValues = product.optionGroups.filter((group) => !group.values.length);
  const selectedVariantCount = selectedVariantIds.length;
  const selectedGenerationCount = selectedGenerationKeys.length;

  return (
    <>
      <AdminSectionCard
        eyebrow="Варианты"
        title="Опции и варианты"
        description="Управляйте группами опций, значениями и отдельными SKU товара."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openOptionGroupCreateDrawer}>
              Добавить группу
            </Button>
            <Button type="button" onClick={() => openVariantDrawer(null)}>
              Добавить вариант
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Группы</p>
            <p className="mt-1 text-sm font-medium text-foreground">{product.optionGroups.length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Значения</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {product.optionGroups.reduce((total, group) => total + group.values.length, 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Варианты</p>
            <p className="mt-1 text-sm font-medium text-foreground">{product.variants.length}</p>
          </div>
        </div>

        {mutationError ? <AdminNotice tone="destructive">{mutationError}</AdminNotice> : null}
        {mutationSuccess ? <AdminNotice>{mutationSuccess}</AdminNotice> : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Группы опций и значения</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Значения редактируются внутри выбранной группы. Удаление и деактивация пока недоступны.
              </p>
            </div>
          </div>

          {product.optionGroups.length ? (
            <div className="grid gap-3">
              {product.optionGroups.map((optionGroup) => (
                <article key={optionGroup.id ?? optionGroup.code} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{optionGroup.title || optionGroup.code}</p>
                        <Badge className="border border-border bg-muted/40 text-muted-foreground">{optionGroup.code}</Badge>
                        <Badge className="border border-border bg-background text-muted-foreground">sort: {optionGroup.sortOrder}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {optionGroup.values.length ? `${optionGroup.values.length} значений` : 'Значений пока нет'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openOptionValueCreateDrawer(optionGroup)}>
                        Добавить значение
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => openOptionGroupEditDrawer(optionGroup)}>
                        Изменить группу
                      </Button>
                    </div>
                  </div>

                  {optionGroup.values.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {optionGroup.values.map((optionValue) => (
                        <button
                          key={optionValue.id ?? optionValue.code}
                          type="button"
                          className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          onClick={() => openOptionValueEditDrawer(optionGroup, optionValue)}
                        >
                          <span className="block font-medium text-foreground">{optionValue.title || optionValue.code}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {optionValue.code} · sort: {optionValue.sortOrder}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <AdminEmptyState className="mt-4 min-h-28" description="Добавьте первое значение, чтобы можно было создавать комбинации вариантов." />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="Групп опций нет"
              description="Добавьте группу опций, затем значения. После этого появится preview комбинаций для вариантов."
            />
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Варианты</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Таблица строит колонки из текущих групп опций продукта, без привязки к цвету или размеру.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Массовое редактирование</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Выбрано вариантов: {selectedVariantCount}. Массовые изменения пока недоступны.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[42rem]">
                <Select value="" disabled aria-label="Массовое действие">
                  <option value="">Действие</option>
                  <option value="activate">Включить</option>
                  <option value="deactivate">Выключить</option>
                </Select>
                <PriceInput value="" onValueChange={() => undefined} placeholder="Цена" disabled aria-label="Массовая цена" />
                <Button type="button" disabled>
                  Применить
                </Button>
                <Button type="button" variant="outline" disabled={!selectedVariantCount} onClick={() => setSelectedVariantIds([])}>
                  Снять выбор
                </Button>
              </div>
            </div>
          </div>

          {product.variants.length ? (
            <LazyDataTable
              columns={variantColumns}
              data={product.variants}
              getRowId={getVariantRowId}
              tableClassName={tableClassName}
              wrapperClassName={tableWrapperClassName}
              headerRowClassName="bg-muted/50"
              bodyRowClassName="border-t border-border/60"
              getHeaderClassName={() => headerClassName}
              getCellClassName={() => cellClassName}
            />
          ) : (
            <AdminEmptyState
              title="Вариантов нет"
              description="Создайте вариант вручную или подготовьте комбинации из групп и значений ниже."
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Предпросмотр генерации</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Комбинации собираются из текущих групп и значений. Массовое создание пока недоступно.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!selectedGenerationCount}>
                Создать выбранные ({selectedGenerationCount})
              </Button>
              <Button type="button" variant="outline" disabled={!selectedGenerationCount} onClick={() => setSelectedGenerationKeys([])}>
                Снять выбор
              </Button>
            </div>
          </div>

          {optionGroupsWithoutValues.length ? (
            <AdminNotice tone="destructive">
              Заполните значения в группах: {optionGroupsWithoutValues.map((group) => group.title || group.code).join(', ')}.
            </AdminNotice>
          ) : null}

          {variantGenerationRows.length ? (
            <LazyDataTable
              columns={generationColumns}
              data={variantGenerationRows}
              getRowId={(row) => row.key}
              tableClassName={tableClassName}
              wrapperClassName={tableWrapperClassName}
              headerRowClassName="bg-muted/50"
              bodyRowClassName="border-t border-border/60"
              getHeaderClassName={() => headerClassName}
              getCellClassName={() => cellClassName}
            />
          ) : (
            <AdminEmptyState
              title="Предпросмотр пока недоступен"
              description="Нужна хотя бы одна группа опций, и в каждой группе должно быть минимум одно значение."
            />
          )}
        </div>
      </AdminSectionCard>

      <Sheet
        open={Boolean(optionGroupDrawer)}
        onOpenChange={(open) => {
          if (!open && !isSavingOptionGroup) {
            setOptionGroupDrawer(null);
            setDrawerError('');
          }
        }}
      >
        <SheetContent side="right" className="w-[min(100vw,38rem)] max-w-none overflow-y-auto p-0">
          {optionGroupDrawer ? (
            <div className="flex min-h-full flex-col">
              <SheetHeader className="border-b border-border/70 px-5 py-5">
                <SheetTitle>{optionGroupDrawer.mode === 'create' ? 'Новая группа опций' : 'Редактирование группы'}</SheetTitle>
                <SheetDescription>
                  Настройте code, название и порядок отображения группы.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 px-5 py-5">
                <FormField htmlFor="workspace-option-group-code" label="Code">
                  <Input
                    id="workspace-option-group-code"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={optionGroupDrawer.values.code}
                    disabled={isSavingOptionGroup}
                    onChange={(event) => handleOptionGroupValueChange('code', event.target.value)}
                  />
                </FormField>

                <FormField htmlFor="workspace-option-group-title" label="Название">
                  <Input
                    id="workspace-option-group-title"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={optionGroupDrawer.values.title}
                    disabled={isSavingOptionGroup}
                    onChange={(event) => handleOptionGroupValueChange('title', event.target.value)}
                  />
                </FormField>

                <FormField htmlFor="workspace-option-group-sort-order" label="Sort order">
                  <Input
                    id="workspace-option-group-sort-order"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={optionGroupDrawer.values.sortOrder}
                    disabled={isSavingOptionGroup}
                    inputMode="numeric"
                    onChange={(event) => handleOptionGroupValueChange('sortOrder', event.target.value)}
                  />
                </FormField>

                {optionGroupDrawer.mode === 'edit' ? (
                  <AdminNotice>
                    Удаление или деактивация группы пока недоступны, чтобы не нарушить связанные варианты и заказы.
                  </AdminNotice>
                ) : null}

                {drawerError ? <AdminNotice tone="destructive">{drawerError}</AdminNotice> : null}
              </div>

              <SheetFooter className="border-t border-border/70 bg-muted/35 px-5 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={isSavingOptionGroup} onClick={() => setOptionGroupDrawer(null)}>
                    Отмена
                  </Button>
                  <Button type="button" disabled={isSavingOptionGroup} onClick={() => void handleSaveOptionGroup()}>
                    {isSavingOptionGroup ? 'Сохранение...' : 'Сохранить группу'}
                  </Button>
                </div>
              </SheetFooter>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(optionValueDrawer)}
        onOpenChange={(open) => {
          if (!open && !isSavingOptionValue) {
            setOptionValueDrawer(null);
            setDrawerError('');
          }
        }}
      >
        <SheetContent side="right" className="w-[min(100vw,38rem)] max-w-none overflow-y-auto p-0">
          {optionValueDrawer ? (
            <div className="flex min-h-full flex-col">
              <SheetHeader className="border-b border-border/70 px-5 py-5">
                <SheetTitle>{optionValueDrawer.mode === 'create' ? 'Новое значение опции' : 'Редактирование значения'}</SheetTitle>
                <SheetDescription>
                  Группа: {optionValueDrawer.optionGroup.title || optionValueDrawer.optionGroup.code}.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 px-5 py-5">
                <FormField htmlFor="workspace-option-value-code" label="Code">
                  <Input
                    id="workspace-option-value-code"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={optionValueDrawer.values.code}
                    disabled={isSavingOptionValue}
                    onChange={(event) => handleOptionValueChange('code', event.target.value)}
                  />
                </FormField>

                <FormField htmlFor="workspace-option-value-title" label="Название">
                  <Input
                    id="workspace-option-value-title"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={optionValueDrawer.values.title}
                    disabled={isSavingOptionValue}
                    onChange={(event) => handleOptionValueChange('title', event.target.value)}
                  />
                </FormField>

                <FormField htmlFor="workspace-option-value-sort-order" label="Sort order">
                  <Input
                    id="workspace-option-value-sort-order"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={optionValueDrawer.values.sortOrder}
                    disabled={isSavingOptionValue}
                    inputMode="numeric"
                    onChange={(event) => handleOptionValueChange('sortOrder', event.target.value)}
                  />
                </FormField>

                <AdminNotice>
                  Удаление или деактивация значения пока недоступны, чтобы не нарушить связанные варианты и заказы.
                </AdminNotice>

                {drawerError ? <AdminNotice tone="destructive">{drawerError}</AdminNotice> : null}
              </div>

              <SheetFooter className="border-t border-border/70 bg-muted/35 px-5 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={isSavingOptionValue} onClick={() => setOptionValueDrawer(null)}>
                    Отмена
                  </Button>
                  <Button type="button" disabled={isSavingOptionValue} onClick={() => void handleSaveOptionValue()}>
                    {isSavingOptionValue ? 'Сохранение...' : 'Сохранить значение'}
                  </Button>
                </div>
              </SheetFooter>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(variantDrawer)}
        onOpenChange={(open) => {
          if (!open && !isSavingVariant) {
            setVariantDrawer(null);
            setDrawerError('');
          }
        }}
      >
        <SheetContent side="right" className="w-[min(100vw,42rem)] max-w-none overflow-y-auto p-0">
          {variantDrawer ? (
            <div className="flex min-h-full flex-col">
              <SheetHeader className="border-b border-border/70 px-5 py-5">
                <SheetTitle>{variantDrawer.values.id ? 'Редактирование варианта' : 'Новый вариант'}</SheetTitle>
                <SheetDescription>
                  Измените SKU, цену, статус и значения опций. Фотографии остаются в детальной карточке варианта.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField htmlFor="workspace-variant-sku" label="SKU">
                    <Input
                      id="workspace-variant-sku"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={variantDrawer.values.sku}
                      disabled={isSavingVariant}
                      onChange={(event) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          sku: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  <FormField htmlFor="workspace-variant-title" label="Название">
                    <Input
                      id="workspace-variant-title"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={variantDrawer.values.title}
                      disabled={isSavingVariant}
                      onChange={(event) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          title: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  <FormField htmlFor="workspace-variant-price" label="Цена (руб.)">
                    <PriceInput
                      id="workspace-variant-price"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={variantDrawer.values.price}
                      disabled={isSavingVariant}
                      onValueChange={(value) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          price: value,
                        }))
                      }
                    />
                  </FormField>

                  <FormField htmlFor="workspace-variant-old-price" label="Старая цена (руб.)">
                    <PriceInput
                      id="workspace-variant-old-price"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={variantDrawer.values.oldPrice}
                      disabled={isSavingVariant}
                      onValueChange={(value) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          oldPrice: value,
                        }))
                      }
                    />
                  </FormField>

                  <FormField htmlFor="workspace-variant-sort-order" label="Sort order">
                    <Input
                      id="workspace-variant-sort-order"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={variantDrawer.values.sortOrder}
                      disabled={isSavingVariant}
                      inputMode="numeric"
                      onChange={(event) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          sortOrder: event.target.value,
                        }))
                      }
                    />
                  </FormField>

                  <FormField htmlFor="workspace-variant-external-id" label="External ID">
                    <Input
                      id="workspace-variant-external-id"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      value={variantDrawer.values.externalId}
                      disabled={isSavingVariant}
                      onChange={(event) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          externalId: event.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>

                <FormField htmlFor="workspace-variant-active" label="Статус">
                  <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground shadow-sm">
                    <input
                      id="workspace-variant-active"
                      type="checkbox"
                      className={checkboxInputClassName}
                      checked={variantDrawer.values.isActive}
                      disabled={isSavingVariant}
                      onChange={(event) =>
                        handleVariantValueChange((values) => ({
                          ...values,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    {variantDrawer.values.isActive ? 'Активен' : 'Выключен'}
                  </label>
                </FormField>

                {product.optionGroups.length ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Опции варианта</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {product.optionGroups.map((optionGroup) => (
                        <FormField
                          key={optionGroup.id ?? optionGroup.code}
                          htmlFor={`workspace-variant-option-${optionGroup.id ?? optionGroup.code}`}
                          label={optionGroup.title || optionGroup.code}
                        >
                          <Select
                            id={`workspace-variant-option-${optionGroup.id ?? optionGroup.code}`}
                            value={variantDrawer.values.selectedOptionValueByGroupCode[optionGroup.code] ?? ''}
                            disabled={isSavingVariant || !optionGroup.values.length}
                            onChange={(event) =>
                              handleVariantValueChange((values) => ({
                                ...values,
                                selectedOptionValueByGroupCode: {
                                  ...values.selectedOptionValueByGroupCode,
                                  [optionGroup.code]: event.target.value,
                                },
                              }))
                            }
                          >
                            <option value="">Не выбрано</option>
                            {optionGroup.values.map((optionValue) => (
                              <option key={optionValue.id ?? optionValue.code} value={optionValue.code}>
                                {optionValue.title || optionValue.code}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                      ))}
                    </div>
                  </div>
                ) : (
                  <AdminNotice>У продукта нет групп опций. Вариант будет сохранен без option links.</AdminNotice>
                )}

                {drawerError ? <AdminNotice tone="destructive">{drawerError}</AdminNotice> : null}
              </div>

              <SheetFooter className="border-t border-border/70 bg-muted/35 px-5 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={isSavingVariant} onClick={() => setVariantDrawer(null)}>
                    Отмена
                  </Button>
                  <Button type="button" disabled={isSavingVariant} onClick={() => void handleSaveVariant()}>
                    {isSavingVariant ? 'Сохранение...' : 'Сохранить вариант'}
                  </Button>
                </div>
              </SheetFooter>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
