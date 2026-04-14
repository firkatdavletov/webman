import { useState } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Category } from '@/entities/category';
import { saveCategory } from '@/entities/category';
import {
  CategoryEditor,
  type CategoryEditorValues,
  EMPTY_CATEGORY_EDITOR_VALUES,
  parseCategoryEditorSortOrder,
} from '@/features/category-editor';
import { cn } from '@/shared/lib/cn';
import { AdminPage, AdminPageHeader, AdminSectionCard, buttonVariants } from '@/shared/ui';

function DetailStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
      <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CategoryCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<CategoryEditorValues>(EMPTY_CATEGORY_EDITOR_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
    const normalizedSlug = formValues.slug.trim();
    const normalizedExternalId = formValues.externalId.trim();
    const normalizedDescription = formValues.description.trim();
    const { sortOrder, error: sortOrderError } = parseCategoryEditorSortOrder(formValues.sortOrder);

    if (!normalizedTitle) {
      setSaveError('Укажите название категории.');
      return;
    }

    if (sortOrderError) {
      setSaveError(sortOrderError);
      return;
    }

    setIsSaving(true);
    setSaveError('');

    const newCategory: Category = {
      id: '',
      parentCategory: null,
      externalId: normalizedExternalId || null,
      title: normalizedTitle,
      slug: normalizedSlug,
      description: normalizedDescription || null,
      sortOrder,
      isActive: formValues.isActive,
      images: [],
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
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Каталог
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Категории
        </Link>
        <span>/</span>
        <span className="text-foreground">Новая категория</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Новая категория"
        description="Новая категория создаётся как корневая. После сохранения откроется полная карточка с новым detail endpoint."
        actions={
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/categories">
            <ArrowLeftIcon className="size-4" />
            К списку категорий
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <CategoryEditor
          idPrefix="category-create"
          ariaLabel="Форма создания категории"
          eyebrow="Создание"
          title="Параметры категории"
          description="Используется тот же POST endpoint, что и на экране редактирования: можно сразу задать slug, externalId и sort order."
          formValues={formValues}
          isSaving={isSaving}
          saveError={saveError}
          submitLabel="Создать категорию"
          savingLabel="Создание..."
          onFieldChange={handleFieldChange}
          onIsActiveChange={handleIsActiveChange}
          onSubmit={() => void handleSave()}
        />

        <AdminSectionCard
          eyebrow="Контекст"
          title="Что будет после сохранения"
          description="Создание проходит через новый POST payload категории. Родительская категория по текущему API по-прежнему не задаётся."
        >
          <div className="grid gap-3">
            <DetailStat label="Тип" value="Корневая категория" hint="Поле `parentId` в текущем POST payload отсутствует." />
            <DetailStat label="Slug" value={formValues.slug.trim() || 'Будет сгенерирован backend'} />
            <DetailStat label="Внешний ID" value={formValues.externalId.trim() || 'Не задан'} />
            <DetailStat label="Sort order" value={formValues.sortOrder.trim() || 'Не задан'} />
            <DetailStat label="Статус" value={formValues.isActive ? 'Сразу активна' : 'Создаётся неактивной'} />
          </div>
        </AdminSectionCard>
      </div>
    </AdminPage>
  );
}
