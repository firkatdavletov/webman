import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, XIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  buildCategoryLookup,
  completeCategoryImageUpload,
  deleteCategoryImage,
  getCategories,
  getCategoryById,
  initCategoryImageUpload,
  saveCategory,
  type Category,
  uploadCategoryImageToStorage,
} from '@/entities/category';
import { readFileAsDataUrl } from '@/entities/product';
import {
  buildCategoryEditorValues,
  CategoryEditor,
  parseCategoryEditorSortOrder,
  type CategoryEditorValues,
} from '@/features/category-editor';
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
  buttonVariants,
} from '@/shared/ui';

const SUPPORTED_CATEGORY_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function DetailStat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4', className)}>
      <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function getCategoryStatusBadgeClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

export function CategoryDetailsPage() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [formValues, setFormValues] = useState<CategoryEditorValues | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [pendingImageRemovalKey, setPendingImageRemovalKey] = useState<string | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedCategoryId = useMemo(() => (categoryId ?? '').trim(), [categoryId]);

  useEffect(() => {
    const loadCategoryDetails = async () => {
      if (!isUuid(normalizedCategoryId)) {
        setCategory(null);
        setFormValues(null);
        setCategories([]);
        setErrorMessage('Некорректный идентификатор категории.');
        setPendingImageRemovalKey(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [categoryResult, categoriesResult] = await Promise.all([getCategoryById(normalizedCategoryId), getCategories()]);
      const nextErrors = [categoryResult.error, categoriesResult.error].filter(Boolean).join(' ');

      setCategory(categoryResult.category);
      setFormValues(categoryResult.category ? buildCategoryEditorValues(categoryResult.category) : null);
      setCategories(categoriesResult.categories);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setImageUploadError('');
      setPendingImageRemovalKey(null);
      setIsImageUploading(false);
      setIsLoading(false);
    };

    void loadCategoryDetails();
  }, [normalizedCategoryId]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const parentTitle =
    category?.parentCategory != null ? categoryLookup.get(category.parentCategory) ?? `#${category.parentCategory}` : null;
  const previewTitle = formValues ? formValues.title.trim() : category?.title ?? '';
  const previewSlug = formValues ? formValues.slug.trim() : category?.slug ?? '';
  const previewExternalId = formValues ? formValues.externalId.trim() : category?.externalId ?? '';
  const previewDescription = formValues ? formValues.description.trim() : category?.description?.trim() ?? '';
  const previewSortOrder = formValues
    ? formValues.sortOrder.trim()
    : category?.sortOrder == null
      ? ''
      : String(category.sortOrder);
  const previewIsActive = formValues ? formValues.isActive : category?.isActive ?? true;

  const handleFieldChange = (field: Exclude<keyof CategoryEditorValues, 'isActive'>, value: string) => {
    setFormValues((currentValues) => {
      if (!currentValues) {
        return currentValues;
      }

      return {
        ...currentValues,
        [field]: value,
      };
    });

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleIsActiveChange = (value: boolean) => {
    setFormValues((currentValues) => {
      if (!currentValues) {
        return currentValues;
      }

      return {
        ...currentValues,
        isActive: value,
      };
    });

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleImageUploadClick = () => {
    imageUploadInputRef.current?.click();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!imageFiles.length || !formValues || !category) {
      return;
    }

    if (imageFiles.some((imageFile) => !SUPPORTED_CATEGORY_IMAGE_TYPES.has(imageFile.type))) {
      setImageUploadError('Выберите изображение в формате JPG, PNG или WEBP.');
      return;
    }

    setImageUploadError('');
    setIsImageUploading(true);

    try {
      for (const imageFile of imageFiles) {
        const initResult = await initCategoryImageUpload({
          categoryId: category.id,
          contentType: imageFile.type,
          sizeBytes: imageFile.size,
          fileName: imageFile.name || null,
        });

        if (!initResult.upload) {
          setImageUploadError(initResult.error ?? 'Не удалось получить данные для загрузки изображения.');
          return;
        }

        const uploadData = initResult.upload;
        const storageUploadResult = await uploadCategoryImageToStorage({
          uploadUrl: uploadData.uploadUrl,
          requiredHeaders: uploadData.requiredHeaders,
          file: imageFile,
        });

        if (storageUploadResult.error) {
          setImageUploadError(storageUploadResult.error);
          return;
        }

        const completeResult = await completeCategoryImageUpload({
          uploadId: uploadData.uploadId,
        });

        if (completeResult.error) {
          setImageUploadError(completeResult.error);
          return;
        }

        const previewDataUrl = await readFileAsDataUrl(imageFile);
        const uploadedImage = completeResult.image
          ? {
              ...completeResult.image,
              url: completeResult.image.url || previewDataUrl,
            }
          : {
              id: null,
              url: previewDataUrl,
            };

        setCategory((currentCategory) =>
          currentCategory
            ? {
                ...currentCategory,
                images: [...currentCategory.images, uploadedImage],
              }
            : currentCategory,
        );
      }
    } catch {
      setImageUploadError('Не удалось обработать выбранный файл.');
    } finally {
      setIsImageUploading(false);
    }
  };

  const getImageKey = (imageId: string | null, imageUrl: string, imageIndex: number) =>
    imageId?.trim() || `${imageUrl}-${imageIndex}`;

  const handleImageRemove = async (imageIndex: number) => {
    if (!category) {
      return;
    }

    const image = category.images[imageIndex];

    if (!image) {
      return;
    }

    const imageKey = getImageKey(image.id, image.url, imageIndex);
    const normalizedImageId = image.id?.trim() ?? '';

    setImageUploadError('');
    setSaveError('');
    setSaveSuccess('');

    if (!normalizedImageId) {
      setCategory((currentCategory) =>
        currentCategory
          ? {
              ...currentCategory,
              images: currentCategory.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
            }
          : currentCategory,
      );
      return;
    }

    setPendingImageRemovalKey(imageKey);

    const result = await deleteCategoryImage(category.id, normalizedImageId);

    if (result.error) {
      setImageUploadError(result.error);
      setPendingImageRemovalKey(null);
      return;
    }

    setCategory((currentCategory) =>
      currentCategory
        ? {
            ...currentCategory,
            images: currentCategory.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
          }
        : currentCategory,
    );
    setPendingImageRemovalKey(null);
  };

  const handleSave = async () => {
    if (!category || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();
    const normalizedSlug = formValues.slug.trim();
    const normalizedExternalId = formValues.externalId.trim();
    const normalizedDescription = formValues.description.trim();
    const { sortOrder, error: sortOrderError } = parseCategoryEditorSortOrder(formValues.sortOrder);

    if (!normalizedTitle) {
      setSaveError('Укажите название категории.');
      return;
    }

    if (sortOrderError) {
      setSaveError(sortOrderError);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveCategory({
      ...category,
      title: normalizedTitle,
      slug: normalizedSlug,
      externalId: normalizedExternalId || null,
      description: normalizedDescription || null,
      sortOrder,
      isActive: formValues.isActive,
      images: category.images,
    });

    if (result.category) {
      setCategory(result.category);
      setFormValues(buildCategoryEditorValues(result.category));
      setSaveSuccess('Изменения сохранены.');
    } else {
      setSaveError(result.error ?? 'Не удалось сохранить изменения.');
    }

    setIsSaving(false);
  };

  return (
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Каталог
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Категории
        </Link>
        {category ? (
          <>
            {category.parentCategory != null ? (
              <>
                <span>/</span>
                <Link className="transition-colors hover:text-foreground" to={`/categories/${category.parentCategory}`}>
                  {parentTitle ?? `#${category.parentCategory}`}
                </Link>
              </>
            ) : null}
            <span>/</span>
            <span className="text-foreground">{previewTitle || category.title}</span>
          </>
        ) : null}
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title={previewTitle || category?.title || 'Карточка категории'}
        description={
          category
            ? `${previewSlug ? `Slug ${previewSlug} • ` : ''}${category.parentCategory ? `Родитель ${parentTitle ?? `#${category.parentCategory}`} • ` : ''}ID ${category.id}`
            : 'Загружаем detail endpoint категории и связанные данные для редактирования.'
        }
        actions={
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/categories">
            <ArrowLeftIcon className="size-4" />
            К списку категорий
          </Link>
        }
      />

      {errorMessage && category ? <AdminNotice tone="destructive">{errorMessage}</AdminNotice> : null}

      {isLoading && !category ? (
        <AdminSectionCard title="Загрузка категории">
          <AdminEmptyState
            title="Подготавливаем карточку"
            description="Запрашиваем новый endpoint `/categories/{categoryId}`, сведения о родительской категории и медиа."
          />
        </AdminSectionCard>
      ) : null}

      {!isLoading && !category ? (
        <AdminSectionCard title="Категория не открыта">
          <AdminEmptyState
            tone="destructive"
            title="Не удалось получить данные категории"
            description={errorMessage || 'Карточка категории недоступна. Проверьте идентификатор или повторите запрос позже.'}
          />
        </AdminSectionCard>
      ) : null}

      {category && formValues ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'h-auto rounded-full border px-3 py-1.5 text-[0.78rem] font-medium',
                getCategoryStatusBadgeClassName(previewIsActive),
              )}
            >
              {previewIsActive ? 'Активна' : 'Неактивна'}
            </Badge>
            <AdminPageStatus>{category.images.length} фото</AdminPageStatus>
            <AdminPageStatus>{previewSortOrder ? `Sort order ${previewSortOrder}` : 'Sort order не задан'}</AdminPageStatus>
            <AdminPageStatus>{category.parentCategory ? 'Вложенная категория' : 'Корневая категория'}</AdminPageStatus>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.95fr)]">
            <div className="space-y-6">
              <AdminSectionCard
                eyebrow="Обзор"
                title="Сводка по категории"
                description="Данные карточки приходят из нового detail endpoint и показывают текущее состояние категории."
              >
                <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
                  <div className="space-y-2">
                    <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">Категория</p>
                    <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                      {previewTitle || 'Без названия'}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {previewDescription || 'Описание не заполнено. Категория сохранится без текстового описания.'}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailStat label="ID" value={<span className="break-all font-mono text-[0.82rem]">{category.id}</span>} />
                    <DetailStat
                      label="Slug"
                      value={previewSlug || 'Будет сгенерирован backend'}
                      hint={previewSlug ? 'Используется в ссылках и интеграциях.' : 'Сейчас поле пустое.'}
                    />
                    <DetailStat
                      label="Внешний ID"
                      value={previewExternalId || 'Не задан'}
                      hint="Поле из нового POST payload. Можно хранить внешний идентификатор интеграции."
                    />
                    <DetailStat
                      label="Родитель"
                      value={
                        category.parentCategory ? (
                          <Link className="transition-colors hover:text-primary" to={`/categories/${category.parentCategory}`}>
                            {parentTitle ?? `#${category.parentCategory}`}
                          </Link>
                        ) : (
                          'Корневая категория'
                        )
                      }
                    />
                    <DetailStat
                      label="Sort order"
                      value={previewSortOrder || 'Не задан'}
                      hint="Если поле пустое, backend получит null и применит свою логику сортировки."
                    />
                    <DetailStat
                      label="Статус"
                      value={previewIsActive ? 'Показывается на витрине' : 'Скрыта с витрины'}
                      hint="Состояние можно поменять без перезагрузки страницы."
                    />
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                eyebrow="Медиа"
                title="Изображения категории"
                description="Загрузка файла работает через media uploads, а при сохранении категории отправляются только `imageIds`."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 rounded-xl bg-background/80"
                    onClick={handleImageUploadClick}
                    disabled={isSaving || isImageUploading || pendingImageRemovalKey !== null}
                  >
                    {isImageUploading ? 'Загрузка...' : 'Загрузить фото'}
                  </Button>
                }
              >
                <input
                  ref={imageUploadInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(event) => void handleImageUpload(event)}
                  disabled={isSaving || isImageUploading || pendingImageRemovalKey !== null}
                  tabIndex={-1}
                />

                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Поддерживаются `JPG`, `PNG`, `WEBP`. Удаление выполняется сразу через отдельный endpoint, без общего сохранения формы.
                  </p>

                  {imageUploadError ? (
                    <AdminNotice tone="destructive" role="alert">
                      {imageUploadError}
                    </AdminNotice>
                  ) : null}

                  {category.images.length ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {category.images.map((image, imageIndex) => {
                        const imageKey = getImageKey(image.id, image.url, imageIndex);
                        const isRemoving = pendingImageRemovalKey === imageKey;

                        return (
                          <div
                            key={imageKey}
                            className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-background/80 shadow-sm"
                          >
                            <div className="relative">
                              <img
                                className="h-52 w-full object-cover"
                                src={image.url}
                                alt={`${previewTitle || category.title} • фото ${imageIndex + 1}`}
                              />
                              <button
                                type="button"
                                className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => void handleImageRemove(imageIndex)}
                                disabled={isSaving || isImageUploading || pendingImageRemovalKey !== null}
                                aria-label={`Удалить фото ${imageIndex + 1}`}
                                title="Удалить фото"
                              >
                                <XIcon className="size-4" />
                              </button>
                            </div>

                            <div className="space-y-1 px-4 py-3">
                              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                Фото {imageIndex + 1}
                              </p>
                              <p className="truncate text-sm font-medium text-foreground">
                                {isRemoving ? 'Удаляем изображение...' : image.id ? `imageId ${image.id}` : 'Локальное изображение'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <AdminEmptyState
                      title="Изображений пока нет"
                      description="Добавьте хотя бы одно изображение, если категория должна иметь свою обложку на витрине."
                    />
                  )}
                </div>
              </AdminSectionCard>
            </div>

            <div className="space-y-6">
              <CategoryEditor
                idPrefix="category-edit"
                ariaLabel="Редактирование категории"
                eyebrow="Редактирование"
                title="Изменить категорию"
                description="Сохранение использует новый POST payload: название, slug, externalId, описание, sort order, активность и `imageIds`."
                formValues={formValues}
                isSaving={isSaving || isImageUploading || pendingImageRemovalKey !== null}
                saveError={saveError}
                saveSuccess={saveSuccess}
                submitLabel="Сохранить изменения"
                savingLabel="Сохранение..."
                onFieldChange={handleFieldChange}
                onIsActiveChange={handleIsActiveChange}
                onSubmit={() => void handleSave()}
              />
            </div>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
