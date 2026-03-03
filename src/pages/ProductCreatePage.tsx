import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import {
  EMPTY_PRODUCT_EDITOR_VALUES,
  parseProductPrice,
  ProductEditor,
  ProductEditorValues,
} from '../components/ProductEditor';
import { CatalogCategory, getCategories, saveProduct } from '../catalog/catalogService';
import { buildCategoryLookup, formatPrice, formatUnitLabel } from '../catalog/catalogViewUtils';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [formValues, setFormValues] = useState<ProductEditorValues>(EMPTY_PRODUCT_EDITOR_VALUES);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const loadCategoriesData = async () => {
      setIsLoading(true);

      const result = await getCategories();

      setCategories(result.categories);
      setErrorMessage(result.error ?? '');
      setIsLoading(false);
    };

    void loadCategoriesData();
  }, []);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const categoryOptions = useMemo(
    () => Array.from(categoryLookup.entries()).sort((left, right) => left[1].localeCompare(right[1], 'ru')),
    [categoryLookup],
  );

  useEffect(() => {
    if (!formValues.categoryId && categoryOptions.length) {
      setFormValues((currentValues) => ({
        ...currentValues,
        categoryId: String(categoryOptions[0][0]),
      }));
    }
  }, [categoryOptions, formValues.categoryId]);

  const selectedCategoryId = Number(formValues.categoryId);
  const selectedCategoryTitle =
    Number.isInteger(selectedCategoryId) && selectedCategoryId > 0
      ? categoryLookup.get(selectedCategoryId) ?? `#${selectedCategoryId}`
      : 'Не выбрана';
  const parsedPrice = parseProductPrice(formValues.price);
  const previewImageUrl = formValues.imageUrl.trim();

  const handleFieldChange = (field: keyof ProductEditorValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    if (saveError) {
      setSaveError('');
    }
  };

  const handleSave = async () => {
    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = Number(formValues.categoryId);
    const normalizedCountStep = Number(formValues.countStep);

    if (!categoryOptions.length) {
      setSaveError('Сначала создайте хотя бы одну категорию.');
      return;
    }

    if (!normalizedTitle) {
      setSaveError('Укажите название товара.');
      return;
    }

    if (!Number.isInteger(normalizedCategoryId) || normalizedCategoryId <= 0) {
      setSaveError('Выберите корректную категорию.');
      return;
    }

    if (parsedPrice === null) {
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

    const result = await saveProduct({
      id: 0,
      categoryId: normalizedCategoryId,
      title: normalizedTitle,
      description: formValues.description.trim() || null,
      price: parsedPrice,
      imageUrl: previewImageUrl || null,
      unit: formValues.unit,
      displayWeight: formValues.displayWeight.trim() || null,
      countStep: normalizedCountStep,
      sku: formValues.sku.trim() || null,
    });

    if (result.product) {
      navigate(`/products/${result.product.id}`, { replace: true });
      return;
    }

    setSaveError(result.error ?? 'Не удалось создать товар.');
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
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Новый товар</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Новый товар</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/products">
              К списку товаров
            </Link>
          </div>
        </header>

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка списка категорий...</p>
          </section>
        ) : (
          <section className="product-detail-layout">
            <section className="catalog-card product-media-card" aria-label="Изображение нового товара">
              {previewImageUrl ? (
                <img className="product-detail-image" src={previewImageUrl} alt={formValues.title || 'Новый товар'} />
              ) : (
                <div className="product-image-placeholder">Изображение отсутствует</div>
              )}
            </section>

            <section className="catalog-card product-detail-card" aria-label="Создание товара">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Создание</p>
                <h3 className="product-detail-title">Новый товар</h3>
                <p className="product-detail-price">
                  {parsedPrice === null ? 'Цена не указана' : formatPrice(parsedPrice)}
                </p>
              </div>

              {errorMessage ? (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="product-detail-grid">
                <div className="detail-block">
                  <h4 className="detail-title">Идентификатор</h4>
                  <p className="detail-copy">ID будет назначен после сохранения.</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Категория и единица</h4>
                  {Number.isInteger(selectedCategoryId) && selectedCategoryId > 0 ? (
                    <p className="detail-copy">
                      Категория:{' '}
                      <Link className="inline-link" to={`/categories/${selectedCategoryId}`}>
                        {selectedCategoryTitle}
                      </Link>
                    </p>
                  ) : (
                    <p className="detail-copy">Категория: не выбрана</p>
                  )}
                  <p className="detail-copy">Единица: {formatUnitLabel(formValues.unit)}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Параметры продажи</h4>
                  <p className="detail-copy">Шаг: {formValues.countStep || 'Не указан'}</p>
                  <p className="detail-copy">Вес на витрине: {formValues.displayWeight.trim() || 'Не указан'}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">API</h4>
                  <p className="detail-copy">POST /admin/catalog/product</p>
                </div>
              </div>
              <ProductEditor
                idPrefix="product-create"
                ariaLabel="Форма создания товара"
                eyebrow="Создание"
                title="Новый товар"
                categoryOptions={categoryOptions}
                formValues={formValues}
                isSaving={isSaving}
                disableCategorySelect={!categoryOptions.length}
                saveError={saveError}
                submitLabel="Создать товар"
                savingLabel="Создание..."
                onFieldChange={handleFieldChange}
                onSubmit={() => void handleSave()}
              />
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
