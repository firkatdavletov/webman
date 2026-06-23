import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeftIcon, FilePlus2Icon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { saveProduct, type Product } from '@/entities/product';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminSectionCard,
  Button,
  FormField,
  Input,
  Select,
  buttonVariants,
} from '@/shared/ui';

type ProductDraftFormValues = {
  title: string;
  categoryId: string;
};

type ProductDraftFieldErrors = Partial<Record<keyof ProductDraftFormValues, string>>;

type ValidatedProductDraftValues = {
  normalizedTitle: string;
  normalizedCategoryId: string;
};

const DEFAULT_PRODUCT_UNIT: Product['unit'] = 'PIECE';

function buildCategoryOptions(categories: Category[]): Array<[string, string]> {
  return Array.from(buildCategoryLookup(categories).entries()).sort((left, right) => left[1].localeCompare(right[1], 'ru'));
}

function buildInactiveDraftProduct(values: ValidatedProductDraftValues): Product {
  return {
    id: '',
    categoryId: values.normalizedCategoryId,
    title: values.normalizedTitle,
    slug: '',
    isActive: false,
    isConfigured: false,
    description: null,
    price: 0,
    oldPrice: null,
    images: [],
    unit: DEFAULT_PRODUCT_UNIT,
    displayWeight: null,
    countStep: 1,
    sku: null,
    defaultVariantId: null,
    optionGroups: [],
    modifierGroups: [],
    variants: [],
  };
}

function DraftMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
      <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ProductDraftCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<ProductDraftFormValues>({
    title: '',
    categoryId: '',
  });
  const [fieldErrors, setFieldErrors] = useState<ProductDraftFieldErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);
  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsLoading(true);
      setLoadError('');

      const result = await getCategories();

      if (!isMounted) {
        return;
      }

      setCategories(result.categories);
      setLoadError(result.error ?? '');
      setIsLoading(false);
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (formValues.categoryId || !categoryOptions.length) {
      return;
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      categoryId: categoryOptions[0][0],
    }));
  }, [categoryOptions, formValues.categoryId]);

  const handleFieldChange = (field: keyof ProductDraftFormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));

    if (saveError) {
      setSaveError('');
    }
  };

  const validateFormValues = (): ValidatedProductDraftValues | null => {
    const normalizedTitle = formValues.title.trim();
    const normalizedCategoryId = formValues.categoryId.trim();
    const nextFieldErrors: ProductDraftFieldErrors = {};

    if (!normalizedTitle) {
      nextFieldErrors.title = 'Укажите название товара.';
    }

    if (!normalizedCategoryId) {
      nextFieldErrors.categoryId = 'Выберите категорию.';
    } else if (!categoryLookup.has(normalizedCategoryId)) {
      nextFieldErrors.categoryId = 'Выбранная категория недоступна.';
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length) {
      return null;
    }

    return {
      normalizedTitle,
      normalizedCategoryId,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (!categoryOptions.length) {
      setSaveError('Сначала создайте хотя бы одну категорию.');
      return;
    }

    const validatedValues = validateFormValues();

    if (!validatedValues) {
      return;
    }

    setIsSaving(true);
    setSaveError('');

    const result = await saveProduct(buildInactiveDraftProduct(validatedValues));

    if (result.product) {
      navigate(`/products/${result.product.id}/workspace`, {
        replace: true,
      });
      return;
    }

    setSaveError(result.error ?? 'Не удалось создать черновик товара.');
    setIsSaving(false);
  };

  const selectedCategoryTitle = formValues.categoryId ? categoryLookup.get(formValues.categoryId) ?? 'Не выбрана' : 'Не выбрана';
  const canSubmit = !isLoading && !isSaving && Boolean(categoryOptions.length);

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
        description="Создайте выключенный черновик и продолжите заполнение в рабочей области продукта."
        actions={
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/products">
            <ArrowLeftIcon className="size-4" />
            К списку товаров
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
        <AdminSectionCard
          eyebrow="Черновик"
          title="Минимальные данные"
          description="После создания товар остается выключенным, а остальные разделы заполняются отдельно в рабочей области."
        >
          {isLoading ? (
            <AdminEmptyState title="Загрузка" description="Загружаем категории для нового товара." />
          ) : categoryOptions.length ? (
            <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
              {loadError ? (
                <AdminNotice tone="destructive" role="alert">
                  {loadError}
                </AdminNotice>
              ) : null}

              {saveError ? (
                <AdminNotice tone="destructive" role="alert">
                  {saveError}
                </AdminNotice>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <FormField htmlFor="product-draft-title" label="Название" error={fieldErrors.title}>
                  <Input
                    id="product-draft-title"
                    value={formValues.title}
                    placeholder="Например: Латте 300 мл"
                    disabled={isSaving}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'product-draft-title-error' : undefined}
                    autoFocus
                    onChange={(event) => handleFieldChange('title', event.target.value)}
                  />
                </FormField>

                <FormField htmlFor="product-draft-category" label="Категория" error={fieldErrors.categoryId}>
                  <Select
                    id="product-draft-category"
                    value={formValues.categoryId}
                    disabled={isSaving}
                    aria-invalid={Boolean(fieldErrors.categoryId)}
                    aria-describedby={fieldErrors.categoryId ? 'product-draft-category-error' : undefined}
                    onChange={(event) => handleFieldChange('categoryId', event.target.value)}
                  >
                    {categoryOptions.map(([categoryId, title]) => (
                      <option key={categoryId} value={categoryId}>
                        {title}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button type="submit" size="lg" className="rounded-xl" disabled={!canSubmit}>
                  <FilePlus2Icon className="size-4" />
                  {isSaving ? 'Создание...' : 'Создать черновик'}
                </Button>
              </div>
            </form>
          ) : (
            <AdminEmptyState
              title="Нет активных категорий"
              description="Создайте или включите категорию, чтобы добавить черновик товара."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Результат"
          title="Что создается"
          description="Черновик появится в каталоге неактивных товаров и откроется для дальнейшего заполнения."
        >
          <div className="grid gap-3">
            <DraftMetric label="Статус" value="Выключен" hint="Черновик не публикуется автоматически." />
            <DraftMetric label="Готовность" value="Не настроен" hint="Публикация остается отдельным шагом." />
            <DraftMetric label="Категория" value={selectedCategoryTitle} />
            <DraftMetric label="Цена" value="0" hint="Цены, медиа, варианты и модификаторы сохраняются отдельными секциями." />
          </div>

          {loadError ? (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-xl"
                disabled={isLoading}
                onClick={() => setLoadAttempt((currentAttempt) => currentAttempt + 1)}
              >
                Повторить загрузку категорий
              </Button>
            </div>
          ) : null}
        </AdminSectionCard>
      </div>
    </AdminPage>
  );
}
