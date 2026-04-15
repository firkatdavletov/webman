import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
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
  type ProductEditorValues,
  validateProductModifierGroupsSection,
  validateProductVariantsSection,
} from '@/features/product-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminSectionCard,
} from '@/shared/ui';

const ProductEditor = lazy(() =>
  import('@/features/product-editor/ui/ProductEditor').then((module) => ({
    default: module.ProductEditor,
  })),
);

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
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Каталог
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/products">
          Продукты
        </Link>
        <span>/</span>
        <span className="text-foreground">Новый товар</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Новый товар"
        actions={
          <Link
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            to="/products"
          >
            К списку товаров
          </Link>
        }
      />

      {isLoading ? (
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Загружаем список категорий..." />
        </AdminSectionCard>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Цена</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {parsedPrice === null ? 'Не указана' : formatPrice(parsedPrice)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Категория</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {selectedCategoryId ? (
                  <Link className="hover:underline" to={`/categories/${selectedCategoryId}`}>
                    {selectedCategoryTitle}
                  </Link>
                ) : (
                  'Не выбрана'
                )}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Единица</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatUnitLabel(formValues.unit) || 'Не выбрана'}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Модификаторы</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                Привязано: {formValues.modifierGroups.length} из {modifierGroups.length}
              </p>
            </div>
          </section>

          {errorMessage ? (
            <AdminNotice tone="destructive" role="alert">{errorMessage}</AdminNotice>
          ) : null}

          <Suspense
            fallback={
              <AdminSectionCard>
                <AdminEmptyState description="Загрузка редактора товара..." />
              </AdminSectionCard>
            }
          >
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
          </Suspense>
        </>
      )}
    </AdminPage>
  );
}
