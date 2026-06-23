import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type ModifierGroup, getAllModifierGroups } from '@/entities/modifier-group';
import {
  formatPrice,
  getProductById,
  saveProduct,
  type Product,
} from '@/entities/product';
import type { ProductWorkspaceMutationResult } from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import { BasicInformationSection } from '@/pages/catalog/product-workspace/ui/BasicInformationSection';
import { ProductMediaSection } from '@/pages/catalog/product-workspace/ui/ProductMediaSection';
import { ProductModifiersSection } from '@/pages/catalog/product-workspace/ui/ProductModifiersSection';
import { ProductPricingSection } from '@/pages/catalog/product-workspace/ui/ProductPricingSection';
import { ProductVariantsSection } from '@/pages/catalog/product-workspace/ui/ProductVariantsSection';
import { cn } from '@/shared/lib/cn';
import { getPrimaryMediaImageUrl } from '@/shared/lib/media/images';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
} from '@/shared/ui';

type WorkspaceSectionId = 'basic' | 'media' | 'pricing' | 'variants' | 'modifiers' | 'publishing';

type WorkspaceSection = {
  id: WorkspaceSectionId;
  label: string;
  hint: string;
};

type WorkspaceMetricProps = {
  label: string;
  value: string;
  hint?: string;
};

const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  { id: 'basic', label: 'Основное', hint: 'Название, категория, SKU' },
  { id: 'media', label: 'Медиа', hint: 'Фотографии продукта' },
  { id: 'pricing', label: 'Цена', hint: 'Цена и будущие остатки' },
  { id: 'variants', label: 'Варианты', hint: 'Опции и SKU' },
  { id: 'modifiers', label: 'Модификаторы', hint: 'Назначенные группы' },
  { id: 'publishing', label: 'Публикация', hint: 'Готовность карточки' },
];

function getProductTypeLabel(product: Product): string {
  return product.optionGroups.length || product.variants.length ? 'С вариантами' : 'Обычный';
}

function WorkspaceMetric({ label, value, hint }: WorkspaceMetricProps) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
      <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function buildPublishChecklist(product: Product): Array<{ label: string; isReady: boolean; detail: string }> {
  const hasVariants = Boolean(product.optionGroups.length || product.variants.length);

  return [
    {
      label: 'Основная информация',
      isReady: Boolean(product.title.trim() && product.categoryId.trim() && product.countStep > 0),
      detail: 'Название, категория и шаг продажи',
    },
    {
      label: 'Цена',
      isReady: product.price >= 0,
      detail: product.oldPrice === null ? 'Основная цена заполнена' : 'Основная и старая цена заполнены',
    },
    {
      label: 'Медиа',
      isReady: Boolean(product.images.length || product.variants.some((variant) => variant.images.length)),
      detail: `${product.images.length} фото продукта, ${product.variants.reduce((total, variant) => total + variant.images.length, 0)} фото вариантов`,
    },
    {
      label: 'Варианты',
      isReady: !hasVariants || Boolean(product.optionGroups.length && product.variants.length),
      detail: hasVariants ? `${product.optionGroups.length} групп, ${product.variants.length} вариантов` : 'Обычный товар без вариантов',
    },
    {
      label: 'Публикация',
      isReady: product.isActive,
      detail: product.isActive ? 'Товар отображается на витрине' : 'Товар выключен',
    },
  ];
}

export function ProductWorkspacePage() {
  const { productId } = useParams();
  const normalizedProductId = useMemo(() => (productId ?? '').trim(), [productId]);
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>('basic');
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [referenceErrorMessage, setReferenceErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const requestIdRef = useRef(0);

  const loadProduct = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}): Promise<ProductWorkspaceMutationResult> => {
    if (!isUuid(normalizedProductId)) {
      setProduct(null);
      setErrorMessage('Некорректный идентификатор товара.');
      setIsLoading(false);
      setIsRefreshing(false);
      return {
        product: null,
        error: 'Некорректный идентификатор товара.',
      };
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getProductById(normalizedProductId);

    if (requestId !== requestIdRef.current) {
      return {
        product: null,
        error: null,
      };
    }

    setProduct(result.product);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);

    return {
      product: result.product,
      error: result.error,
    };
  };

  const refreshProductSnapshot = async (): Promise<ProductWorkspaceMutationResult> => {
    if (!isUuid(normalizedProductId)) {
      const error = 'Некорректный идентификатор товара.';
      setErrorMessage(error);

      return {
        product: null,
        error,
      };
    }

    const result = await getProductById(normalizedProductId);

    if (result.product) {
      setProduct(result.product);
    }

    setErrorMessage(result.error ?? '');

    return {
      product: result.product,
      error: result.error,
    };
  };

  const saveProductAndRefetch = async (nextProduct: Product): Promise<ProductWorkspaceMutationResult> => {
    const saveResult = await saveProduct(nextProduct);

    if (!saveResult.product) {
      return {
        product: null,
        error: saveResult.error ?? 'Не удалось сохранить товар.',
      };
    }

    const refreshResult = await refreshProductSnapshot();

    if (!refreshResult.product) {
      setProduct(saveResult.product);

      return {
        product: saveResult.product,
        error: refreshResult.error
          ? `Изменения сохранены, но не удалось обновить снимок товара: ${refreshResult.error}`
          : saveResult.error,
      };
    }

    return {
      product: refreshResult.product,
      error: saveResult.error ?? refreshResult.error,
    };
  };

  useEffect(() => {
    void loadProduct({ showInitialLoader: true });
  }, [normalizedProductId]);

  useEffect(() => {
    let isMounted = true;

    const loadReferences = async () => {
      setIsReferenceLoading(true);

      const [categoriesResult, modifierGroupsResult] = await Promise.all([
        getCategories(),
        getAllModifierGroups(),
      ]);

      if (!isMounted) {
        return;
      }

      setCategories(categoriesResult.categories);
      setModifierGroups(modifierGroupsResult.modifierGroups);
      setReferenceErrorMessage([categoriesResult.error, modifierGroupsResult.error].filter(Boolean).join(' '));
      setIsReferenceLoading(false);
    };

    void loadReferences();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader kicker="Каталог" title="Рабочая область продукта" description="Загрузка снимка продукта." />
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Получаем продукт и связанные данные из текущего API." />
        </AdminSectionCard>
      </AdminPage>
    );
  }

  if (!product) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Рабочая область продукта"
          description="Продукт не найден или недоступен."
          actions={
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/products"
            >
              К списку товаров
            </Link>
          }
        />
        <AdminSectionCard>
          <AdminEmptyState tone="destructive" title="Ошибка загрузки" description={errorMessage || 'Товар не найден.'} />
        </AdminSectionCard>
      </AdminPage>
    );
  }

  const primaryImageUrl = getPrimaryMediaImageUrl(product.images);
  const publishChecklist = buildPublishChecklist(product);
  const readyChecklistItems = publishChecklist.filter((item) => item.isReady).length;
  const categoryLookup = buildCategoryLookup(categories);
  const categoryOptions = Array.from(categoryLookup.entries());

  if (!categoryLookup.has(product.categoryId)) {
    categoryOptions.push([product.categoryId, `#${product.categoryId}`]);
  }

  categoryOptions.sort((left, right) => left[1].localeCompare(right[1], 'ru'));

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
        <Link className="transition-colors hover:text-foreground" to={`/products/${product.id}`}>
          {product.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Рабочая область</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Рабочая область продукта"
        description="Новый каркас редактирования продукта: секции читают текущий снимок API, а рабочий редактор остается на прежнем маршруте."
        actions={
          <>
            <AdminPageStatus>
              <span className="font-medium">ID:</span> {product.id}
            </AdminPageStatus>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadProduct()}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить снимок'}
            </Button>
            <Link
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card/80 px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              to={`/products/${product.id}`}
            >
              Текущий редактор
            </Link>
          </>
        }
      />

      {errorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {errorMessage}
        </AdminNotice>
      ) : null}

      {referenceErrorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {referenceErrorMessage}
        </AdminNotice>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceMetric label="Статус" value={product.isActive ? 'Активен' : 'Выключен'} hint={getProductTypeLabel(product)} />
        <WorkspaceMetric label="Цена" value={formatPrice(product.price)} hint={product.oldPrice === null ? 'Старая цена не указана' : `Старая: ${formatPrice(product.oldPrice)}`} />
        <WorkspaceMetric label="Медиа" value={`${product.images.length} фото`} hint={primaryImageUrl ? 'Есть основное изображение' : 'Основное изображение не выбрано'} />
        <WorkspaceMetric label="Готовность" value={`${readyChecklistItems}/${publishChecklist.length}`} hint="Проверки текущего снимка" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <AdminSectionCard
          eyebrow="Секции"
          title="Навигация"
          description="Черновой каркас будущей рабочей области без замены текущего редактора."
          contentClassName="pt-4"
        >
          <div className="grid gap-2" role="group" aria-label="Секции рабочей области продукта">
            {WORKSPACE_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                  aria-pressed={isActive}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="block text-sm font-semibold">{section.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-current/75">{section.hint}</span>
                </button>
              );
            })}
          </div>
        </AdminSectionCard>

        <div className="min-w-0">
          {activeSection === 'basic' ? (
            <BasicInformationSection
              categoryOptions={categoryOptions}
              isReferenceLoading={isReferenceLoading}
              onSaveProduct={saveProductAndRefetch}
              product={product}
            />
          ) : null}

          {activeSection === 'media' ? (
            <ProductMediaSection onRefreshProduct={refreshProductSnapshot} product={product} />
          ) : null}

          {activeSection === 'pricing' ? (
            <ProductPricingSection onSaveProduct={saveProductAndRefetch} product={product} />
          ) : null}

          {activeSection === 'variants' ? (
            <ProductVariantsSection onRefreshProduct={refreshProductSnapshot} product={product} />
          ) : null}

          {activeSection === 'modifiers' ? (
            <ProductModifiersSection
              isReferenceLoading={isReferenceLoading}
              modifierGroups={modifierGroups}
              onSaveProduct={saveProductAndRefetch}
              product={product}
            />
          ) : null}

          {activeSection === 'publishing' ? (
            <AdminSectionCard
              eyebrow="Публикация"
              title="Проверки публикации"
              description="Черновой список проверок на основе текущего снимка продукта."
            >
              <div className="space-y-3">
                {publishChecklist.map((item) => (
                  <div key={item.label} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                    </div>
                    <Badge className={cn('border', item.isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                      {item.isReady ? 'Готово' : 'Требует внимания'}
                    </Badge>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
