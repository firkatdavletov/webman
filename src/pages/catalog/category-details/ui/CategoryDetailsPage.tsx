import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  buildCategoryLookup,
  completeCategoryImageUpload,
  getCategories,
  getCategoryById,
  initCategoryImageUpload,
  saveCategory,
  type Category,
  uploadCategoryImageToStorage,
} from '@/entities/category';
import {
  readFileAsDataUrl,
} from '@/entities/product';
import {
  buildCategoryEditorValues,
  CategoryEditor,
  type CategoryEditorValues,
} from '@/features/category-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { NavBar } from '@/shared/ui/NavBar';

const SUPPORTED_CATEGORY_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedCategoryId = useMemo(() => (categoryId ?? '').trim(), [categoryId]);

  useEffect(() => {
    const loadCategoryDetails = async () => {
      if (!isUuid(normalizedCategoryId)) {
        setCategory(null);
        setFormValues(null);
        setCategories([]);
        setErrorMessage('Некорректный идентификатор категории.');
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
      setIsImageUploading(false);
      setIsLoading(false);
    };

    void loadCategoryDetails();
  }, [normalizedCategoryId]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const parentTitle =
    category?.parentCategory != null ? categoryLookup.get(category.parentCategory) ?? `#${category.parentCategory}` : null;

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

        setCategory((currentCategory) =>
          currentCategory
            ? {
                ...currentCategory,
                images: [
                  ...currentCategory.images,
                  {
                    id: completeResult.image?.id ?? null,
                    url: previewDataUrl,
                  },
                ],
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

  const handleSave = async () => {
    if (!category || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();

    if (!normalizedTitle) {
      setSaveError('Укажите название категории.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveCategory({
      ...category,
      title: normalizedTitle,
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
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/categories">
            Каталог
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" to="/categories">
            Категории
          </Link>
          {category ? (
            <>
              {category.parentCategory != null ? (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <Link className="breadcrumb-link" to={`/categories/${category.parentCategory}`}>
                    {parentTitle ?? `#${category.parentCategory}`}
                  </Link>
                </>
              ) : null}
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{category.title}</span>
            </>
          ) : null}
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Карточка категории</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/categories">
              К списку категорий
            </Link>
          </div>
        </header>

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка карточки категории...</p>
          </section>
        ) : category ? (
          <section className="catalog-card product-detail-card" aria-label="Информация о категории">
            <div className="product-detail-hero">
              <div className="product-detail-media" aria-label="Фотографии категории">
                {category.images.length ? (
                  <div className="product-detail-image-list">
                    {category.images.map((image, imageIndex) => (
                      <img
                        key={`${image.url}-${imageIndex}`}
                        className="product-detail-image"
                        src={image.url}
                        alt={`${formValues?.title || category.title} • фото ${imageIndex + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="product-image-placeholder">Фотографии отсутствуют</div>
                )}

                <div className="product-media-actions">
                  <button
                    type="button"
                    className="secondary-button image-upload-button"
                    onClick={handleImageUploadClick}
                    disabled={isSaving || isImageUploading || !formValues}
                  >
                    {isImageUploading ? 'Загрузка...' : 'Загрузить фото'}
                  </button>
                  <input
                    ref={imageUploadInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="file-picker-input"
                    onChange={(event) => void handleImageUpload(event)}
                    disabled={isSaving || isImageUploading || !formValues}
                    tabIndex={-1}
                  />
                  {imageUploadError ? (
                    <p className="field-error" role="alert">
                      {imageUploadError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="catalog-card-copy product-detail-summary">
                <p className="placeholder-eyebrow">Категория</p>
                <h3 className="product-detail-title">{category.title}</h3>
              </div>
            </div>

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="product-detail-grid">
              <div className="detail-block">
                <h4 className="detail-title">Идентификаторы</h4>
                <p className="detail-copy">ID: {category.id}</p>
              </div>
            </div>

            {formValues ? (
              <CategoryEditor
                idPrefix="category-edit"
                ariaLabel="Редактирование категории"
                eyebrow="Редактирование"
                title="Изменить категорию"
                description="Через текущий endpoint можно менять название и активность. Изображение обновляется через загрузку файла."
                formValues={formValues}
                isSaving={isSaving || isImageUploading}
                saveError={saveError}
                saveSuccess={saveSuccess}
                submitLabel="Сохранить изменения"
                savingLabel="Сохранение..."
                onFieldChange={handleFieldChange}
                onIsActiveChange={handleIsActiveChange}
                onSubmit={() => void handleSave()}
              />
            ) : null}
          </section>
        ) : (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              {errorMessage || 'Категория не найдена.'}
            </p>
            <Link className="secondary-link" to="/categories">
              Вернуться к списку категорий
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
