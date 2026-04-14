import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import {
  formatPrice,
  getProductById,
  getProductVariantById,
  saveProductVariant,
  type Product,
  type ProductOptionGroup,
  type ProductVariantDetails,
} from '@/entities/product';
import { cn } from '@/shared/lib/cn';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
  FormField,
  Input,
  LazyDataTable,
} from '@/shared/ui';

type VariantFormValues = {
  id: string;
  externalId: string;
  sku: string;
  title: string;
  price: string;
  oldPrice: string;
  sortOrder: string;
  isActive: boolean;
  selectedOptionValueByGroupId: Record<string, string>;
};

const SELECT_CLASSNAME =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

function formatEditablePrice(minorValue: number | null): string {
  if (minorValue === null) {
    return '';
  }

  const rawValue = (minorValue / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function parsePrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

function parseOptionalPrice(value: string): number | null | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return parsePrice(normalizedValue) ?? undefined;
}

function parseInteger(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  return numericValue;
}

function buildSelectedOptionValueByGroupId(optionGroups: ProductOptionGroup[], optionValueIds: string[]): Record<string, string> {
  const selectedOptionValueByGroupId: Record<string, string> = {};

  optionGroups.forEach((group) => {
    if (!group.id) {
      return;
    }

    const selectedValue = group.values.find((value) => value.id && optionValueIds.includes(value.id));

    selectedOptionValueByGroupId[group.id] = selectedValue?.id ?? '';
  });

  return selectedOptionValueByGroupId;
}

function buildVariantFormValues(product: Product, variant: ProductVariantDetails): VariantFormValues {
  return {
    id: variant.id,
    externalId: variant.externalId ?? '',
    sku: variant.sku,
    title: variant.title ?? '',
    price: formatEditablePrice(variant.price),
    oldPrice: formatEditablePrice(variant.oldPrice),
    sortOrder: String(variant.sortOrder),
    isActive: variant.isActive,
    selectedOptionValueByGroupId: buildSelectedOptionValueByGroupId(product.optionGroups, variant.optionValueIds),
  };
}

function getStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

export function ProductVariantDetailsPage() {
  const { productId, variantId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<ProductVariantDetails | null>(null);
  const [formValues, setFormValues] = useState<VariantFormValues | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const normalizedProductId = useMemo(() => (productId ?? '').trim(), [productId]);
  const normalizedVariantId = useMemo(() => (variantId ?? '').trim(), [variantId]);

  useEffect(() => {
    const loadData = async () => {
      if (!isUuid(normalizedProductId) || !isUuid(normalizedVariantId)) {
        setProduct(null);
        setVariant(null);
        setFormValues(null);
        setErrorMessage('Некорректный идентификатор продукта или варианта.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [productResult, variantResult] = await Promise.all([
        getProductById(normalizedProductId),
        getProductVariantById(normalizedProductId, normalizedVariantId),
      ]);
      const nextErrors = [productResult.error, variantResult.error].filter(Boolean).join(' ');

      setProduct(productResult.product);
      setVariant(variantResult.variant);
      setFormValues(productResult.product && variantResult.variant ? buildVariantFormValues(productResult.product, variantResult.variant) : null);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setIsLoading(false);
    };

    void loadData();
  }, [normalizedProductId, normalizedVariantId]);

  const optionGroupColumns = useMemo<ColumnDef<ProductOptionGroup>[]>(
    () => [
      {
        id: 'group',
        header: 'Группа опций',
        cell: ({ row }) => `${row.original.title || row.original.code} (${row.original.code})`,
      },
      {
        id: 'selectedValue',
        header: 'Выбранное значение',
        cell: ({ row }) => {
          if (!formValues || !row.original.id) {
            return '—';
          }

          const selectedValue = formValues.selectedOptionValueByGroupId[row.original.id] ?? '';

          return (
            <select
              className={SELECT_CLASSNAME}
              value={selectedValue}
              disabled={isSaving}
              onChange={(event) =>
                setFormValues((currentValues) => {
                  if (!currentValues || !row.original.id) {
                    return currentValues;
                  }

                  return {
                    ...currentValues,
                    selectedOptionValueByGroupId: {
                      ...currentValues.selectedOptionValueByGroupId,
                      [row.original.id]: event.target.value,
                    },
                  };
                })
              }
            >
              <option value="">Не выбрано</option>
              {row.original.values.map((value) => (
                <option key={value.id ?? value.code} value={value.id ?? ''}>
                  {value.title || value.code}
                </option>
              ))}
            </select>
          );
        },
      },
    ],
    [formValues, isSaving],
  );

  const handleSave = async () => {
    if (!product || !variant || !formValues) {
      return;
    }

    const normalizedSku = formValues.sku.trim();
    const normalizedTitle = formValues.title.trim();
    const normalizedExternalId = formValues.externalId.trim();
    const parsedSortOrder = parseInteger(formValues.sortOrder);
    const normalizedPrice = parseOptionalPrice(formValues.price);
    const normalizedOldPrice = parseOptionalPrice(formValues.oldPrice);

    if (!normalizedSku) {
      setSaveError('Укажите SKU варианта.');
      return;
    }

    if (parsedSortOrder === null) {
      setSaveError('Sort order варианта должен быть целым числом.');
      return;
    }

    if (normalizedPrice === undefined) {
      setSaveError('Цена варианта должна быть неотрицательным числом или пустым значением.');
      return;
    }

    if (normalizedOldPrice === undefined) {
      setSaveError('Старая цена варианта должна быть неотрицательным числом или пустым значением.');
      return;
    }

    const optionValueIds: string[] = [];

    if (product.optionGroups.length) {
      for (const optionGroup of product.optionGroups) {
        if (!optionGroup.id || !optionGroup.values.length) {
          continue;
        }

        const selectedValueId = formValues.selectedOptionValueByGroupId[optionGroup.id] ?? '';

        if (!selectedValueId) {
          setSaveError(`Выберите значение для группы опций "${optionGroup.title || optionGroup.code}".`);
          return;
        }

        const hasSelectedValue = optionGroup.values.some((value) => value.id === selectedValueId);

        if (!hasSelectedValue) {
          setSaveError(`Выбрано неизвестное значение для группы опций "${optionGroup.title || optionGroup.code}".`);
          return;
        }

        optionValueIds.push(selectedValueId);
      }
    } else {
      optionValueIds.push(...variant.optionValueIds);
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const saveResult = await saveProductVariant(normalizedProductId, {
      ...variant,
      id: formValues.id,
      externalId: normalizedExternalId || null,
      sku: normalizedSku,
      title: normalizedTitle || null,
      price: normalizedPrice,
      oldPrice: normalizedOldPrice,
      sortOrder: parsedSortOrder,
      isActive: formValues.isActive,
      optionValueIds,
      images: variant.images,
    });

    if (!saveResult.variant) {
      setSaveError(saveResult.error ?? 'Не удалось сохранить вариант товара.');
      setIsSaving(false);
      return;
    }

    setVariant(saveResult.variant);
    setFormValues(buildVariantFormValues(product, saveResult.variant));
    setSaveSuccess('Изменения варианта сохранены.');
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader kicker="Каталог" title="Вариант продукта" description="Загрузка деталей варианта." />
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Подготавливаем данные варианта." />
        </AdminSectionCard>
      </AdminPage>
    );
  }

  if (!product || !variant || !formValues) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Вариант продукта"
          description="Вариант не найден или недоступен."
          actions={
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/products"
            >
              К списку товаров
            </Link>
          }
        />
        <AdminSectionCard>
          <AdminEmptyState tone="destructive" title="Ошибка загрузки" description={errorMessage || 'Вариант не найден.'} />
        </AdminSectionCard>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Каталог
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/products">
          Продукты
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to={`/products/${product.id}`}>
          {product.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">{formValues.sku || variant.id}</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Детали варианта"
        description="Отдельное редактирование варианта продукта и его опций."
        actions={
          <>
            <AdminPageStatus>
              <span className="font-medium">ID варианта:</span> {variant.id}
            </AdminPageStatus>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to={`/products/${product.id}`}
            >
              К продукту
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Статус</p>
          <div className="mt-1">
            <Badge className={cn('border', getStatusClassName(formValues.isActive))}>{formValues.isActive ? 'Активен' : 'Выключен'}</Badge>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Текущая цена</p>
          <p className="mt-1 text-sm font-medium text-foreground">{variant.price === null ? '—' : formatPrice(variant.price)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Фотографий</p>
          <p className="mt-1 text-sm font-medium text-foreground">{variant.images.length}</p>
        </div>
      </section>

      <AdminSectionCard eyebrow="Вариант" title="Редактирование варианта" description="Изменения сохраняются отдельным API варианта.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="variant-sku" label="SKU">
            <Input
              id="variant-sku"
              value={formValues.sku}
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        sku: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="variant-title" label="Название">
            <Input
              id="variant-title"
              value={formValues.title}
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        title: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="variant-price" label="Цена (руб.)">
            <Input
              id="variant-price"
              value={formValues.price}
              inputMode="decimal"
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        price: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="variant-old-price" label="Старая цена (руб.)">
            <Input
              id="variant-old-price"
              value={formValues.oldPrice}
              inputMode="decimal"
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        oldPrice: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="variant-sort-order" label="Sort order">
            <Input
              id="variant-sort-order"
              value={formValues.sortOrder}
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        sortOrder: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="variant-external-id" label="External ID">
            <Input
              id="variant-external-id"
              value={formValues.externalId}
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        externalId: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="variant-active" label="Статус">
            <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-input px-2.5 text-sm">
              <input
                id="variant-active"
                type="checkbox"
                checked={formValues.isActive}
                disabled={isSaving}
                onChange={(event) => {
                  setFormValues((currentValues) =>
                    currentValues
                      ? {
                          ...currentValues,
                          isActive: event.target.checked,
                        }
                      : currentValues,
                  );
                  if (saveError) {
                    setSaveError('');
                  }
                }}
              />
              {formValues.isActive ? 'Активен' : 'Выключен'}
            </label>
          </FormField>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Опции"
        title="Выбор значений групп опций"
        description="Для каждой группы опций продукта нужно выбрать значение для варианта."
      >
        {product.optionGroups.length ? (
          <LazyDataTable
            columns={optionGroupColumns}
            data={product.optionGroups}
            getRowId={(row, index) => row.id ?? `${row.code}-${index}`}
            tableClassName="min-w-full border-separate border-spacing-0 text-sm"
            wrapperClassName="overflow-x-auto rounded-2xl border border-border/70 bg-background/70"
            headerRowClassName="bg-muted/50"
            bodyRowClassName="border-t border-border/60"
            getHeaderClassName={() => 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase'}
            getCellClassName={() => 'px-3 py-2 align-middle'}
          />
        ) : (
          <AdminEmptyState description="У продукта нет групп опций. Опции варианта изменить нельзя." />
        )}
      </AdminSectionCard>

      <AdminSectionCard eyebrow="Медиа" title="Фотографии варианта" description="Пока доступен только просмотр. Список передается без изменений при сохранении.">
        {variant.images.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {variant.images.map((image, imageIndex) => (
              <article key={image.id ?? `${image.url}-${imageIndex}`} className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                <img className="aspect-square w-full object-cover" src={image.url} alt={`${formValues.sku || 'Вариант'} • фото ${imageIndex + 1}`} />
                <div className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">Фото #{imageIndex + 1}</div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState description="У варианта нет фотографий." />
        )}
      </AdminSectionCard>

      <AdminSectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить вариант'}
          </Button>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => {
              setFormValues(buildVariantFormValues(product, variant));
              setSaveError('');
              setSaveSuccess('');
            }}
          >
            Сбросить изменения
          </Button>
        </div>

        {saveError ? <AdminNotice tone="destructive">{saveError}</AdminNotice> : null}
        {saveSuccess ? <AdminNotice>{saveSuccess}</AdminNotice> : null}
      </AdminSectionCard>

      {errorMessage ? <AdminNotice tone="destructive">{errorMessage}</AdminNotice> : null}
    </AdminPage>
  );
}
