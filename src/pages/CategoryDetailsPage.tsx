import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  buildCategoryEditorValues,
  CategoryEditor,
  CategoryEditorValues,
} from '../components/CategoryEditor';
import { NavBar } from '../components/NavBar';
import {
  CatalogCategory,
  getCategories,
  getCategoryById,
  saveCategory,
} from '../catalog/catalogService';
import { buildCategoryLookup, countCategoryNodes, countNestedProducts } from '../catalog/catalogViewUtils';

export function CategoryDetailsPage() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  const [formValues, setFormValues] = useState<CategoryEditorValues | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const numericCategoryId = useMemo(() => Number(categoryId), [categoryId]);

  useEffect(() => {
    const loadCategoryDetails = async () => {
      if (!Number.isInteger(numericCategoryId) || numericCategoryId <= 0) {
        setCategory(null);
        setFormValues(null);
        setCategories([]);
        setErrorMessage('Некорректный идентификатор категории.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [categoryResult, categoriesResult] = await Promise.all([
        getCategoryById(numericCategoryId),
        getCategories(),
      ]);

      const nextErrors = [categoryResult.error, categoriesResult.error].filter(Boolean).join(' ');

      setCategory(categoryResult.category);
      setFormValues(categoryResult.category ? buildCategoryEditorValues(categoryResult.category) : null);
      setCategories(categoriesResult.categories);
      setErrorMessage(nextErrors);
      setSaveError('');
      setSaveSuccess('');
      setIsLoading(false);
    };

    void loadCategoryDetails();
  }, [numericCategoryId]);

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const parentTitle =
    category?.parentCategory != null
      ? categoryLookup.get(category.parentCategory) ?? `#${category.parentCategory}`
      : null;
  const previewImageUrl = formValues ? formValues.imageUrl.trim() : category?.imageUrl ?? '';
  const nestedProducts = category ? countNestedProducts(category) : 0;
  const nestedCategories = category ? Math.max(0, countCategoryNodes([category]) - 1) : 0;

  const handleFieldChange = (field: keyof CategoryEditorValues, value: string) => {
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
      imageUrl: formValues.imageUrl.trim() || null,
      sku: formValues.sku.trim() || null,
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
          <section className="product-detail-layout">
            <section className="catalog-card product-media-card" aria-label="Изображение категории">
              {previewImageUrl ? (
                <img
                  className="product-detail-image"
                  src={previewImageUrl}
                  alt={formValues?.title || category.title}
                />
              ) : (
                <div className="product-image-placeholder">Изображение отсутствует</div>
              )}
            </section>

            <section className="catalog-card product-detail-card" aria-label="Информация о категории">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Категория</p>
                <h3 className="product-detail-title">{category.title}</h3>
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
                  <p className="detail-copy">SKU: {category.sku ?? 'Не указан'}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Структура</h4>
                  {category.parentCategory != null ? (
                    <p className="detail-copy">
                      Родитель:{' '}
                      <Link className="inline-link" to={`/categories/${category.parentCategory}`}>
                        {parentTitle ?? `#${category.parentCategory}`}
                      </Link>
                    </p>
                  ) : (
                    <p className="detail-copy">Родитель: корневая категория</p>
                  )}
                  <p className="detail-copy">Дочерних категорий: {category.children.length}</p>
                  <p className="detail-copy">Всего потомков: {nestedCategories}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">Связанные товары</h4>
                  <p className="detail-copy">Товаров в категории: {category.products.length}</p>
                  <p className="detail-copy">Товаров во всей ветке: {nestedProducts}</p>
                </div>

                <div className="detail-block">
                  <h4 className="detail-title">API</h4>
                  <p className="detail-copy">GET /catalog/category?id={category.id}</p>
                  <p className="detail-copy">POST /admin/catalog/category</p>
                </div>
              </div>

              {formValues ? (
                <CategoryEditor
                  idPrefix="category-edit"
                  ariaLabel="Редактирование категории"
                  eyebrow="Редактирование"
                  title="Изменить категорию"
                  description="Через текущий endpoint можно менять название, SKU и изображение. Связь с родителем остается только для чтения."
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
