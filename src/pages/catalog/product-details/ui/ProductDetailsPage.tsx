import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import {
  completeProductImageUpload,
  formatPrice,
  formatUnitLabel,
  getProductById,
  getProductImageAspectRatioError,
  initProductImageUpload,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  readFileAsDataUrl,
  saveProduct,
  type Product,
  uploadProductImageToStorage,
} from '@/entities/product';
import {
  buildProductEditorValues,
  parseProductPrice,
  ProductEditor,
  type ProductEditorValues,
} from '@/features/product-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { NavBar } from '@/shared/ui/NavBar';

const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState<ProductEditorValues | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [uploadedImagePreviewDataUrl, setUploadedImagePreviewDataUrl] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedProductId = useMemo(() => (productId ?? '').trim(), [productId]);

  useEffect(() => {
    const loadProductDetails = async () => {
      if (!isUuid(normalizedProductId)) {
        setProduct(null);
        setCategories([]);
        setErrorMessage('Некорректный идентификатор товара.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [productResult, categoriesResult] = await Promise.all([getProductById(normalizedProductId), getCategories()]);
      const nextErrors = [productResult.error, categoriesResult.error].filter(Boolean).join(' ');

      setProduct(productResult.product);
      setFormValues(productResult.product ? buildProductEditorValues(productResult.product) : null);
      setCategories(categoriesResult.categories);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setImageUploadError('');
      setUploadedImagePreviewDataUrl('');
      setIsImageUploading(false);
      setIsLoading(false);
    };

    void loadProductDetails();
  }, [normalizedProductId]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const categoryTitle = product ? categoryLookup.get(product.categoryId) ?? `#${product.categoryId}` : 'Не определена';
  const previewImageUrl = uploadedImagePreviewDataUrl || (formValues ? formValues.imageUrl.trim() : product?.imageUrl ?? '');
  const categoryOptions = useMemo(() => {
    const entries = Array.from(categoryLookup.entries());

    if (product && !categoryLookup.has(product.categoryId)) {
      entries.push([product.categoryId, `#${product.categoryId}`]);
    }

    return entries.sort((left, right) => left[1].localeCompare(right[1], 'ru'));
  }, [categoryLookup, product]);

  const handleFieldChange = (field: keyof ProductEditorValues, value: string) => {
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

    if (field === 'imageUrl' && imageUploadError) {
      setImageUploadError('');
    }
  };

  const handleImageUploadClick = () => {
    imageUploadInputRef.current?.click();
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    event.target.value = '';

    if (!imageFile || !formValues || !product) {
      return;
    }

    if (!SUPPORTED_PRODUCT_IMAGE_TYPES.has(imageFile.type)) {
      setImageUploadError('Выберите изображение в формате JPG, PNG или WEBP.');
      return;
    }

    if (imageFile.size <= 0 || imageFile.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      setImageUploadError('Размер изображения должен быть от 1 байта до 2 МБ.');
      return;
    }

    const aspectRatioError = await getProductImageAspectRatioError(imageFile);

    if (aspectRatioError) {
      setImageUploadError(aspectRatioError);
      return;
    }

    setImageUploadError('');
    setIsImageUploading(true);

    try {
      const initResult = await initProductImageUpload({
        productId: product.id,
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
              imageUrl: completeResult.imageUrl ?? uploadData.objectKey,
            }
          : currentProduct,
      );
      handleFieldChange('imageUrl', completeResult.imageUrl ?? uploadData.objectKey);
      setUploadedImagePreviewDataUrl(previewDataUrl);
    } catch {
      setImageUploadError('Не удалось обработать выбранный файл.');
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!product || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = formValues.categoryId.trim();
    const normalizedCountStep = Number(formValues.countStep);
    const normalizedPrice = parseProductPrice(formValues.price);

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

    if (!Number.isInteger(normalizedCountStep) || normalizedCountStep <= 0) {
      setSaveError('Шаг продажи должен быть положительным целым числом.');
      return;
    }

    if (!formValues.unit) {
      setSaveError('Выберите единицу измерения.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveProduct({
      ...product,
      categoryId: normalizedCategoryId,
      title: normalizedTitle,
      description: formValues.description.trim() || null,
      price: normalizedPrice,
      imageUrl: formValues.imageUrl.trim() || null,
      unit: formValues.unit as Product['unit'],
      displayWeight: formValues.displayWeight.trim() || null,
      countStep: normalizedCountStep,
      sku: formValues.sku.trim() || null,
    });

    if (result.product) {
      setProduct(result.product);
      setFormValues(buildProductEditorValues(result.product));
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
          <Link className="breadcrumb-link" to="/products">
            Продукты
          </Link>
          {product ? (
            <>
              <span className="breadcrumb-separator">/</span>
              <Link className="breadcrumb-link" to={`/categories/${product.categoryId}`}>
                {categoryTitle}
              </Link>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{product.title}</span>
            </>
          ) : null}
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Карточка товара</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/products">
              К списку товаров
            </Link>
          </div>
        </header>

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка карточки товара...</p>
          </section>
        ) : product ? (
          <section className="product-detail-layout">
            <section className="catalog-card product-media-card" aria-label="Изображение товара">
              {previewImageUrl ? (
                <img className="product-detail-image" src={previewImageUrl} alt={formValues?.title || product.title} />
              ) : (
                <div className="product-image-placeholder">Изображение отсутствует</div>
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
            </section>

            <section className="catalog-card product-detail-card" aria-label="Информация о товаре">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Товар</p>
                <h3 className="product-detail-title">{product.title}</h3>
                <p className="product-detail-price">{formatPrice(product.price)}</p>
              </div>

              {errorMessage ? (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="product-detail-grid">
                <div className="detail-block">
                  <h4 className="detail-title">Идентификаторы</h4>
                  <p className="detail-copy">ID: {product.id}</p>
                  <p className="detail-copy">SKU: {product.sku ?? 'Не указан'}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Категория и единица</h4>
                  <p className="detail-copy">
                    Категория:{' '}
                    <Link className="inline-link" to={`/categories/${product.categoryId}`}>
                      {categoryTitle}
                    </Link>
                  </p>
                  <p className="detail-copy">Единица: {formatUnitLabel(product.unit)}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Параметры продажи</h4>
                  <p className="detail-copy">Шаг: {product.countStep}</p>
                  <p className="detail-copy">Вес на витрине: {product.displayWeight ?? 'Не указан'}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Описание</h4>
                  <p className="detail-copy">{product.description ?? 'Описание отсутствует.'}</p>
                </div>
              </div>

              {formValues ? (
                <ProductEditor
                  idPrefix="product-edit"
                  ariaLabel="Редактирование товара"
                  eyebrow="Редактирование"
                  title="Изменить товар"
                  categoryOptions={categoryOptions}
                  formValues={formValues}
                  isSaving={isSaving || isImageUploading}
                  saveError={saveError}
                  saveSuccess={saveSuccess}
                  submitLabel="Сохранить изменения"
                  savingLabel="Сохранение..."
                  onFieldChange={handleFieldChange}
                  onSubmit={() => void handleSave()}
                />
              ) : null}
            </section>
          </section>
        ) : (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              {errorMessage || 'Товар не найден.'}
            </p>
            <Link className="secondary-link" to="/products">
              Вернуться к списку товаров
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
