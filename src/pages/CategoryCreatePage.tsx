import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CategoryEditor,
  CategoryEditorValues,
  EMPTY_CATEGORY_EDITOR_VALUES,
} from '../components/CategoryEditor';
import { NavBar } from '../components/NavBar';
import { saveCategory } from '../catalog/catalogService';

export function CategoryCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<CategoryEditorValues>(EMPTY_CATEGORY_EDITOR_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const previewImageUrl = formValues.imageUrl.trim();

  const handleFieldChange = (field: keyof CategoryEditorValues, value: string) => {
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

    if (!normalizedTitle) {
      setSaveError('Укажите название категории.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    const result = await saveCategory({
      id: 0,
      parentCategory: null,
      title: normalizedTitle,
      imageUrl: previewImageUrl || null,
      products: [],
      children: [],
      sku: formValues.sku.trim() || null,
    });

    if (result.category) {
      navigate(`/categories/${result.category.id}`, { replace: true });
      return;
    }

    setSaveError(result.error ?? 'Не удалось создать категорию.');
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
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Новая категория</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Новая категория</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/categories">
              К списку категорий
            </Link>
          </div>
        </header>

        <section className="product-detail-layout">
          <section className="catalog-card product-media-card" aria-label="Изображение новой категории">
            {previewImageUrl ? (
              <img className="product-detail-image" src={previewImageUrl} alt={formValues.title || 'Новая категория'} />
            ) : (
              <div className="product-image-placeholder">Изображение отсутствует</div>
            )}
          </section>

          <section className="catalog-card product-detail-card" aria-label="Создание категории">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Создание</p>
              <h3 className="product-detail-title">Новая категория</h3>
              <p className="catalog-meta">Новая категория будет создана как корневая. Назначение родителя текущий API не поддерживает.</p>
            </div>

            <div className="product-detail-grid">
              <div className="detail-block">
                <h4 className="detail-title">Идентификатор</h4>
                <p className="detail-copy">ID будет назначен после сохранения.</p>
              </div>

              <div className="detail-block">
                <h4 className="detail-title">API</h4>
                <p className="detail-copy">POST /admin/catalog/category</p>
              </div>
            </div>
            <CategoryEditor
              idPrefix="category-create"
              ariaLabel="Форма создания категории"
              eyebrow="Создание"
              title="Новая категория"
              formValues={formValues}
              isSaving={isSaving}
              saveError={saveError}
              submitLabel="Создать категорию"
              savingLabel="Создание..."
              onFieldChange={handleFieldChange}
              onSubmit={() => void handleSave()}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
