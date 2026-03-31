import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type ModifierGroup, getAllModifierGroups } from '@/entities/modifier-group';
import {
  completeProductImageUpload,
  formatPrice,
  formatUnitLabel,
  getProductById,
  initProductImageUpload,
  readFileAsDataUrl,
  saveProduct,
  type Product,
  uploadProductImageToStorage,
} from '@/entities/product';
import {
  buildProductEditorValues,
  mapProductEditorValuesToProductStructures,
  parseOptionalProductPrice,
  parseProductPrice,
  ProductEditor,
  type ProductEditorValues,
  validateProductModifierGroupsSection,
  validateProductVariantsSection,
} from '@/features/product-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { NavBar } from '@/shared/ui/NavBar';

const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState<ProductEditorValues | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isImageUploading, setIsImageUploading] = useState(false);
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

      const [productResult, categoriesResult, modifierGroupsResult] = await Promise.all([
        getProductById(normalizedProductId),
        getCategories(),
        getAllModifierGroups(),
      ]);
      const nextErrors = [productResult.error, categoriesResult.error, modifierGroupsResult.error].filter(Boolean).join(' ');

      setProduct(productResult.product);
      setFormValues(productResult.product ? buildProductEditorValues(productResult.product) : null);
      setCategories(categoriesResult.categories);
      setModifierGroups(modifierGroupsResult.modifierGroups);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setImageUploadError('');
      setIsImageUploading(false);
      setIsLoading(false);
    };

    void loadProductDetails();
  }, [normalizedProductId]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const categoryTitle = product ? categoryLookup.get(product.categoryId) ?? `#${product.categoryId}` : 'Не определена';
  const categoryOptions = useMemo(() => {
    const entries = Array.from(categoryLookup.entries());

    if (product && !categoryLookup.has(product.categoryId)) {
      entries.push([product.categoryId, `#${product.categoryId}`]);
    }

    return entries.sort((left, right) => left[1].localeCompare(right[1], 'ru'));
  }, [categoryLookup, product]);

  const handleValuesChange = (updater: (currentValues: ProductEditorValues) => ProductEditorValues) => {
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

    if (!imageFiles.length || !formValues || !product) {
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
                    url: previewDataUrl,
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

  const handleSave = async () => {
    if (!product || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = formValues.categoryId.trim();
    const normalizedCountStep = Number(formValues.countStep);
    const normalizedPrice = parseProductPrice(formValues.price);
    const normalizedOldPrice = parseOptionalProductPrice(formValues.oldPrice);

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

    if (!Number.isInteger(normalizedCountStep) || normalizedCountStep <= 0) {
      setSaveError('Шаг продажи должен быть положительным целым числом.');
      return;
    }

    if (!formValues.unit) {
      setSaveError('Выберите единицу измерения.');
      return;
    }

    const variantsValidationError = validateProductVariantsSection(formValues);

    if (variantsValidationError) {
      setSaveError(variantsValidationError);
      return;
    }

    const modifierGroupsValidationError = validateProductModifierGroupsSection(formValues, modifierGroups);

    if (modifierGroupsValidationError) {
      setSaveError(modifierGroupsValidationError);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const { optionGroups, modifierGroups: productModifierGroups, variants } = mapProductEditorValuesToProductStructures(
      formValues,
      modifierGroups,
    );

    const result = await saveProduct({
      ...product,
      categoryId: normalizedCategoryId,
      title: normalizedTitle,
      isActive: formValues.isActive,
      description: formValues.description.trim() || null,
      price: normalizedPrice,
      oldPrice: normalizedOldPrice ?? null,
      images: product.images,
      unit: formValues.unit as Product['unit'],
      displayWeight: formValues.displayWeight.trim() || null,
      countStep: normalizedCountStep,
      sku: formValues.sku.trim() || null,
      optionGroups,
      modifierGroups: productModifierGroups,
      variants,
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
          <section className="catalog-card product-detail-card" aria-label="Информация о товаре">
            <div className="product-detail-hero">
              <div className="product-detail-media" aria-label="Фотографии товара">
                {product.images.length ? (
                  <div className="product-detail-image-list">
                    {product.images.map((image, imageIndex) => (
                      <img
                        key={`${image.url}-${imageIndex}`}
                        className="product-detail-image"
                        src={image.url}
                        alt={`${formValues?.title || product.title} • фото ${imageIndex + 1}`}
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
                <p className="placeholder-eyebrow">Товар</p>
                <h3 className="product-detail-title">{product.title}</h3>
                <p className="product-detail-price">{formatPrice(product.price)}</p>
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
                <h4 className="detail-title">Модификаторы</h4>
                <p className="detail-copy">
                  Привязано групп: {product.modifierGroups.length} • В справочнике: {modifierGroups.length}
                </p>
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
                availableModifierGroups={modifierGroups}
                formValues={formValues}
                isSaving={isSaving || isImageUploading}
                optionGroupEditorMode="drawer"
                variantEditorMode="drawer"
                saveError={saveError}
                saveSuccess={saveSuccess}
                submitLabel="Сохранить изменения"
                savingLabel="Сохранение..."
                onValuesChange={handleValuesChange}
                onSubmit={() => void handleSave()}
              />
            ) : null}
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
