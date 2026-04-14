import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import {
  getProductById,
  getProductOptionGroupById,
  saveProductOptionGroup,
  saveProductOptionValue,
  type Product,
  type ProductOptionGroup,
  type ProductOptionValue,
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

type OptionGroupFormValue = {
  id: string | null;
  code: string;
  title: string;
  sortOrder: string;
  values: Array<{
    id: string | null;
    code: string;
    title: string;
    sortOrder: string;
  }>;
};

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

function buildOptionGroupFormValues(optionGroup: ProductOptionGroup): OptionGroupFormValue {
  return {
    id: optionGroup.id,
    code: optionGroup.code,
    title: optionGroup.title,
    sortOrder: String(optionGroup.sortOrder),
    values: optionGroup.values.map((value) => ({
      id: value.id,
      code: value.code,
      title: value.title,
      sortOrder: String(value.sortOrder),
    })),
  };
}

function getStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

export function ProductOptionGroupDetailsPage() {
  const { productId, optionGroupId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [optionGroup, setOptionGroup] = useState<ProductOptionGroup | null>(null);
  const [formValues, setFormValues] = useState<OptionGroupFormValue | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const normalizedProductId = useMemo(() => (productId ?? '').trim(), [productId]);
  const normalizedOptionGroupId = useMemo(() => (optionGroupId ?? '').trim(), [optionGroupId]);

  useEffect(() => {
    const loadData = async () => {
      if (!isUuid(normalizedProductId) || !isUuid(normalizedOptionGroupId)) {
        setProduct(null);
        setOptionGroup(null);
        setFormValues(null);
        setErrorMessage('Некорректный идентификатор продукта или группы опций.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [productResult, optionGroupResult] = await Promise.all([
        getProductById(normalizedProductId),
        getProductOptionGroupById(normalizedProductId, normalizedOptionGroupId),
      ]);
      const nextErrors = [productResult.error, optionGroupResult.error].filter(Boolean).join(' ');

      setProduct(productResult.product);
      setOptionGroup(optionGroupResult.optionGroup);
      setFormValues(optionGroupResult.optionGroup ? buildOptionGroupFormValues(optionGroupResult.optionGroup) : null);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setIsLoading(false);
    };

    void loadData();
  }, [normalizedOptionGroupId, normalizedProductId]);

  const valuesColumns = useMemo<ColumnDef<OptionGroupFormValue['values'][number]>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => {
          const value = formValues?.values[row.index];

          if (!value) {
            return null;
          }

          return (
            <Input
              value={value.code}
              disabled={isSaving}
              onChange={(event) =>
                setFormValues((currentValues) => {
                  if (!currentValues) {
                    return currentValues;
                  }

                  return {
                    ...currentValues,
                    values: currentValues.values.map((item, itemIndex) =>
                      itemIndex === row.index
                        ? {
                            ...item,
                            code: event.target.value,
                          }
                        : item,
                    ),
                  };
                })
              }
            />
          );
        },
      },
      {
        id: 'title',
        header: 'Название',
        cell: ({ row }) => {
          const value = formValues?.values[row.index];

          if (!value) {
            return null;
          }

          return (
            <Input
              value={value.title}
              disabled={isSaving}
              onChange={(event) =>
                setFormValues((currentValues) => {
                  if (!currentValues) {
                    return currentValues;
                  }

                  return {
                    ...currentValues,
                    values: currentValues.values.map((item, itemIndex) =>
                      itemIndex === row.index
                        ? {
                            ...item,
                            title: event.target.value,
                          }
                        : item,
                    ),
                  };
                })
              }
            />
          );
        },
      },
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => {
          const value = formValues?.values[row.index];

          if (!value) {
            return null;
          }

          return (
            <Input
              value={value.sortOrder}
              disabled={isSaving}
              onChange={(event) =>
                setFormValues((currentValues) => {
                  if (!currentValues) {
                    return currentValues;
                  }

                  return {
                    ...currentValues,
                    values: currentValues.values.map((item, itemIndex) =>
                      itemIndex === row.index
                        ? {
                            ...item,
                            sortOrder: event.target.value,
                          }
                        : item,
                    ),
                  };
                })
              }
            />
          );
        },
      },
    ],
    [formValues?.values, isSaving],
  );

  const handleAddValue = () => {
    setFormValues((currentValues) => {
      if (!currentValues) {
        return currentValues;
      }

      return {
        ...currentValues,
        values: [...currentValues.values, { id: null, code: '', title: '', sortOrder: '0' }],
      };
    });

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleSave = async () => {
    if (!formValues || !optionGroup || !product) {
      return;
    }

    const normalizedCode = formValues.code.trim();
    const normalizedTitle = formValues.title.trim();
    const parsedSortOrder = parseInteger(formValues.sortOrder);

    if (!normalizedCode) {
      setSaveError('Укажите code группы опций.');
      return;
    }

    if (!normalizedTitle) {
      setSaveError('Укажите название группы опций.');
      return;
    }

    if (parsedSortOrder === null) {
      setSaveError('Sort order группы опций должен быть целым числом.');
      return;
    }

    const uniqueValueCodes = new Set<string>();
    const valuesToSave: ProductOptionValue[] = [];

    for (let index = 0; index < formValues.values.length; index += 1) {
      const value = formValues.values[index];
      const normalizedValueCode = value.code.trim();
      const normalizedValueTitle = value.title.trim();
      const parsedValueSortOrder = parseInteger(value.sortOrder);

      if (!normalizedValueCode) {
        setSaveError(`Укажите code для значения №${index + 1}.`);
        return;
      }

      if (!normalizedValueTitle) {
        setSaveError(`Укажите название для значения "${normalizedValueCode}".`);
        return;
      }

      if (parsedValueSortOrder === null) {
        setSaveError(`Sort order для значения "${normalizedValueCode}" должен быть целым числом.`);
        return;
      }

      if (uniqueValueCodes.has(normalizedValueCode)) {
        setSaveError(`Code значения "${normalizedValueCode}" должен быть уникальным.`);
        return;
      }

      uniqueValueCodes.add(normalizedValueCode);
      valuesToSave.push({
        id: value.id,
        code: normalizedValueCode,
        title: normalizedValueTitle,
        sortOrder: parsedValueSortOrder,
      });
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const saveGroupResult = await saveProductOptionGroup(normalizedProductId, {
      ...optionGroup,
      id: formValues.id,
      code: normalizedCode,
      title: normalizedTitle,
      sortOrder: parsedSortOrder,
      values: optionGroup.values,
    });

    if (!saveGroupResult.optionGroup || !saveGroupResult.optionGroup.id) {
      setSaveError(saveGroupResult.error ?? 'Не удалось сохранить группу опций.');
      setIsSaving(false);
      return;
    }

    for (const value of valuesToSave) {
      const saveValueResult = await saveProductOptionValue(normalizedProductId, saveGroupResult.optionGroup.id, value);

      if (!saveValueResult.optionValue) {
        setSaveError(saveValueResult.error ?? `Не удалось сохранить значение "${value.code}".`);
        setIsSaving(false);
        return;
      }
    }

    const refreshedOptionGroupResult = await getProductOptionGroupById(normalizedProductId, normalizedOptionGroupId);

    if (!refreshedOptionGroupResult.optionGroup) {
      setSaveError(refreshedOptionGroupResult.error ?? 'Группа опций сохранена, но не удалось обновить данные на экране.');
      setIsSaving(false);
      return;
    }

    setOptionGroup(refreshedOptionGroupResult.optionGroup);
    setFormValues(buildOptionGroupFormValues(refreshedOptionGroupResult.optionGroup));
    setProduct((currentProduct) => {
      if (!currentProduct) {
        return currentProduct;
      }

      return {
        ...currentProduct,
        optionGroups: currentProduct.optionGroups.map((group) =>
          group.id === refreshedOptionGroupResult.optionGroup?.id ? refreshedOptionGroupResult.optionGroup : group,
        ),
      };
    });
    setSaveSuccess('Изменения группы опций сохранены.');
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader kicker="Каталог" title="Группа опций" description="Загрузка деталей группы опций." />
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Подготавливаем группу опций и значения." />
        </AdminSectionCard>
      </AdminPage>
    );
  }

  if (!product || !optionGroup || !formValues) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Группа опций"
          description="Группа опций не найдена или недоступна."
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
          <AdminEmptyState tone="destructive" title="Ошибка загрузки" description={errorMessage || 'Группа опций не найдена.'} />
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
        <span className="text-foreground">{optionGroup.title || optionGroup.code}</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Детали группы опций"
        description="Утилитарный список значений и отдельное сохранение группы опций продукта."
        actions={
          <>
            <AdminPageStatus>
              <span className="font-medium">ID группы:</span> {optionGroup.id}
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
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Code</p>
          <p className="mt-1 text-sm font-medium text-foreground">{optionGroup.code}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Значений</p>
          <p className="mt-1 text-sm font-medium text-foreground">{optionGroup.values.length}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Статус продукта</p>
          <div className="mt-1">
            <Badge className={cn('border', getStatusClassName(product.isActive))}>{product.isActive ? 'Активен' : 'Выключен'}</Badge>
          </div>
        </div>
      </section>

      <AdminSectionCard eyebrow="Группа" title="Основные поля группы опций" description="Изменения применяются отдельно от деталей продукта и вариантов.">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField htmlFor="option-group-code" label="Code">
            <Input
              id="option-group-code"
              value={formValues.code}
              disabled={isSaving}
              onChange={(event) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        code: event.target.value,
                      }
                    : currentValues,
                );
                if (saveError) {
                  setSaveError('');
                }
              }}
            />
          </FormField>

          <FormField htmlFor="option-group-title" label="Название">
            <Input
              id="option-group-title"
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

          <FormField htmlFor="option-group-sort-order" label="Sort order">
            <Input
              id="option-group-sort-order"
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
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Значения"
        title="Утилитарный список значений группы"
        description="Удаление значений пока не поддерживается API. Можно добавлять и редактировать существующие значения."
        action={
          <Button variant="outline" onClick={handleAddValue} disabled={isSaving}>
            Добавить значение
          </Button>
        }
      >
        {formValues.values.length ? (
          <LazyDataTable
            columns={valuesColumns}
            data={formValues.values}
            getRowId={(row, index) => row.id ?? `${row.code}-${index}`}
            tableClassName="min-w-full border-separate border-spacing-0 text-sm"
            wrapperClassName="overflow-x-auto rounded-2xl border border-border/70 bg-background/70"
            headerRowClassName="bg-muted/50"
            bodyRowClassName="border-t border-border/60"
            getHeaderClassName={() => 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase'}
            getCellClassName={() => 'px-3 py-2 align-middle'}
          />
        ) : (
          <AdminEmptyState description="В группе пока нет значений. Добавьте первое значение." />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить группу и значения'}
          </Button>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => {
              setFormValues(buildOptionGroupFormValues(optionGroup));
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
