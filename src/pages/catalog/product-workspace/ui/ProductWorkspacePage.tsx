import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatPrice,
  formatUnitLabel,
  getProductById,
  type Product,
  type ProductOptionGroup,
  type ProductVariant,
} from '@/entities/product';
import { formatModifierConstraints } from '@/entities/modifier-group';
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

type ReadOnlyFieldProps = {
  label: string;
  value: string;
  className?: string;
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

function getStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
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

function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-background/70 px-3 py-3', className)}>
      <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value || 'Не указано'}</p>
    </div>
  );
}

function getVariantOptionsLabel(variant: ProductVariant): string {
  if (!variant.options.length) {
    return 'Опции не выбраны';
  }

  return variant.options.map((option) => `${option.optionGroupCode}: ${option.optionValueCode}`).join(', ');
}

function getOptionGroupValuesLabel(optionGroup: ProductOptionGroup): string {
  if (!optionGroup.values.length) {
    return 'Нет значений';
  }

  return optionGroup.values.map((value) => value.title || value.code).join(', ');
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
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadProduct = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    if (!isUuid(normalizedProductId)) {
      setProduct(null);
      setErrorMessage('Некорректный идентификатор товара.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
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
      return;
    }

    setProduct(result.product);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadProduct({ showInitialLoader: true });
  }, [normalizedProductId]);

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
            <AdminSectionCard
              eyebrow="Основное"
              title="Базовая информация"
              description="Снимок текущих полей продукта из существующего API без редактирования на этой странице."
              action={
                <Link
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  to={`/products/${product.id}`}
                >
                  Редактировать в текущей карточке
                </Link>
              }
            >
              <div className="grid gap-3 md:grid-cols-2">
                <ReadOnlyField label="Название" value={product.title} />
                <ReadOnlyField label="Категория" value={product.categoryId} />
                <ReadOnlyField label="Slug" value={product.slug} />
                <ReadOnlyField label="SKU" value={product.sku ?? ''} />
                <ReadOnlyField label="Единица" value={formatUnitLabel(product.unit)} />
                <ReadOnlyField label="Шаг продажи" value={String(product.countStep)} />
                <ReadOnlyField label="Вес на витрине" value={product.displayWeight ?? ''} />
                <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-3">
                  <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Статус</p>
                  <Badge className={cn('mt-2 border', getStatusClassName(product.isActive))}>
                    {product.isActive ? 'Активен' : 'Выключен'}
                  </Badge>
                </div>
                <ReadOnlyField label="Описание" value={product.description ?? ''} className="md:col-span-2" />
              </div>
            </AdminSectionCard>
          ) : null}

          {activeSection === 'media' ? (
            <AdminSectionCard
              eyebrow="Медиа"
              title="Фотографии продукта"
              description="Секция показывает только фотографии продукта. Загрузка остается в текущей карточке."
              action={
                <Link
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  to={`/products/${product.id}`}
                >
                  Открыть медиа в карточке
                </Link>
              }
            >
              {product.images.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {product.images.map((image, imageIndex) => (
                    <article key={`${image.id ?? image.url}-${imageIndex}`} className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                      <img className="aspect-square w-full object-cover" src={image.url} alt={`${product.title} - фото ${imageIndex + 1}`} />
                      <div className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                        Фото #{imageIndex + 1}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <AdminEmptyState description="У продукта пока нет фотографий." />
              )}
            </AdminSectionCard>
          ) : null}

          {activeSection === 'pricing' ? (
            <AdminSectionCard
              eyebrow="Цена"
              title="Цена и остатки"
              description="Текущий API продукта содержит цену, старую цену и единицу измерения. Остатки пока не представлены в данных продукта."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <ReadOnlyField label="Цена" value={formatPrice(product.price)} />
                <ReadOnlyField label="Старая цена" value={product.oldPrice === null ? '' : formatPrice(product.oldPrice)} />
                <ReadOnlyField label="Остатки" value="Не поддерживаются текущим API" />
              </div>
            </AdminSectionCard>
          ) : null}

          {activeSection === 'variants' ? (
            <AdminSectionCard
              eyebrow="Варианты"
              title="Опции и варианты"
              description="Просмотр текущей конфигурации вариантов без редактирования на этой странице."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Группы опций</p>
                  {product.optionGroups.length ? (
                    product.optionGroups.map((optionGroup) => (
                      <article key={optionGroup.id ?? optionGroup.code} className="rounded-xl border border-border/60 bg-background/70 px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{optionGroup.title || optionGroup.code}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{optionGroup.code}</p>
                          </div>
                          {optionGroup.id ? (
                            <Link className="text-sm font-medium text-primary hover:underline" to={`/products/${product.id}/option-groups/${optionGroup.id}`}>
                              Открыть
                            </Link>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{getOptionGroupValuesLabel(optionGroup)}</p>
                      </article>
                    ))
                  ) : (
                    <AdminEmptyState description="У продукта нет групп опций." />
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Варианты</p>
                  {product.variants.length ? (
                    product.variants.map((variant, variantIndex) => (
                      <article key={variant.id ?? `${variant.sku}-${variantIndex}`} className="rounded-xl border border-border/60 bg-background/70 px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{variant.sku || `Вариант #${variantIndex + 1}`}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {variant.price === null ? 'Цена не указана' : formatPrice(variant.price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn('border', getStatusClassName(variant.isActive))}>
                              {variant.isActive ? 'Активен' : 'Выключен'}
                            </Badge>
                            {variant.id ? (
                              <Link className="text-sm font-medium text-primary hover:underline" to={`/products/${product.id}/variants/${variant.id}`}>
                                Открыть
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{getVariantOptionsLabel(variant)}</p>
                      </article>
                    ))
                  ) : (
                    <AdminEmptyState description="У продукта нет вариантов." />
                  )}
                </div>
              </div>
            </AdminSectionCard>
          ) : null}

          {activeSection === 'modifiers' ? (
            <AdminSectionCard
              eyebrow="Модификаторы"
              title="Назначенные группы модификаторов"
              description="Просмотр групп, привязанных к продукту, без редактирования на этой странице."
            >
              {product.modifierGroups.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {product.modifierGroups.map((modifierGroup) => (
                    <article key={modifierGroup.modifierGroupId} className="rounded-xl border border-border/60 bg-background/70 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{modifierGroup.name || modifierGroup.code}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{modifierGroup.code}</p>
                        </div>
                        <Badge className={cn('border', getStatusClassName(modifierGroup.isActive))}>
                          {modifierGroup.isActive ? 'Активна' : 'Выключена'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{formatModifierConstraints(modifierGroup)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Опций: {modifierGroup.options.length}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <AdminEmptyState description="К продукту не привязаны группы модификаторов." />
              )}
            </AdminSectionCard>
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
