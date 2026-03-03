import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import {
  CatalogCategory,
  CatalogProduct,
  getCategories,
  getProductById,
  saveProduct,
} from '../catalog/catalogService';
import { buildCategoryLookup, formatPrice, formatUnitLabel } from '../catalog/catalogViewUtils';

type ProductFormValues = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  unit: string;
  displayWeight: string;
  countStep: string;
  sku: string;
};

const unitOptions = [
  { value: 'PIECE', label: 'шт' },
  { value: 'KILOGRAM', label: 'кг' },
  { value: 'GRAM', label: 'г' },
  { value: 'LITER', label: 'л' },
  { value: 'MILLILITER', label: 'мл' },
] as const;

function formatEditablePrice(price: number): string {
  const rawValue = (price / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function buildFormValues(product: CatalogProduct): ProductFormValues {
  return {
    categoryId: String(product.categoryId),
    title: product.title,
    description: product.description ?? '',
    price: formatEditablePrice(product.price),
    imageUrl: product.imageUrl ?? '',
    unit: product.unit,
    displayWeight: product.displayWeight ?? '',
    countStep: String(product.countStep),
    sku: product.sku ?? '',
  };
}

function parsePrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');
  const numericValue = Number(normalizedValue);

  if (!normalizedValue || Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

export function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [formValues, setFormValues] = useState<ProductFormValues | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const numericProductId = useMemo(() => Number(productId), [productId]);

  useEffect(() => {
    const loadProductDetails = async () => {
      if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
        setProduct(null);
        setCategories([]);
        setErrorMessage('Некорректный идентификатор товара.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [productResult, categoriesResult] = await Promise.all([
        getProductById(numericProductId),
        getCategories(),
      ]);

      const nextErrors = [productResult.error, categoriesResult.error].filter(Boolean).join(' ');

      setProduct(productResult.product);
      setFormValues(productResult.product ? buildFormValues(productResult.product) : null);
      setCategories(categoriesResult.categories);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setIsLoading(false);
    };

    void loadProductDetails();
  }, [numericProductId]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const categoryTitle = product ? categoryLookup.get(product.categoryId) ?? `#${product.categoryId}` : 'Не определена';
  const categoryOptions = useMemo(() => {
    const entries = Array.from(categoryLookup.entries());

    if (product && !categoryLookup.has(product.categoryId)) {
      entries.push([product.categoryId, `#${product.categoryId}`]);
    }

    return entries.sort((left, right) => left[1].localeCompare(right[1], 'ru'));
  }, [categoryLookup, product]);

  const handleFieldChange = (field: keyof ProductFormValues, value: string) => {
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

  const handleSave = async () => {
    if (!product || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = Number(formValues.categoryId);
    const normalizedCountStep = Number(formValues.countStep);
    const normalizedPrice = parsePrice(formValues.price);

    if (!normalizedTitle) {
      setSaveError('Укажите название товара.');
      return;
    }

    if (!Number.isInteger(normalizedCategoryId) || normalizedCategoryId <= 0) {
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
      unit: formValues.unit,
      displayWeight: formValues.displayWeight.trim() || null,
      countStep: normalizedCountStep,
      sku: formValues.sku.trim() || null,
    });

    if (result.product) {
      setProduct(result.product);
      setFormValues(buildFormValues(result.product));
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
              {product.imageUrl ? (
                <img className="product-detail-image" src={product.imageUrl} alt={product.title} />
              ) : (
                <div className="product-image-placeholder">Изображение отсутствует</div>
              )}
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
                <section className="product-edit-section" aria-label="Редактирование товара">
                  <div className="catalog-card-copy">
                    <p className="placeholder-eyebrow">Редактирование</p>
                    <h4 className="catalog-card-title">Изменить товар</h4>
                  </div>

                  <div className="product-edit-grid">
                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-title">
                        Название
                      </label>
                      <input
                        id="product-edit-title"
                        className="field-input"
                        value={formValues.title}
                        onChange={(event) => handleFieldChange('title', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-category">
                        Категория
                      </label>
                      <select
                        id="product-edit-category"
                        className="field-input"
                        value={formValues.categoryId}
                        onChange={(event) => handleFieldChange('categoryId', event.target.value)}
                        disabled={isSaving}
                      >
                        {categoryOptions.map(([id, title]) => (
                          <option key={id} value={id}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-price">
                        Цена, руб.
                      </label>
                      <input
                        id="product-edit-price"
                        className="field-input"
                        inputMode="decimal"
                        value={formValues.price}
                        onChange={(event) => handleFieldChange('price', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-unit">
                        Единица измерения
                      </label>
                      <select
                        id="product-edit-unit"
                        className="field-input"
                        value={formValues.unit}
                        onChange={(event) => handleFieldChange('unit', event.target.value)}
                        disabled={isSaving}
                      >
                        {unitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-step">
                        Шаг продажи
                      </label>
                      <input
                        id="product-edit-step"
                        className="field-input"
                        inputMode="numeric"
                        value={formValues.countStep}
                        onChange={(event) => handleFieldChange('countStep', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-weight">
                        Вес на витрине
                      </label>
                      <input
                        id="product-edit-weight"
                        className="field-input"
                        value={formValues.displayWeight}
                        onChange={(event) => handleFieldChange('displayWeight', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-sku">
                        SKU
                      </label>
                      <input
                        id="product-edit-sku"
                        className="field-input"
                        value={formValues.sku}
                        onChange={(event) => handleFieldChange('sku', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="product-edit-image">
                        Ссылка на изображение
                      </label>
                      <input
                        id="product-edit-image"
                        className="field-input"
                        value={formValues.imageUrl}
                        onChange={(event) => handleFieldChange('imageUrl', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="product-edit-description">
                      Описание
                    </label>
                    <textarea
                      id="product-edit-description"
                      className="field-input field-textarea"
                      value={formValues.description}
                      onChange={(event) => handleFieldChange('description', event.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  {saveError ? (
                    <p className="form-error" role="alert">
                      {saveError}
                    </p>
                  ) : null}

                  {saveSuccess ? (
                    <p className="form-success" role="status">
                      {saveSuccess}
                    </p>
                  ) : null}

                  <div className="product-edit-actions">
                    <button type="button" className="submit-button" onClick={() => void handleSave()} disabled={isSaving}>
                      {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                  </div>
                </section>
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
