import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Category } from '@/entities/category';
import { saveCategory } from '@/entities/category';
import {
  CategoryEditor,
  type CategoryEditorValues,
  EMPTY_CATEGORY_EDITOR_VALUES,
} from '@/features/category-editor';
import { NavBar } from '@/shared/ui/NavBar';

export function CategoryCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<CategoryEditorValues>(EMPTY_CATEGORY_EDITOR_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const normalizedImageUrl = formValues.imageUrl.trim();

  const handleFieldChange = (field: Exclude<keyof CategoryEditorValues, 'isActive'>, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    if (saveError) {
      setSaveError('');
    }
  };

  const handleIsActiveChange = (value: boolean) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      isActive: value,
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

    const newCategory: Category = {
      id: '',
      parentCategory: null,
      title: normalizedTitle,
      slug: '',
      isActive: formValues.isActive,
      imageUrl: normalizedImageUrl || null,
      products: [],
      children: [],
    };

    const result = await saveCategory(newCategory);

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
              <p className="detail-copy">POST /api/v1/admin/catalog/categories</p>
            </div>
          </div>
          <CategoryEditor
            idPrefix="category-create"
            ariaLabel="Форма создания категории"
            eyebrow="Создание"
            title="Новая категория"
            showImageUrlField={false}
            formValues={formValues}
            isSaving={isSaving}
            saveError={saveError}
            submitLabel="Создать категорию"
            savingLabel="Создание..."
            onFieldChange={handleFieldChange}
            onIsActiveChange={handleIsActiveChange}
            onSubmit={() => void handleSave()}
          />
        </section>
      </main>
    </div>
  );
}
