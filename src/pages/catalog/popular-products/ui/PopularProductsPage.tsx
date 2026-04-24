import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  type Product,
  type ProductPopularityItem,
  formatPrice,
  getAllProducts,
  getPopularProducts,
  reorderPopularProducts,
} from '@/entities/product';
import { getPrimaryMediaImageUrl } from '@/shared/lib/media/images';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui';

const productTitleCollator = new Intl.Collator('ru');

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase('ru');
}

function productMatchesSearch(product: Product, searchQuery: string): boolean {
  const normalizedQuery = normalizeSearchValue(searchQuery);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedSource = normalizeSearchValue([product.title, product.sku ?? '', product.slug].join(' '));

  return normalizedSource.includes(normalizedQuery);
}

function mergeProducts(products: Product[][]): Product[] {
  const productLookup = new Map<string, Product>();

  products.flat().forEach((product) => {
    productLookup.set(product.id, product);
  });

  return Array.from(productLookup.values()).sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return productTitleCollator.compare(left.title, right.title);
  });
}

function moveProductAround(
  items: ProductPopularityItem[],
  sourceProductId: string,
  targetProductId: string,
  insertAfterTarget: boolean,
): ProductPopularityItem[] {
  const sourceIndex = items.findIndex((item) => item.product.id === sourceProductId);
  const targetIndex = items.findIndex((item) => item.product.id === targetProductId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  if (sourceIndex < targetIndex && insertAfterTarget && sourceIndex + 1 === targetIndex) {
    return items;
  }

  if (sourceIndex > targetIndex && !insertAfterTarget && sourceIndex - 1 === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [sourceItem] = nextItems.splice(sourceIndex, 1);

  if (!sourceItem) {
    return items;
  }

  const nextTargetIndex = nextItems.findIndex((item) => item.product.id === targetProductId);

  if (nextTargetIndex < 0) {
    return items;
  }

  nextItems.splice(insertAfterTarget ? nextTargetIndex + 1 : nextTargetIndex, 0, sourceItem);

  return nextItems;
}

function swapProduct(items: ProductPopularityItem[], productId: string, direction: -1 | 1): ProductPopularityItem[] {
  const currentIndex = items.findIndex((item) => item.product.id === productId);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const currentItem = nextItems[currentIndex];
  const nextItem = nextItems[nextIndex];

  if (!currentItem || !nextItem) {
    return items;
  }

  nextItems[currentIndex] = nextItem;
  nextItems[nextIndex] = currentItem;

  return nextItems;
}

function getProductIds(items: ProductPopularityItem[]): string[] {
  return items.map((item) => item.product.id);
}

function ProductPreviewImage({ product }: { product: Product }) {
  const imageUrl = getPrimaryMediaImageUrl(product.images);

  if (!imageUrl) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted text-muted-foreground">
        <PackageIcon className="size-5" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      className="size-14 shrink-0 rounded-xl border border-border/70 bg-muted object-cover"
      loading="lazy"
    />
  );
}

function ProductSummary({ product }: { product: Product }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductPreviewImage product={product} />
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            to={`/products/${product.id}`}
            className="min-w-0 truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            {product.title.trim() || 'Без названия'}
          </Link>
          {!product.isActive ? (
            <Badge variant="destructive" className="h-auto rounded-full px-2.5 py-1 text-[0.68rem]">
              Не показывается на сайте
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono tracking-[0.12em] uppercase">{product.sku?.trim() || 'SKU не указан'}</span>
          <span className="font-semibold text-foreground">{formatPrice(product.price)}</span>
        </div>
      </div>
    </div>
  );
}

type PopularProductRowProps = {
  item: ProductPopularityItem;
  index: number;
  itemCount: number;
  isBusy: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (event: DragEvent<HTMLLIElement>, productId: string) => void;
  onDragOver: (event: DragEvent<HTMLLIElement>, productId: string) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLIElement>, productId: string) => void;
  onDragEnd: () => void;
  onMove: (productId: string, direction: -1 | 1) => void;
  onRemove: (productId: string) => void;
};

function PopularProductRow({
  item,
  index,
  itemCount,
  isBusy,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMove,
  onRemove,
}: PopularProductRowProps) {
  const productId = item.product.id;

  return (
    <li
      draggable={!isBusy}
      onDragStart={(event) => onDragStart(event, productId)}
      onDragOver={(event) => onDragOver(event, productId)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, productId)}
      onDragEnd={onDragEnd}
      className={cn(
        'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 transition-all md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center',
        isDragOver && 'border-primary bg-primary/5 shadow-[0_16px_40px_rgba(17,117,108,0.12)]',
        isDragging && 'opacity-45',
        isBusy ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted text-sm font-semibold text-foreground">
        {index + 1}
      </div>
      <div className="hidden text-muted-foreground md:flex md:items-center md:justify-center" aria-hidden="true">
        <GripVerticalIcon className="size-5" />
      </div>
      <div className="min-w-0">
        <ProductSummary product={item.product} />
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onMove(productId, -1)}
          disabled={isBusy || index === 0}
          title="Поднять выше"
          aria-label={`Поднять выше товар ${item.product.title}`}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onMove(productId, 1)}
          disabled={isBusy || index === itemCount - 1}
          title="Опустить ниже"
          aria-label={`Опустить ниже товар ${item.product.title}`}
        >
          <ArrowDownIcon />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={() => onRemove(productId)}
          disabled={isBusy}
          title="Удалить из подборки"
          aria-label={`Удалить из подборки товар ${item.product.title}`}
        >
          <Trash2Icon />
        </Button>
      </div>
    </li>
  );
}

type AddProductSheetProps = {
  isOpen: boolean;
  isBusy: boolean;
  products: Product[];
  searchQuery: string;
  onOpenChange: (isOpen: boolean) => void;
  onSearchQueryChange: (value: string) => void;
  onAddProduct: (productId: string) => void;
};

function AddProductSheet({
  isOpen,
  isBusy,
  products,
  searchQuery,
  onOpenChange,
  onSearchQueryChange,
  onAddProduct,
}: AddProductSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(560px,92vw)] max-w-none border-l border-border p-0">
        <SheetHeader className="border-b border-border/70 p-5 pr-12">
          <SheetTitle>Добавить товар</SheetTitle>
          <SheetDescription>Поиск идет по названию, SKU и адресу карточки.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-5 pb-5">
          <div className="sticky top-0 z-10 -mx-5 border-b border-border/70 bg-popover px-5 py-4">
            <label className="text-sm font-medium text-foreground" htmlFor="popular-product-search">
              Поиск по товарам
            </label>
            <div className="relative mt-2">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="popular-product-search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Название, SKU или slug"
                className="h-10 rounded-xl pl-9"
              />
            </div>
          </div>

          {products.length ? (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3"
                >
                  <ProductSummary product={product} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl bg-card/80"
                    onClick={() => onAddProduct(product.id)}
                    disabled={isBusy}
                  >
                    <PlusIcon />
                    Добавить
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Товары не найдены" description="В каталоге нет товаров, подходящих под текущий поиск." />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PopularProductsPage() {
  const [popularItems, setPopularItems] = useState<ProductPopularityItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadProductsData = async (showInitialLoader = false) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [popularResult, activeProductsResult, inactiveProductsResult] = await Promise.all([
      getPopularProducts(),
      getAllProducts({ isActive: true }),
      getAllProducts({ isActive: false }),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    const nextError = [popularResult.error, activeProductsResult.error, inactiveProductsResult.error].filter(Boolean).join(' ');

    setPopularItems(popularResult.items);
    setAllProducts(mergeProducts([activeProductsResult.products, inactiveProductsResult.products]));
    setErrorMessage(nextError);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadProductsData(true);
  }, []);

  const popularProductIds = useMemo(() => new Set(popularItems.map((item) => item.product.id)), [popularItems]);
  const availableProducts = useMemo(
    () => allProducts.filter((product) => !popularProductIds.has(product.id) && productMatchesSearch(product, productSearchQuery)),
    [allProducts, popularProductIds, productSearchQuery],
  );

  const savePopularOrder = async (productIds: string[], optimisticItems?: ProductPopularityItem[]): Promise<boolean> => {
    const previousItems = popularItems;

    if (optimisticItems) {
      setPopularItems(optimisticItems);
    }

    setErrorMessage('');
    setIsSaving(true);

    const result = await reorderPopularProducts(productIds);

    if (result.error) {
      setPopularItems(previousItems);
      setErrorMessage(result.error);
      setIsSaving(false);
      return false;
    }

    setPopularItems(result.items);
    setIsSaving(false);
    return true;
  };

  const handleDragStart = (event: DragEvent<HTMLLIElement>, productId: string) => {
    if (isSaving) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', productId);
    setDraggingProductId(productId);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, productId: string) => {
    if (isSaving) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverProductId(productId);
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetProductId: string) => {
    event.preventDefault();

    const sourceProductId = event.dataTransfer.getData('text/plain') || draggingProductId;
    setDraggingProductId(null);
    setDragOverProductId(null);

    if (!sourceProductId || sourceProductId === targetProductId || isSaving) {
      return;
    }

    const targetRect = event.currentTarget.getBoundingClientRect();
    const shouldInsertAfterTarget = event.clientY > targetRect.top + targetRect.height / 2;
    const nextItems = moveProductAround(popularItems, sourceProductId, targetProductId, shouldInsertAfterTarget);

    if (nextItems === popularItems) {
      return;
    }

    void savePopularOrder(getProductIds(nextItems), nextItems);
  };

  const handleMoveProduct = (productId: string, direction: -1 | 1) => {
    if (isSaving) {
      return;
    }

    const nextItems = swapProduct(popularItems, productId, direction);

    if (nextItems === popularItems) {
      return;
    }

    void savePopularOrder(getProductIds(nextItems), nextItems);
  };

  const handleRemoveProduct = (productId: string) => {
    if (isSaving) {
      return;
    }

    const nextItems = popularItems.filter((item) => item.product.id !== productId);
    void savePopularOrder(getProductIds(nextItems), nextItems);
  };

  const handleAddProduct = async (productId: string) => {
    if (isSaving || popularProductIds.has(productId)) {
      return;
    }

    const didSave = await savePopularOrder([...getProductIds(popularItems), productId]);

    if (didSave) {
      setProductSearchQuery('');
    }
  };

  const statusText = isLoading
    ? 'Загрузка подборки...'
    : isSaving
      ? 'Сохраняем порядок...'
      : `В подборке: ${popularItems.length} товаров`;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title="Популярное"
        description="Подборка товаров для блока «Популярное» на витрине."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Button
              type="button"
              size="lg"
              className="rounded-xl shadow-sm"
              onClick={() => setIsAddSheetOpen(true)}
              disabled={isLoading}
            >
              <PlusIcon />
              Добавить товар
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadProductsData(false)}
              disabled={isLoading || isRefreshing || isSaving}
            >
              <RefreshCwIcon />
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        aria-label="Товары в подборке Популярное"
        eyebrow="Витрина"
        title="Текущий порядок"
        description="Список синхронизирован с порядком показа на сайте."
      >
        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {errorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка популярного" description="Получаем подборку и товары каталога." />
        ) : popularItems.length ? (
          <ol className="space-y-3">
            {popularItems.map((item, index) => (
              <PopularProductRow
                key={item.product.id}
                item={item}
                index={index}
                itemCount={popularItems.length}
                isBusy={isSaving}
                isDragging={draggingProductId === item.product.id}
                isDragOver={dragOverProductId === item.product.id}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOverProductId(null)}
                onDrop={handleDrop}
                onDragEnd={() => {
                  setDraggingProductId(null);
                  setDragOverProductId(null);
                }}
                onMove={handleMoveProduct}
                onRemove={handleRemoveProduct}
              />
            ))}
          </ol>
        ) : (
          <AdminEmptyState
            title="В подборке пока нет товаров"
            description="Добавьте товары из каталога, чтобы сформировать блок популярного на витрине."
          />
        )}
      </AdminSectionCard>

      <AddProductSheet
        isOpen={isAddSheetOpen}
        isBusy={isSaving}
        products={availableProducts}
        searchQuery={productSearchQuery}
        onOpenChange={setIsAddSheetOpen}
        onSearchQueryChange={setProductSearchQuery}
        onAddProduct={(productId) => {
          void handleAddProduct(productId);
        }}
      />
    </AdminPage>
  );
}
