import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import {
  buildProductEditorValues,
  parseProductPrice,
  ProductEditor,
  ProductEditorValues,
} from '../components/ProductEditor';
import {
  CatalogCategory,
  CatalogProduct,
  getCategories,
  getProductById,
  saveProduct,
} from '../catalog/catalogService';
import { buildCategoryLookup, formatPrice, formatUnitLabel } from '../catalog/catalogViewUtils';

export function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [formValues, setFormValues] = useState<ProductEditorValues | null>(null);
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
      setFormValues(productResult.product ? buildProductEditorValues(productResult.product) : null);
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
  };

  const handleSave = async () => {
    if (!product || !formValues) {
      return;
    }

    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = Number(formValues.categoryId);
    const normalizedCountStep = Number(formValues.countStep);
    const normalizedPrice = parseProductPrice(formValues.price);

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
                <ProductEditor
                  idPrefix="product-edit"
                  ariaLabel="Редактирование товара"
                  eyebrow="Редактирование"
                  title="Изменить товар"
                  categoryOptions={categoryOptions}
                  formValues={formValues}
                  isSaving={isSaving}
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
