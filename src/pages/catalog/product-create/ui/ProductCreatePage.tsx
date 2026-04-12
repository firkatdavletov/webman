import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type ModifierGroup, getAllModifierGroups } from '@/entities/modifier-group';
import {
  formatPrice,
  formatUnitLabel,
  saveProduct,
  type Product,
} from '@/entities/product';
import {
  EMPTY_PRODUCT_EDITOR_VALUES,
  mapProductEditorValuesToProductStructures,
  parseOptionalProductPrice,
  parseProductPrice,
  ProductEditor,
  type ProductEditorValues,
  validateProductModifierGroupsSection,
  validateProductVariantsSection,
} from '@/features/product-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [formValues, setFormValues] = useState<ProductEditorValues>(EMPTY_PRODUCT_EDITOR_VALUES);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const loadCategoriesData = async () => {
      setIsLoading(true);

      const [categoriesResult, modifierGroupsResult] = await Promise.all([getCategories(), getAllModifierGroups()]);
      const nextError = [categoriesResult.error, modifierGroupsResult.error].filter(Boolean).join(' ');

      setCategories(categoriesResult.categories);
      setModifierGroups(modifierGroupsResult.modifierGroups);
      setErrorMessage(nextError);
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
        categoryId: categoryOptions[0][0],
      }));
    }
  }, [categoryOptions, formValues.categoryId]);

  const selectedCategoryId = formValues.categoryId.trim();
  const selectedCategoryTitle = selectedCategoryId ? categoryLookup.get(selectedCategoryId) ?? `#${selectedCategoryId}` : 'Не выбрана';
  const parsedPrice = parseProductPrice(formValues.price);
  const parsedOldPrice = parseOptionalProductPrice(formValues.oldPrice);

  const handleValuesChange = (updater: (currentValues: ProductEditorValues) => ProductEditorValues) => {
    setFormValues((currentValues) => updater(currentValues));

    if (saveError) {
      setSaveError('');
    }
  };

  const handleSave = async () => {
    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = formValues.categoryId.trim();
    const normalizedCountStep = Number(formValues.countStep);

    if (!categoryOptions.length) {
      setSaveError('Сначала создайте хотя бы одну категорию.');
      return;
    }

    if (!normalizedTitle) {
      setSaveError('Укажите название товара.');
      return;
    }

    if (!isUuid(normalizedCategoryId)) {
      setSaveError('Выберите корректную категорию.');
      return;
    }

    if (parsedPrice === null) {
      setSaveError('Укажите корректную цену в рублях.');
      return;
    }

    if (parsedOldPrice === undefined) {
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

    const { optionGroups, modifierGroups: productModifierGroups, variants } = mapProductEditorValuesToProductStructures(
      formValues,
      modifierGroups,
    );

    const newProduct: Product = {
      id: '',
      categoryId: normalizedCategoryId,
      title: normalizedTitle,
      slug: '',
      isActive: formValues.isActive,
      description: formValues.description.trim() || null,
      price: parsedPrice,
      oldPrice: parsedOldPrice ?? null,
      images: [],
      unit: formValues.unit as Product['unit'],
      displayWeight: formValues.displayWeight.trim() || null,
      countStep: normalizedCountStep,
      sku: formValues.sku.trim() || null,
      defaultVariantId: null,
      optionGroups,
      modifierGroups: productModifierGroups,
      variants,
    };

    const result = await saveProduct(newProduct);

    if (result.product) {
      navigate(`/products/${result.product.id}`, { replace: true });
      return;
    }

    setSaveError(result.error ?? 'Не удалось создать товар.');
    setIsSaving(false);
  };

  return (
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
          <section className="catalog-card product-detail-card" aria-label="Создание товара">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Создание</p>
              <h3 className="product-detail-title">Новый товар</h3>
              <p className="product-detail-price">{parsedPrice === null ? 'Цена не указана' : formatPrice(parsedPrice)}</p>
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
                {selectedCategoryId ? (
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
              <h4 className="detail-title">Модификаторы</h4>
              <p className="detail-copy">
                Доступно групп: {modifierGroups.length} • Привязано к товару: {formValues.modifierGroups.length}
              </p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">API</h4>
              <p className="detail-copy">POST /api/v1/admin/catalog/products</p>
              </div>
            </div>
            <ProductEditor
              idPrefix="product-create"
              ariaLabel="Форма создания товара"
              eyebrow="Создание"
              title="Новый товар"
              categoryOptions={categoryOptions}
              availableModifierGroups={modifierGroups}
              formValues={formValues}
              isSaving={isSaving}
              disableCategorySelect={!categoryOptions.length}
              saveError={saveError}
              submitLabel="Создать товар"
              savingLabel="Создание..."
              onValuesChange={handleValuesChange}
              onSubmit={() => void handleSave()}
            />
          </section>
        )}
    </main>
  );
}
