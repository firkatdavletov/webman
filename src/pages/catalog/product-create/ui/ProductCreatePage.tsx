import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { type Category, buildCategoryLookup, getCategories } from '@/entities/category';
import { type ModifierGroup, getAllModifierGroups } from '@/entities/modifier-group';
import {
  formatPrice,
  formatUnitLabel,
  saveProduct,
  type Product,
} from '@/entities/product';
import {
  mapProductEditorValuesToProductStructures,
  parseOptionalProductPrice,
  parseProductPrice,
  type ProductEditorValues,
  validateProductModifierGroupsSection,
  validateProductVariantsSection,
} from '@/features/product-editor';
import {
  clearProductCreationDraft,
  createEmptyProductCreationDraft,
  readProductCreationDraft,
  type ProductCreationDraft,
  writeProductCreationDraft,
} from '@/pages/catalog/product-create/model/productCreationDraft';
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

const PRODUCT_DRAFT_QUERY_PARAM = 'draftProductId';
const SERVER_PRODUCT_QUERY_PARAM = 'productId';
const PRODUCT_DRAFT_PERSIST_DELAY_MS = 400;

function buildInitialProductCreationState(searchParams: URLSearchParams): {
  draftId: string;
  draft: ProductCreationDraft;
  recoveryError: string | null;
} {
  const draftIdFromUrl = searchParams.get(PRODUCT_DRAFT_QUERY_PARAM)?.trim() ?? '';
  const serverProductIdFromUrl = searchParams.get(SERVER_PRODUCT_QUERY_PARAM)?.trim() ?? '';
  const hasValidDraftIdFromUrl = isUuid(draftIdFromUrl);
  const storedDraft = hasValidDraftIdFromUrl ? readProductCreationDraft(draftIdFromUrl) : null;

  if (storedDraft) {
    if (serverProductIdFromUrl && storedDraft.serverProductId !== serverProductIdFromUrl) {
      return {
        draftId: draftIdFromUrl,
        draft: storedDraft,
        recoveryError: 'Идентификатор сохраненного товара не совпадает с данными черновика. Продолжение создания заблокировано.',
      };
    }

    return {
      draftId: draftIdFromUrl,
      draft: storedDraft,
      recoveryError: null,
    };
  }

  if (hasValidDraftIdFromUrl || serverProductIdFromUrl) {
    return {
      draftId: hasValidDraftIdFromUrl ? draftIdFromUrl : window.crypto.randomUUID(),
      draft: createEmptyProductCreationDraft(),
      recoveryError: 'Черновик формы не найден или адрес восстановления изменен. Чтобы избежать изменения другого товара, продолжение по этой ссылке заблокировано.',
    };
  }

  return {
    draftId: window.crypto.randomUUID(),
    draft: createEmptyProductCreationDraft(),
    recoveryError: null,
  };
}

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialCreationState] = useState(() => buildInitialProductCreationState(searchParams));
  const [draft, setDraft] = useState<ProductCreationDraft>(initialCreationState.draft);
  const draftId = initialCreationState.draftId;
  const recoveryError = initialCreationState.recoveryError;
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDraftPersistenceAvailable, setIsDraftPersistenceAvailable] = useState(true);
  const formValues = draft.formValues;
  const latestDraftRef = useRef(draft);
  const shouldPersistDraftRef = useRef(!recoveryError);

  latestDraftRef.current = draft;

  useEffect(() => {
    const hasExpectedDraftId = searchParams.get(PRODUCT_DRAFT_QUERY_PARAM) === draftId;
    const hasExpectedServerProductId = searchParams.get(SERVER_PRODUCT_QUERY_PARAM) === draft.serverProductId;

    if (hasExpectedDraftId && hasExpectedServerProductId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set(PRODUCT_DRAFT_QUERY_PARAM, draftId);

    if (draft.serverProductId) {
      nextSearchParams.set(SERVER_PRODUCT_QUERY_PARAM, draft.serverProductId);
    } else {
      nextSearchParams.delete(SERVER_PRODUCT_QUERY_PARAM);
    }

    setSearchParams(nextSearchParams, { replace: true });
  }, [draft.serverProductId, draftId, searchParams, setSearchParams]);

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
      setDraft((currentDraft) => {
        return {
          ...currentDraft,
          formValues: {
            ...currentDraft.formValues,
            categoryId: categoryOptions[0][0],
          },
        };
      });
    }
  }, [categoryOptions, formValues.categoryId]);

  useEffect(() => {
    if (recoveryError) {
      return;
    }

    const persistTimeout = window.setTimeout(() => {
      setIsDraftPersistenceAvailable(writeProductCreationDraft(draftId, draft));
    }, PRODUCT_DRAFT_PERSIST_DELAY_MS);

    return () => {
      window.clearTimeout(persistTimeout);
    };
  }, [draft, draftId, recoveryError]);

  useEffect(() => {
    const persistLatestDraft = () => {
      if (shouldPersistDraftRef.current) {
        writeProductCreationDraft(draftId, latestDraftRef.current);
      }
    };

    window.addEventListener('pagehide', persistLatestDraft);

    return () => {
      window.removeEventListener('pagehide', persistLatestDraft);
      persistLatestDraft();
    };
  }, [draftId]);

  const selectedCategoryId = formValues.categoryId.trim();
  const selectedCategoryTitle = selectedCategoryId ? categoryLookup.get(selectedCategoryId) ?? `#${selectedCategoryId}` : 'Не выбрана';
  const parsedPrice = parseProductPrice(formValues.price);
  const parsedOldPrice = parseOptionalProductPrice(formValues.oldPrice);

  const handleValuesChange = (updater: (currentValues: ProductEditorValues) => ProductEditorValues) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      formValues: updater(currentDraft.formValues),
    }));

    if (saveError) {
      setSaveError('');
    }
  };

  const handleSave = async () => {
    if (recoveryError) {
      setSaveError(recoveryError);
      return;
    }

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

    const shouldReplaceVariantConfiguration = formValues.hasVariants || draft.hasStartedVariantSave;
    const nextDraft = {
      ...draft,
      hasStartedVariantSave: shouldReplaceVariantConfiguration,
    };

    latestDraftRef.current = nextDraft;
    setIsDraftPersistenceAvailable(writeProductCreationDraft(draftId, nextDraft));

    if (nextDraft.hasStartedVariantSave !== draft.hasStartedVariantSave) {
      setDraft(nextDraft);
    }

    const { optionGroups, modifierGroups: productModifierGroups, variants } = mapProductEditorValuesToProductStructures(
      formValues,
      modifierGroups,
    );

    const newProduct: Product = {
      id: draft.serverProductId ?? '',
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

    const result = await saveProduct(newProduct, {
      replaceVariantConfiguration: shouldReplaceVariantConfiguration,
      deferActivationUntilVariantConfiguration: shouldReplaceVariantConfiguration,
    });

    if (result.product && !result.error) {
      shouldPersistDraftRef.current = false;
      clearProductCreationDraft(draftId);
      navigate(`/products/${result.product.id}`, {
        replace: true,
      });
      return;
    }

    if (result.product) {
      const nextRecoveryDraft = {
        ...nextDraft,
        serverProductId: result.product.id,
      };
      const nextSearchParams = new URLSearchParams(searchParams);

      latestDraftRef.current = nextRecoveryDraft;
      setDraft(nextRecoveryDraft);
      setIsDraftPersistenceAvailable(writeProductCreationDraft(draftId, nextRecoveryDraft));

      nextSearchParams.set(PRODUCT_DRAFT_QUERY_PARAM, draftId);
      nextSearchParams.set(SERVER_PRODUCT_QUERY_PARAM, result.product.id);
      setSearchParams(nextSearchParams, { replace: true });

      setSaveError(
        `Основные данные товара сохранены, товар оставлен выключенным. Исправьте ошибку и повторите сохранение. ${result.error ?? ''}`.trim(),
      );
      setIsSaving(false);
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

          {recoveryError ? (
            <AdminNotice tone="destructive" role="alert">
              {recoveryError}{' '}
              {draft.serverProductId ? (
                <Link className="font-medium underline" to={`/products/${draft.serverProductId}`}>
                  Открыть сохраненный товар
                </Link>
              ) : (
                <Link className="font-medium underline" reloadDocument to="/products/new">
                  Начать создание нового товара
                </Link>
              )}
            </AdminNotice>
          ) : null}

          {!isDraftPersistenceAvailable ? (
            <AdminNotice role="alert">
              Не удалось сохранить последние изменения черновика в браузере. При обновлении восстановится предыдущая сохраненная версия.
            </AdminNotice>
          ) : null}

          {recoveryError ? (
            <AdminSectionCard>
              <AdminEmptyState
                title="Продолжение создания заблокировано"
                description="Выберите действие в предупреждении выше, чтобы не создать дубликат товара."
              />
            </AdminSectionCard>
          ) : (
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
          )}
        </>
      )}
    </AdminPage>
  );
}
