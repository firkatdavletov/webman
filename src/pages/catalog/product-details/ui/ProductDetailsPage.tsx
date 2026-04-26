import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import {
  formatModifierConstraints,
  type ModifierGroup,
  type ProductModifierGroupLink,
  getAllModifierGroups,
} from '@/entities/modifier-group';
import {
  completeProductImageUpload,
  deleteProductImage,
  formatPrice,
  formatUnitLabel,
  getProductById,
  initProductImageUpload,
  readFileAsDataUrl,
  saveProduct,
  type Product,
  uploadProductImageToStorage,
} from '@/entities/product';
import { cn } from '@/shared/lib/cn';
import { formatMinorToPriceInput, parseOptionalPriceInputToMinor, parsePriceInputToMinor } from '@/shared/lib/money/price';
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

type ProductModifierGroupFormValue = {
  modifierGroupId: string;
  sortOrder: string;
  isActive: boolean;
};

type ProductDetailsFormValues = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  isActive: boolean;
  unit: Product['unit'];
  countStep: string;
  sku: string;
  modifierGroups: ProductModifierGroupFormValue[];
};

type UtilityStatProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
};

const PRODUCT_UNIT_OPTIONS: Array<{ value: Product['unit']; label: string }> = [
  { value: 'PIECE', label: 'шт' },
  { value: 'KILOGRAM', label: 'кг' },
  { value: 'GRAM', label: 'г' },
  { value: 'LITER', label: 'л' },
  { value: 'MILLILITER', label: 'мл' },
];
const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CONTROL_CLASSNAME =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

function UtilityStat({ label, value, hint, className }: UtilityStatProps) {
  return (
    <div className={cn('rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4', className)}>
      <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
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

function buildProductFormValues(product: Product): ProductDetailsFormValues {
  return {
    categoryId: product.categoryId,
    title: product.title,
    description: product.description ?? '',
    price: formatMinorToPriceInput(product.price),
    oldPrice: formatMinorToPriceInput(product.oldPrice),
    isActive: product.isActive,
    unit: product.unit,
    countStep: String(product.countStep),
    sku: product.sku ?? '',
    modifierGroups: product.modifierGroups.map((group) => ({
      modifierGroupId: group.modifierGroupId,
      sortOrder: String(group.sortOrder),
      isActive: group.isActive,
    })),
  };
}

function getImageKey(imageId: string | null, imageUrl: string, imageIndex: number): string {
  return imageId?.trim() || `${imageUrl}-${imageIndex}`;
}

function getProductStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

export function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState<ProductDetailsFormValues | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [pendingImageRemovalKey, setPendingImageRemovalKey] = useState<string | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedProductId = useMemo(() => (productId ?? '').trim(), [productId]);

  useEffect(() => {
    const loadProductDetails = async () => {
      if (!isUuid(normalizedProductId)) {
        setProduct(null);
        setFormValues(null);
        setCategories([]);
        setModifierGroups([]);
        setErrorMessage('Некорректный идентификатор товара.');
        setPendingImageRemovalKey(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [productResult, categoriesResult, modifierGroupsResult] = await Promise.all([
        getProductById(normalizedProductId),
        getCategories(),
        getAllModifierGroups(),
      ]);
      const nextErrors = [productResult.error, categoriesResult.error, modifierGroupsResult.error].filter(Boolean).join(' ');

      setProduct(productResult.product);
      setFormValues(productResult.product ? buildProductFormValues(productResult.product) : null);
      setCategories(categoriesResult.categories);
      setModifierGroups(modifierGroupsResult.modifierGroups);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setImageUploadError('');
      setPendingImageRemovalKey(null);
      setIsImageUploading(false);
      setIsLoading(false);
    };

    void loadProductDetails();
  }, [normalizedProductId]);

  const isMutating = isSaving || isImageUploading || pendingImageRemovalKey !== null;
  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const categoryTitle = product ? categoryLookup.get(product.categoryId) ?? `#${product.categoryId}` : 'Не определена';
  const categoryOptions = useMemo(() => {
    const entries = Array.from(categoryLookup.entries());

    if (product && !categoryLookup.has(product.categoryId)) {
      entries.push([product.categoryId, `#${product.categoryId}`]);
    }

    return entries.sort((left, right) => left[1].localeCompare(right[1], 'ru'));
  }, [categoryLookup, product]);
  const modifierGroupLookup = useMemo(() => new Map(modifierGroups.map((group) => [group.id, group])), [modifierGroups]);

  const handleFormChange = (updater: (currentValues: ProductDetailsFormValues) => ProductDetailsFormValues) => {
    setFormValues((currentValues) => (currentValues ? updater(currentValues) : currentValues));

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }

    if (imageUploadError) {
      setImageUploadError('');
    }
  };

  const handleImageUploadClick = () => {
    imageUploadInputRef.current?.click();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!imageFiles.length || !product) {
      return;
    }

    if (imageFiles.some((imageFile) => !SUPPORTED_PRODUCT_IMAGE_TYPES.has(imageFile.type))) {
      setImageUploadError('Выберите изображение в формате JPG, PNG или WEBP.');
      return;
    }

    setImageUploadError('');
    setIsImageUploading(true);

    try {
      for (const imageFile of imageFiles) {
        const initResult = await initProductImageUpload({
          targetType: 'PRODUCT',
          targetId: product.id,
          contentType: imageFile.type,
          sizeBytes: imageFile.size,
          fileName: imageFile.name || null,
        });

        if (!initResult.upload) {
          setImageUploadError(initResult.error ?? 'Не удалось получить данные для загрузки изображения.');
          return;
        }

        const uploadData = initResult.upload;
        const storageUploadResult = await uploadProductImageToStorage({
          uploadUrl: uploadData.uploadUrl,
          requiredHeaders: uploadData.requiredHeaders,
          file: imageFile,
        });

        if (storageUploadResult.error) {
          setImageUploadError(storageUploadResult.error);
          return;
        }

        const completeResult = await completeProductImageUpload({
          uploadId: uploadData.uploadId,
        });

        if (completeResult.error) {
          setImageUploadError(completeResult.error);
          return;
        }

        const previewDataUrl = await readFileAsDataUrl(imageFile);

        setProduct((currentProduct) =>
          currentProduct
            ? {
                ...currentProduct,
                images: [
                  ...currentProduct.images,
                  {
                    id: completeResult.image?.id ?? null,
                    url: completeResult.image?.url || previewDataUrl,
                  },
                ],
              }
            : currentProduct,
        );
      }
    } catch {
      setImageUploadError('Не удалось обработать выбранный файл.');
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleImageRemove = async (imageIndex: number) => {
    if (!product) {
      return;
    }

    const image = product.images[imageIndex];

    if (!image) {
      return;
    }

    const imageKey = getImageKey(image.id, image.url, imageIndex);
    const normalizedImageId = image.id?.trim() ?? '';

    setImageUploadError('');
    setSaveError('');
    setSaveSuccess('');

    if (!normalizedImageId) {
      setProduct((currentProduct) =>
        currentProduct
          ? {
              ...currentProduct,
              images: currentProduct.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
            }
          : currentProduct,
      );
      return;
    }

    setPendingImageRemovalKey(imageKey);

    const result = await deleteProductImage(product.id, normalizedImageId);

    if (result.error) {
      setImageUploadError(result.error);
      setPendingImageRemovalKey(null);
      return;
    }

    setProduct((currentProduct) =>
      currentProduct
        ? {
            ...currentProduct,
            images: currentProduct.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
          }
        : currentProduct,
    );
    setPendingImageRemovalKey(null);
  };

  const handleAddModifierGroup = () => {
    handleFormChange((currentValues) => ({
      ...currentValues,
      modifierGroups: [...currentValues.modifierGroups, { modifierGroupId: '', sortOrder: '0', isActive: true }],
    }));
  };

  const handleRemoveModifierGroup = (index: number) => {
    handleFormChange((currentValues) => ({
      ...currentValues,
      modifierGroups: currentValues.modifierGroups.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (!product || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = formValues.categoryId.trim();
    const normalizedDescription = formValues.description.trim();
    const normalizedSku = formValues.sku.trim();
    const normalizedCountStep = parseInteger(formValues.countStep);
    const normalizedPrice = parsePriceInputToMinor(formValues.price);
    const normalizedOldPrice = parseOptionalPriceInputToMinor(formValues.oldPrice);

    if (!normalizedTitle) {
      setSaveError('Укажите название товара.');
      return;
    }

    if (!isUuid(normalizedCategoryId)) {
      setSaveError('Выберите корректную категорию.');
      return;
    }

    if (normalizedPrice === null) {
      setSaveError('Укажите корректную цену в рублях.');
      return;
    }

    if (normalizedOldPrice === undefined) {
      setSaveError('Укажите корректную старую цену в рублях или оставьте поле пустым.');
      return;
    }

    if (normalizedCountStep === null || normalizedCountStep <= 0) {
      setSaveError('Шаг продажи должен быть положительным целым числом.');
      return;
    }

    const selectedModifierGroupIds = new Set<string>();
    const nextModifierGroups: ProductModifierGroupLink[] = [];

    for (let index = 0; index < formValues.modifierGroups.length; index += 1) {
      const modifierGroup = formValues.modifierGroups[index];
      const normalizedModifierGroupId = modifierGroup.modifierGroupId.trim();
      const parsedSortOrder = parseInteger(modifierGroup.sortOrder);

      if (!normalizedModifierGroupId) {
        setSaveError(`Выберите группу модификаторов в строке №${index + 1}.`);
        return;
      }

      if (selectedModifierGroupIds.has(normalizedModifierGroupId)) {
        setSaveError('Одна и та же группа модификаторов не может быть привязана к товару несколько раз.');
        return;
      }

      const modifierDefinition = modifierGroupLookup.get(normalizedModifierGroupId) ?? null;

      if (!modifierDefinition) {
        setSaveError('Одна из выбранных групп модификаторов отсутствует в справочнике.');
        return;
      }

      if (parsedSortOrder === null) {
        setSaveError(`Sort order у модификатора №${index + 1} должен быть целым числом.`);
        return;
      }

      selectedModifierGroupIds.add(normalizedModifierGroupId);
      nextModifierGroups.push({
        modifierGroupId: normalizedModifierGroupId,
        code: modifierDefinition.code,
        name: modifierDefinition.name,
        minSelected: modifierDefinition.minSelected,
        maxSelected: modifierDefinition.maxSelected,
        isRequired: modifierDefinition.isRequired,
        isActive: modifierGroup.isActive,
        sortOrder: parsedSortOrder,
        options: [],
      });
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveProduct({
      ...product,
      categoryId: normalizedCategoryId,
      title: normalizedTitle,
      description: normalizedDescription || null,
      price: normalizedPrice,
      oldPrice: normalizedOldPrice ?? null,
      sku: normalizedSku || null,
      unit: formValues.unit,
      countStep: normalizedCountStep,
      isActive: formValues.isActive,
      modifierGroups: nextModifierGroups,
      images: product.images,
      optionGroups: product.optionGroups,
      variants: product.variants,
    });

    if (!result.product) {
      setSaveError(result.error ?? 'Не удалось сохранить изменения.');
      setIsSaving(false);
      return;
    }

    setProduct(result.product);
    setFormValues(buildProductFormValues(result.product));
    setSaveSuccess('Изменения сохранены.');
    setIsSaving(false);
  };

  const optionGroupColumns = useMemo<ColumnDef<Product['optionGroups'][number]>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => {
          const optionGroup = row.original;

          if (!optionGroup.id) {
            return optionGroup.code || '—';
          }

          return (
            <Link
              className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              to={`/products/${normalizedProductId}/option-groups/${optionGroup.id}`}
            >
              {optionGroup.code || `Группа #${row.index + 1}`}
            </Link>
          );
        },
      },
      {
        id: 'title',
        header: 'Название',
        cell: ({ row }) => row.original.title || '—',
      },
      {
        id: 'valuesCount',
        header: 'Значений',
        cell: ({ row }) => row.original.values.length,
      },
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => row.original.sortOrder,
      },
    ],
    [normalizedProductId],
  );

  const variantColumns = useMemo<ColumnDef<Product['variants'][number]>[]>(
    () => [
      {
        id: 'sku',
        header: 'SKU',
        cell: ({ row }) => {
          const variant = row.original;

          if (!variant.id) {
            return variant.sku || '—';
          }

          return (
            <Link
              className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              to={`/products/${normalizedProductId}/variants/${variant.id}`}
            >
              {variant.sku || `Вариант #${row.index + 1}`}
            </Link>
          );
        },
      },
      {
        id: 'title',
        header: 'Название',
        cell: ({ row }) => row.original.title || '—',
      },
      {
        id: 'price',
        header: 'Цена',
        cell: ({ row }) => (row.original.price === null ? '—' : formatPrice(row.original.price)),
      },
      {
        id: 'options',
        header: 'Опции',
        cell: ({ row }) => {
          if (!row.original.options.length) {
            return '—';
          }

          return row.original.options.map((option) => `${option.optionGroupCode}:${option.optionValueCode}`).join(', ');
        },
      },
      {
        id: 'status',
        header: 'Статус',
        cell: ({ row }) => (
          <Badge className={cn('border', getProductStatusClassName(row.original.isActive))}>
            {row.original.isActive ? 'Активен' : 'Выключен'}
          </Badge>
        ),
      },
    ],
    [normalizedProductId],
  );

  const modifierColumns = useMemo<ColumnDef<ProductModifierGroupFormValue>[]>(
    () => [
      {
        id: 'modifierGroupId',
        header: 'Группа',
        cell: ({ row }) => {
          const currentValue = formValues?.modifierGroups[row.index];

          if (!currentValue) {
            return null;
          }

          return (
            <select
              className={CONTROL_CLASSNAME}
              value={currentValue.modifierGroupId}
              disabled={isMutating}
              onChange={(event) =>
                handleFormChange((currentValues) => ({
                  ...currentValues,
                  modifierGroups: currentValues.modifierGroups.map((item, itemIndex) =>
                    itemIndex === row.index
                      ? {
                          ...item,
                          modifierGroupId: event.target.value,
                        }
                      : item,
                  ),
                }))
              }
            >
              <option value="">Выберите группу</option>
              {modifierGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </option>
              ))}
            </select>
          );
        },
      },
      {
        id: 'constraints',
        header: 'Ограничения',
        cell: ({ row }) => {
          const currentValue = formValues?.modifierGroups[row.index];

          if (!currentValue) {
            return '—';
          }

          const selectedModifierGroup = modifierGroupLookup.get(currentValue.modifierGroupId);

          return selectedModifierGroup ? formatModifierConstraints(selectedModifierGroup) : '—';
        },
      },
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => {
          const currentValue = formValues?.modifierGroups[row.index];

          if (!currentValue) {
            return null;
          }

          return (
            <Input
              value={currentValue.sortOrder}
              disabled={isMutating}
              onChange={(event) =>
                handleFormChange((currentValues) => ({
                  ...currentValues,
                  modifierGroups: currentValues.modifierGroups.map((item, itemIndex) =>
                    itemIndex === row.index
                      ? {
                          ...item,
                          sortOrder: event.target.value,
                        }
                      : item,
                  ),
                }))
              }
            />
          );
        },
      },
      {
        id: 'isActive',
        header: 'Активна',
        cell: ({ row }) => {
          const currentValue = formValues?.modifierGroups[row.index];

          if (!currentValue) {
            return null;
          }

          return (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                checked={currentValue.isActive}
                disabled={isMutating}
                onChange={(event) =>
                  handleFormChange((currentValues) => ({
                    ...currentValues,
                    modifierGroups: currentValues.modifierGroups.map((item, itemIndex) =>
                      itemIndex === row.index
                        ? {
                            ...item,
                            isActive: event.target.checked,
                          }
                        : item,
                    ),
                  }))
                }
              />
              {currentValue.isActive ? 'Да' : 'Нет'}
            </label>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" disabled={isMutating} onClick={() => handleRemoveModifierGroup(row.index)}>
            Удалить
          </Button>
        ),
      },
    ],
    [formValues?.modifierGroups, isMutating, modifierGroupLookup, modifierGroups],
  );

  if (isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader kicker="Каталог" title="Карточка товара" description="Загрузка данных карточки товара." />
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Подготавливаем информацию о товаре и связанных сущностях." />
        </AdminSectionCard>
      </AdminPage>
    );
  }

  if (!product || !formValues) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Карточка товара"
          description="Товар не найден или недоступен."
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
          <AdminEmptyState tone="destructive" title="Ошибка загрузки" description={errorMessage || 'Товар не найден.'} />
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
        <Link className="transition-colors hover:text-foreground" to={`/categories/${product.categoryId}`}>
          {categoryTitle}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.title}</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Детали продукта"
        description="Редактирование продукта вынесено отдельно от групп опций и вариантов."
        actions={
          <>
            <AdminPageStatus>
              <span className="font-medium">ID:</span> {product.id}
            </AdminPageStatus>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/products"
            >
              К списку товаров
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UtilityStat label="Статус" value={<Badge className={cn('border', getProductStatusClassName(formValues.isActive))}>{formValues.isActive ? 'Активен' : 'Выключен'}</Badge>} hint={`Категория: ${categoryTitle}`} />
        <UtilityStat label="Цена" value={formatPrice(product.price)} hint={`Единица: ${formatUnitLabel(product.unit)}`} />
        <UtilityStat label="Связанные группы" value={product.optionGroups.length} hint="Группы опций продукта" />
        <UtilityStat label="Варианты" value={product.variants.length} hint="Варианты продукта" />
      </section>

      <AdminSectionCard
        eyebrow="Медиа"
        title="Фотографии продукта"
        description="Загрузите или удалите фотографии карточки товара."
        action={
          <Button variant="outline" onClick={handleImageUploadClick} disabled={isMutating}>
            {isImageUploading ? 'Загрузка...' : 'Загрузить фото'}
          </Button>
        }
      >
        <input
          ref={imageUploadInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => void handleImageUpload(event)}
          disabled={isMutating}
          tabIndex={-1}
        />

        {product.images.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {product.images.map((image, imageIndex) => {
              const imageKey = getImageKey(image.id, image.url, imageIndex);
              const isRemovingCurrentImage = pendingImageRemovalKey === imageKey;

              return (
                <article key={imageKey} className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                  <img className="aspect-square w-full object-cover" src={image.url} alt={`${product.title} • фото ${imageIndex + 1}`} />
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
          <AdminEmptyState description="У товара пока нет загруженных фотографий." />
        )}

        {imageUploadError ? <AdminNotice tone="destructive">{imageUploadError}</AdminNotice> : null}
      </AdminSectionCard>

      <AdminSectionCard eyebrow="Продукт" title="Редактирование продукта" description="Сохраняются только поля продукта и связи модификаторов.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="product-title" label="Название">
            <Input
              id="product-title"
              value={formValues.title}
              disabled={isMutating}
              onChange={(event) => handleFormChange((currentValues) => ({ ...currentValues, title: event.target.value }))}
            />
          </FormField>

          <FormField htmlFor="product-category" label="Категория">
            <select
              id="product-category"
              className={CONTROL_CLASSNAME}
              value={formValues.categoryId}
              disabled={isMutating}
              onChange={(event) =>
                handleFormChange((currentValues) => ({
                  ...currentValues,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">Выберите категорию</option>
              {categoryOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="product-price" label="Цена (руб.)">
            <PriceInput
              id="product-price"
              value={formValues.price}
              disabled={isMutating}
              onValueChange={(value) => handleFormChange((currentValues) => ({ ...currentValues, price: value }))}
            />
          </FormField>

          <FormField htmlFor="product-old-price" label="Старая цена (руб.)">
            <PriceInput
              id="product-old-price"
              value={formValues.oldPrice}
              disabled={isMutating}
              onValueChange={(value) =>
                handleFormChange((currentValues) => ({
                  ...currentValues,
                  oldPrice: value,
                }))
              }
            />
          </FormField>

          <FormField htmlFor="product-unit" label="Единица измерения">
            <select
              id="product-unit"
              className={CONTROL_CLASSNAME}
              value={formValues.unit}
              disabled={isMutating}
              onChange={(event) =>
                handleFormChange((currentValues) => ({
                  ...currentValues,
                  unit: event.target.value as Product['unit'],
                }))
              }
            >
              {PRODUCT_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="product-count-step" label="Шаг продажи">
            <Input
              id="product-count-step"
              value={formValues.countStep}
              disabled={isMutating}
              onChange={(event) =>
                handleFormChange((currentValues) => ({
                  ...currentValues,
                  countStep: event.target.value,
                }))
              }
            />
          </FormField>

          <FormField htmlFor="product-sku" label="SKU">
            <Input
              id="product-sku"
              value={formValues.sku}
              disabled={isMutating}
              onChange={(event) => handleFormChange((currentValues) => ({ ...currentValues, sku: event.target.value }))}
            />
          </FormField>

          <FormField htmlFor="product-active" label="Статус">
            <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-input px-2.5 text-sm">
              <input
                id="product-active"
                type="checkbox"
                checked={formValues.isActive}
                disabled={isMutating}
                onChange={(event) =>
                  handleFormChange((currentValues) => ({
                    ...currentValues,
                    isActive: event.target.checked,
                  }))
                }
              />
              {formValues.isActive ? 'Активен' : 'Выключен'}
            </label>
          </FormField>
        </div>

        <FormField htmlFor="product-description" label="Описание">
          <textarea
            id="product-description"
            className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            value={formValues.description}
            disabled={isMutating}
            onChange={(event) =>
              handleFormChange((currentValues) => ({
                ...currentValues,
                description: event.target.value,
              }))
            }
          />
        </FormField>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleSave()} disabled={isMutating}>
            {isSaving ? 'Сохранение...' : 'Сохранить продукт'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!product) {
                return;
              }

              setFormValues(buildProductFormValues(product));
              setSaveError('');
              setSaveSuccess('');
            }}
            disabled={isMutating}
          >
            Сбросить изменения
          </Button>
        </div>

        {saveError ? <AdminNotice tone="destructive">{saveError}</AdminNotice> : null}
        {saveSuccess ? <AdminNotice>{saveSuccess}</AdminNotice> : null}
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Связи"
        title="Связанные группы модификаторов"
        description="Утилитарный список связей. Эти данные сохраняются вместе с продуктом."
        action={
          <Button variant="outline" onClick={handleAddModifierGroup} disabled={isMutating}>
            Добавить группу
          </Button>
        }
      >
        {formValues.modifierGroups.length ? (
          <LazyDataTable
            columns={modifierColumns}
            data={formValues.modifierGroups}
            tableClassName="min-w-full border-separate border-spacing-0 text-sm"
            wrapperClassName="overflow-x-auto rounded-2xl border border-border/70 bg-background/70"
            headerRowClassName="bg-muted/50"
            bodyRowClassName="border-t border-border/60"
            getHeaderClassName={() => 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase'}
            getCellClassName={() => 'px-3 py-2 align-middle'}
          />
        ) : (
          <AdminEmptyState description="Для продукта пока не выбраны группы модификаторов." />
        )}
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Связи"
        title="Связанные группы опций"
        description="Список групп опций продукта. Для редактирования откройте нужную группу."
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
          <AdminEmptyState description="У продукта нет связанных групп опций." />
        )}
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Связи"
        title="Связанные варианты"
        description="Список вариантов продукта. Для редактирования откройте нужный вариант."
      >
        {product.variants.length ? (
          <LazyDataTable
            columns={variantColumns}
            data={product.variants}
            getRowId={(row, index) => row.id ?? `${row.sku}-${index}`}
            tableClassName="min-w-full border-separate border-spacing-0 text-sm"
            wrapperClassName="overflow-x-auto rounded-2xl border border-border/70 bg-background/70"
            headerRowClassName="bg-muted/50"
            bodyRowClassName="border-t border-border/60"
            getHeaderClassName={() => 'px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase'}
            getCellClassName={() => 'px-3 py-2 align-middle'}
          />
        ) : (
          <AdminEmptyState description="У продукта нет вариантов." />
        )}
      </AdminSectionCard>

      {errorMessage ? <AdminNotice tone="destructive">{errorMessage}</AdminNotice> : null}
    </AdminPage>
  );
}
