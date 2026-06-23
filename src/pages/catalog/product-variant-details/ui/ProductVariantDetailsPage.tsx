import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import {
  deleteProductVariantImage,
  formatPrice,
  getProductById,
  getProductVariantById,
  saveProductVariant,
  type Product,
  type ProductOptionGroup,
  type ProductVariantDetails,
} from '@/entities/product';
import {
  PRODUCT_IMAGE_ACCEPT,
  uploadProductImageFile,
  validateProductImageFiles,
} from '@/features/product-media';
import { cn } from '@/shared/lib/cn';
import { formatMinorToPriceInput, parseOptionalPriceInputToMinor } from '@/shared/lib/money/price';
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
  PriceInput,
} from '@/shared/ui';

function getImageKey(imageId: string | null, imageUrl: string, imageIndex: number): string {
  return imageId?.trim() || `${imageUrl}-${imageIndex}`;
}

type VariantFormValues = {
  id: string;
  externalId: string;
  sku: string;
  title: string;
  price: string;
  oldPrice: string;
  sortOrder: string;
  isActive: boolean;
  selectedOptionValueByGroupCode: Record<string, string>;
};

const SELECT_CLASSNAME =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

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

function buildSelectedOptionValueByGroupCode(
  optionGroups: ProductOptionGroup[],
  variant: ProductVariantDetails,
): Record<string, string> {
  const selectedOptionValueByGroupCode: Record<string, string> = {};
  const selectedValueCodeByGroupCode = new Map(
    variant.options.map((option) => [option.optionGroupCode, option.optionValueCode]),
  );

  optionGroups.forEach((group) => {
    const selectedValueCode = selectedValueCodeByGroupCode.get(group.code);
    const selectedValueByCode = group.values.find((value) => value.code === selectedValueCode);
    const selectedValueById = group.values.find((value) => value.id && variant.optionValueIds.includes(value.id));

    selectedOptionValueByGroupCode[group.code] = selectedValueByCode?.code ?? selectedValueById?.code ?? '';
  });

  return selectedOptionValueByGroupCode;
}

function buildVariantFormValues(product: Product, variant: ProductVariantDetails): VariantFormValues {
  return {
    id: variant.id,
    externalId: variant.externalId ?? '',
    sku: variant.sku,
    title: variant.title ?? '',
    price: formatMinorToPriceInput(variant.price),
    oldPrice: formatMinorToPriceInput(variant.oldPrice),
    sortOrder: String(variant.sortOrder),
    isActive: variant.isActive,
    selectedOptionValueByGroupCode: buildSelectedOptionValueByGroupCode(product.optionGroups, variant),
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
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [pendingImageRemovalKey, setPendingImageRemovalKey] = useState<string | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  const isMutating = isSaving || isImageUploading || pendingImageRemovalKey !== null;

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
          if (!formValues) {
            return '—';
          }

          const selectedValue = formValues.selectedOptionValueByGroupCode[row.original.code] ?? '';

          return (
            <select
              className={SELECT_CLASSNAME}
              value={selectedValue}
              disabled={isMutating}
              onChange={(event) =>
                setFormValues((currentValues) => {
                  if (!currentValues) {
                    return currentValues;
                  }

                  return {
                    ...currentValues,
                    selectedOptionValueByGroupCode: {
                      ...currentValues.selectedOptionValueByGroupCode,
                      [row.original.code]: event.target.value,
                    },
                  };
                })
              }
            >
              <option value="">Не выбрано</option>
              {row.original.values.map((value) => (
                <option key={value.id ?? value.code} value={value.code}>
                  {value.title || value.code}
                </option>
              ))}
            </select>
          );
        },
      },
    ],
    [formValues, isMutating],
  );

  const handleImageUploadClick = () => {
    imageUploadInputRef.current?.click();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!imageFiles.length || !variant) {
      return;
    }

    const validationError = validateProductImageFiles(imageFiles);

    if (validationError) {
      setImageUploadError(validationError);
      return;
    }

    setImageUploadError('');
    setIsImageUploading(true);

    try {
      for (const imageFile of imageFiles) {
        const uploadResult = await uploadProductImageFile({
          targetType: 'VARIANT',
          targetId: normalizedVariantId,
          file: imageFile,
          includePreviewDataUrl: true,
          requireImage: false,
        });

        if (uploadResult.error) {
          setImageUploadError(uploadResult.error);
          return;
        }

        const imageUrl = uploadResult.image?.url || uploadResult.previewDataUrl;

        setVariant((currentVariant) =>
          currentVariant
            ? {
                ...currentVariant,
                images: [
                  ...currentVariant.images,
                  {
                    id: uploadResult.image?.id ?? null,
                    url: imageUrl ?? '',
                    thumbUrl: uploadResult.image?.thumbUrl ?? null,
                    cardUrl: uploadResult.image?.cardUrl ?? null,
                  },
                ],
              }
            : currentVariant,
        );
      }
    } catch {
      setImageUploadError('Не удалось обработать выбранный файл.');
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleImageRemove = async (imageIndex: number) => {
    if (!variant) {
      return;
    }

    const image = variant.images[imageIndex];

    if (!image) {
      return;
    }

    const imageKey = getImageKey(image.id, image.url, imageIndex);
    const normalizedImageId = image.id?.trim() ?? '';

    setImageUploadError('');
    setSaveError('');
    setSaveSuccess('');

    if (!normalizedImageId) {
      setVariant((currentVariant) =>
        currentVariant
          ? {
              ...currentVariant,
              images: currentVariant.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
            }
          : currentVariant,
      );
      return;
    }

    setPendingImageRemovalKey(imageKey);

    const result = await deleteProductVariantImage(normalizedProductId, normalizedVariantId, normalizedImageId);

    if (result.error) {
      setImageUploadError(result.error);
      setPendingImageRemovalKey(null);
      return;
    }

    setVariant((currentVariant) =>
      currentVariant
        ? {
            ...currentVariant,
            images: currentVariant.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
          }
        : currentVariant,
    );
    setPendingImageRemovalKey(null);
  };

  const handleSave = async () => {
    if (!product || !variant || !formValues) {
      return;
    }

    const normalizedSku = formValues.sku.trim();
    const normalizedTitle = formValues.title.trim();
    const normalizedExternalId = formValues.externalId.trim();
    const parsedSortOrder = parseInteger(formValues.sortOrder);
    const normalizedPrice = parseOptionalPriceInputToMinor(formValues.price);
    const normalizedOldPrice = parseOptionalPriceInputToMinor(formValues.oldPrice);

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

    const options: ProductVariantDetails['options'] = [];

    if (product.optionGroups.length) {
      for (const optionGroup of product.optionGroups) {
        if (!optionGroup.values.length) {
          continue;
        }

        const selectedValueCode = formValues.selectedOptionValueByGroupCode[optionGroup.code] ?? '';

        if (!selectedValueCode) {
          setSaveError(`Выберите значение для группы опций "${optionGroup.title || optionGroup.code}".`);
          return;
        }

        const hasSelectedValue = optionGroup.values.some((value) => value.code === selectedValueCode);

        if (!hasSelectedValue) {
          setSaveError(`Выбрано неизвестное значение для группы опций "${optionGroup.title || optionGroup.code}".`);
          return;
        }

        options.push({
          optionGroupCode: optionGroup.code,
          optionValueCode: selectedValueCode,
        });
      }
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
      optionValueIds: product.optionGroups.length ? [] : variant.optionValueIds,
      options: product.optionGroups.length ? options : variant.options,
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
              disabled={isMutating}
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
              disabled={isMutating}
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
            <PriceInput
              id="variant-price"
              value={formValues.price}
              disabled={isMutating}
              onValueChange={(value) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        price: value,
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
            <PriceInput
              id="variant-old-price"
              value={formValues.oldPrice}
              disabled={isMutating}
              onValueChange={(value) => {
                setFormValues((currentValues) =>
                  currentValues
                    ? {
                        ...currentValues,
                        oldPrice: value,
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
              disabled={isMutating}
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
              disabled={isMutating}
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
                disabled={isMutating}
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

      <AdminSectionCard
        eyebrow="Медиа"
        title="Фотографии варианта"
        description="Загрузите или удалите фотографии варианта товара."
        action={
          <Button variant="outline" onClick={handleImageUploadClick} disabled={isMutating}>
            {isImageUploading ? 'Загрузка...' : 'Загрузить фото'}
          </Button>
        }
      >
        <input
          ref={imageUploadInputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => void handleImageUpload(event)}
          disabled={isMutating}
          tabIndex={-1}
        />

        {variant.images.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {variant.images.map((image, imageIndex) => {
              const imageKey = getImageKey(image.id, image.url, imageIndex);
              const isRemovingCurrentImage = pendingImageRemovalKey === imageKey;

              return (
                <article key={imageKey} className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                  <img className="aspect-square w-full object-cover" src={image.url} alt={`${formValues.sku || 'Вариант'} • фото ${imageIndex + 1}`} />
                  <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Фото #{imageIndex + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleImageRemove(imageIndex)}
                      disabled={isMutating}
                    >
                      {isRemovingCurrentImage ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState description="У варианта нет фотографий." />
        )}

        {imageUploadError ? <AdminNotice tone="destructive">{imageUploadError}</AdminNotice> : null}
      </AdminSectionCard>

      <AdminSectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleSave()} disabled={isMutating}>
            {isSaving ? 'Сохранение...' : 'Сохранить вариант'}
          </Button>
          <Button
            variant="outline"
            disabled={isMutating}
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
