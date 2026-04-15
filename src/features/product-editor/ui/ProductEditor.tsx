import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  formatModifierConstraints,
  type ModifierGroup,
} from '@/entities/modifier-group';
import {
  completeProductImageUpload,
  initProductImageUpload,
  readFileAsDataUrl,
  uploadProductImageToStorage,
} from '@/entities/product';
import {
  createEmptyProductModifierGroup,
  createEmptyProductOptionGroup,
  createEmptyProductOptionValue,
  createEmptyProductVariant,
  PRODUCT_UNIT_OPTIONS,
  syncVariantOptionsByOptionGroups,
  type ProductEditorOptionGroupValues,
  type ProductEditorValues,
} from '@/features/product-editor/model/productEditor';
import { AdminNotice, AdminSectionCard, Button, FormField, Input } from '@/shared/ui';
import { LazyDataTable } from '@/shared/ui/data-table';

type EditableProductField = Exclude<
  keyof ProductEditorValues,
  'isActive' | 'hasVariants' | 'optionGroups' | 'modifierGroups' | 'variants'
>;

type EditableVariantField = Exclude<keyof ProductEditorValues['variants'][number], 'id' | 'images' | 'isActive' | 'options'>;
type ProductEditorVariantValues = ProductEditorValues['variants'][number];
type EditableModifierGroupField = Exclude<keyof ProductEditorValues['modifierGroups'][number], 'isActive'>;
type EditableOptionGroupField = Exclude<keyof ProductEditorOptionGroupValues, 'values'>;
type ProductEditorOptionValueValues = ProductEditorOptionGroupValues['values'][number];

type VariantEditorState = {
  mode: 'create' | 'edit';
  variantIndex: number | null;
  draft: ProductEditorVariantValues;
};

type OptionGroupEditorState = {
  mode: 'create' | 'edit';
  optionGroupIndex: number | null;
  draft: ProductEditorOptionGroupValues;
};

type ProductEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  categoryOptions: Array<[string, string]>;
  availableModifierGroups: ModifierGroup[];
  formValues: ProductEditorValues;
  isSaving: boolean;
  optionGroupEditorMode?: 'inline' | 'drawer';
  variantEditorMode?: 'inline' | 'drawer';
  disableCategorySelect?: boolean;
  emptyCategoryLabel?: string;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onValuesChange: (updater: (currentValues: ProductEditorValues) => ProductEditorValues) => void;
  onSubmit: () => void;
};

const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const SELECT_CLASSNAME =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

const SUBSECTION_LABEL_CLASSNAME =
  'text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase';

function updateOptionGroups(
  currentValues: ProductEditorValues,
  updater: (groups: ProductEditorOptionGroupValues[]) => ProductEditorOptionGroupValues[],
): ProductEditorValues {
  const nextOptionGroups = updater(currentValues.optionGroups);
  const nextVariants = currentValues.variants.map((variant) => syncVariantOptionsByOptionGroups(nextOptionGroups, variant));

  return {
    ...currentValues,
    optionGroups: nextOptionGroups,
    variants: nextVariants,
  };
}

function cloneVariant(variant: ProductEditorVariantValues): ProductEditorVariantValues {
  return {
    ...variant,
    images: variant.images.map((image) => ({
      ...image,
    })),
    options: variant.options.map((option) => ({
      ...option,
    })),
  };
}

function cloneOptionGroup(group: ProductEditorOptionGroupValues): ProductEditorOptionGroupValues {
  return {
    ...group,
    values: group.values.map((value) => ({
      ...value,
    })),
  };
}

function findOptionGroupByKeywords(
  optionGroups: ProductEditorOptionGroupValues[],
  keywords: string[],
): ProductEditorOptionGroupValues | null {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return (
    optionGroups.find((group) => {
      const normalizedCode = group.code.trim().toLowerCase();
      const normalizedTitle = group.title.trim().toLowerCase();
      const lookupValue = `${normalizedCode} ${normalizedTitle}`.trim();

      return normalizedKeywords.some((keyword) => lookupValue.includes(keyword));
    }) ?? null
  );
}

function getVariantOptionLabel(variant: ProductEditorVariantValues, optionGroup: ProductEditorOptionGroupValues | null): string {
  if (!optionGroup) {
    return '—';
  }

  const normalizedGroupCode = optionGroup.code.trim();

  if (!normalizedGroupCode) {
    return '—';
  }

  const selectedOption = variant.options.find((option) => option.optionGroupCode === normalizedGroupCode) ?? null;
  const selectedOptionValueCode = selectedOption?.optionValueCode.trim() ?? '';

  if (!selectedOptionValueCode) {
    return '—';
  }

  const selectedValue = optionGroup.values.find((value) => value.code.trim() === selectedOptionValueCode);

  return selectedValue?.title.trim() || selectedOptionValueCode;
}

function getVariantPriceLabel(value: string): string {
  return value.trim() || '—';
}

export function ProductEditor({
  idPrefix,
  ariaLabel,
  eyebrow,
  title,
  description,
  categoryOptions,
  availableModifierGroups,
  formValues,
  isSaving,
  optionGroupEditorMode = 'inline',
  variantEditorMode = 'inline',
  disableCategorySelect = false,
  emptyCategoryLabel = 'Нет доступных категорий',
  saveError,
  saveSuccess,
  submitLabel,
  savingLabel,
  onValuesChange,
  onSubmit,
}: ProductEditorProps) {
  const [optionGroupEditorState, setOptionGroupEditorState] = useState<OptionGroupEditorState | null>(null);
  const [variantEditorState, setVariantEditorState] = useState<VariantEditorState | null>(null);
  const [isVariantImageUploading, setIsVariantImageUploading] = useState(false);
  const [variantImageUploadError, setVariantImageUploadError] = useState('');
  const variantImageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const modifierGroupLookup = useMemo(
    () => new Map(availableModifierGroups.map((group) => [group.id, group])),
    [availableModifierGroups],
  );
  const colorOptionGroup = useMemo(() => {
    const matchedGroup = findOptionGroupByKeywords(formValues.optionGroups, ['color', 'цвет']);

    if (matchedGroup) {
      return matchedGroup;
    }

    return formValues.optionGroups[0] ?? null;
  }, [formValues.optionGroups]);
  const sizeOptionGroup = useMemo(() => {
    const matchedGroup = findOptionGroupByKeywords(formValues.optionGroups, ['size', 'размер']);

    if (matchedGroup && matchedGroup !== colorOptionGroup) {
      return matchedGroup;
    }

    return (
      formValues.optionGroups.find((group) => {
        if (!colorOptionGroup) {
          return true;
        }

        return group !== colorOptionGroup;
      }) ?? null
    );
  }, [colorOptionGroup, formValues.optionGroups]);
  const optionGroupColumns = useMemo<ColumnDef<ProductEditorOptionGroupValues>[]>(
    () => [
      {
        id: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-sm font-medium underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
            onClick={() => handleOpenOptionGroupEdit(row.index)}
            disabled={isSaving}
          >
            {row.original.code.trim() || `Группа #${row.index + 1}`}
          </button>
        ),
      },
      {
        id: 'title',
        header: 'Название',
        cell: ({ row }) => row.original.title.trim() || '—',
      },
      {
        id: 'valuesCount',
        header: 'Значений',
        cell: ({ row }) => row.original.values.length,
        meta: {
          cellClassName: 'tabular-nums text-right',
        },
      },
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => row.original.sortOrder.trim() || '0',
        meta: {
          cellClassName: 'tabular-nums text-right',
        },
      },
    ],
    [isSaving],
  );
  const variantColumns = useMemo<ColumnDef<ProductEditorVariantValues>[]>(
    () => [
      {
        id: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-sm font-medium underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
            onClick={() => handleOpenVariantEdit(row.index)}
            disabled={isSaving || isVariantImageUploading}
          >
            {row.original.sku.trim() || `Вариант #${row.index + 1}`}
          </button>
        ),
      },
      {
        id: 'color',
        header: 'Цвет',
        cell: ({ row }) => getVariantOptionLabel(row.original, colorOptionGroup),
      },
      {
        id: 'size',
        header: 'Размер',
        cell: ({ row }) => getVariantOptionLabel(row.original, sizeOptionGroup),
        meta: {
          cellClassName: 'tabular-nums text-right',
        },
      },
      {
        id: 'price',
        header: 'Цена',
        cell: ({ row }) => getVariantPriceLabel(row.original.price),
        meta: {
          cellClassName: 'tabular-nums text-right',
        },
      },
      {
        id: 'isActive',
        header: 'Активен',
        cell: ({ row }) => (row.original.isActive ? 'Да' : 'Нет'),
      },
    ],
    [colorOptionGroup, isSaving, isVariantImageUploading, sizeOptionGroup],
  );

  useEffect(() => {
    if (!formValues.hasVariants) {
      setOptionGroupEditorState(null);
      setVariantEditorState(null);
      return;
    }

    setOptionGroupEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      if (currentState.mode === 'edit') {
        if (currentState.optionGroupIndex === null || currentState.optionGroupIndex >= formValues.optionGroups.length) {
          return null;
        }
      }

      return currentState;
    });

    setVariantEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      if (currentState.mode === 'edit') {
        if (currentState.variantIndex === null || currentState.variantIndex >= formValues.variants.length) {
          return null;
        }
      }

      return {
        ...currentState,
        draft: syncVariantOptionsByOptionGroups(formValues.optionGroups, currentState.draft),
      };
    });
  }, [formValues.hasVariants, formValues.optionGroups, formValues.variants.length]);

  const handleFieldChange = (field: EditableProductField, value: string) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleIsActiveChange = (value: boolean) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      isActive: value,
    }));
  };

  const handleHasVariantsChange = (value: boolean) => {
    onValuesChange((currentValues) => {
      if (!value) {
        return {
          ...currentValues,
          hasVariants: false,
        };
      }

      if (currentValues.optionGroups.length || currentValues.variants.length) {
        return {
          ...currentValues,
          hasVariants: true,
          variants: currentValues.variants.map((variant) => syncVariantOptionsByOptionGroups(currentValues.optionGroups, variant)),
        };
      }

      const initialOptionGroups = [createEmptyProductOptionGroup()];

      return {
        ...currentValues,
        hasVariants: true,
        optionGroups: initialOptionGroups,
        variants: [],
      };
    });
  };

  const handleAddModifierGroup = () => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      modifierGroups: [...currentValues.modifierGroups, createEmptyProductModifierGroup()],
    }));
  };

  const handleModifierGroupFieldChange = (modifierGroupIndex: number, field: EditableModifierGroupField, value: string) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      modifierGroups: currentValues.modifierGroups.map((modifierGroup, currentModifierGroupIndex) => {
        if (currentModifierGroupIndex !== modifierGroupIndex) {
          return modifierGroup;
        }

        return {
          ...modifierGroup,
          [field]: value,
        };
      }),
    }));
  };

  const handleModifierGroupIsActiveChange = (modifierGroupIndex: number, value: boolean) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      modifierGroups: currentValues.modifierGroups.map((modifierGroup, currentModifierGroupIndex) => {
        if (currentModifierGroupIndex !== modifierGroupIndex) {
          return modifierGroup;
        }

        return {
          ...modifierGroup,
          isActive: value,
        };
      }),
    }));
  };

  const handleRemoveModifierGroup = (modifierGroupIndex: number) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      modifierGroups: currentValues.modifierGroups.filter((_, currentModifierGroupIndex) => currentModifierGroupIndex !== modifierGroupIndex),
    }));
  };

  const handleOpenOptionGroupCreate = () => {
    if (variantEditorMode === 'drawer') {
      setVariantImageUploadError('');
      setVariantEditorState(null);
    }

    setOptionGroupEditorState({
      mode: 'create',
      optionGroupIndex: null,
      draft: createEmptyProductOptionGroup(),
    });
  };

  const handleOpenOptionGroupEdit = (optionGroupIndex: number) => {
    const optionGroup = formValues.optionGroups[optionGroupIndex];

    if (!optionGroup) {
      return;
    }

    if (variantEditorMode === 'drawer') {
      setVariantImageUploadError('');
      setVariantEditorState(null);
    }

    setOptionGroupEditorState({
      mode: 'edit',
      optionGroupIndex,
      draft: cloneOptionGroup(optionGroup),
    });
  };

  const handleCloseOptionGroupEditor = () => {
    setOptionGroupEditorState(null);
  };

  const handleOptionGroupDraftFieldChange = (field: EditableOptionGroupField, value: string) => {
    setOptionGroupEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          [field]: value,
        },
      };
    });
  };

  const handleAddOptionValueDraft = () => {
    setOptionGroupEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          values: [...currentState.draft.values, createEmptyProductOptionValue()],
        },
      };
    });
  };

  const handleRemoveOptionValueDraft = (valueIndex: number) => {
    setOptionGroupEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          values: currentState.draft.values.filter((_, currentValueIndex) => currentValueIndex !== valueIndex),
        },
      };
    });
  };

  const handleOptionValueDraftFieldChange = (
    valueIndex: number,
    field: keyof ProductEditorOptionValueValues,
    value: string,
  ) => {
    setOptionGroupEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          values: currentState.draft.values.map((optionValue, currentValueIndex) => {
            if (currentValueIndex !== valueIndex) {
              return optionValue;
            }

            return {
              ...optionValue,
              [field]: value,
            };
          }),
        },
      };
    });
  };

  const handleConfirmOptionGroupEditor = () => {
    if (!optionGroupEditorState) {
      return;
    }

    const { mode, optionGroupIndex } = optionGroupEditorState;
    const nextOptionGroup = cloneOptionGroup(optionGroupEditorState.draft);

    onValuesChange((currentValues) => {
      if (mode === 'create') {
        return updateOptionGroups(currentValues, (groups) => [...groups, nextOptionGroup]);
      }

      if (optionGroupIndex === null || optionGroupIndex < 0 || optionGroupIndex >= currentValues.optionGroups.length) {
        return currentValues;
      }

      return updateOptionGroups(currentValues, (groups) =>
        groups.map((group, index) => (index === optionGroupIndex ? nextOptionGroup : group)),
      );
    });

    setOptionGroupEditorState(null);
  };

  const handleDeleteOptionGroupFromEditor = () => {
    if (!optionGroupEditorState || optionGroupEditorState.mode !== 'edit' || optionGroupEditorState.optionGroupIndex === null) {
      return;
    }

    const { optionGroupIndex } = optionGroupEditorState;

    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) => groups.filter((_, index) => index !== optionGroupIndex)),
    );
    setOptionGroupEditorState(null);
  };

  const handleOpenVariantCreate = () => {
    if (optionGroupEditorMode === 'drawer') {
      setOptionGroupEditorState(null);
    }

    setVariantImageUploadError('');
    setVariantEditorState({
      mode: 'create',
      variantIndex: null,
      draft: createEmptyProductVariant(formValues.optionGroups),
    });
  };

  const handleOpenVariantEdit = (variantIndex: number) => {
    const variant = formValues.variants[variantIndex];

    if (!variant) {
      return;
    }

    if (optionGroupEditorMode === 'drawer') {
      setOptionGroupEditorState(null);
    }

    setVariantImageUploadError('');
    setVariantEditorState({
      mode: 'edit',
      variantIndex,
      draft: cloneVariant(syncVariantOptionsByOptionGroups(formValues.optionGroups, variant)),
    });
  };

  const handleCloseVariantEditor = () => {
    if (isVariantImageUploading) {
      return;
    }

    setVariantImageUploadError('');
    setVariantEditorState(null);
  };

  const handleVariantDraftFieldChange = (field: EditableVariantField, value: string) => {
    setVariantEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          [field]: value,
        },
      };
    });
  };

  const handleVariantDraftIsActiveChange = (value: boolean) => {
    setVariantEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          isActive: value,
        },
      };
    });
  };

  const handleVariantDraftOptionValueChange = (optionGroupCode: string, optionValueCode: string) => {
    setVariantEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const syncedDraft = syncVariantOptionsByOptionGroups(formValues.optionGroups, currentState.draft);

      return {
        ...currentState,
        draft: {
          ...syncedDraft,
          options: syncedDraft.options.map((option) => {
            if (option.optionGroupCode !== optionGroupCode) {
              return option;
            }

            return {
              ...option,
              optionValueCode,
            };
          }),
        },
      };
    });
  };

  const handleRemoveVariantDraftImage = (imageIndex: number) => {
    if (isVariantEditorBusy) {
      return;
    }

    setVariantImageUploadError('');
    setVariantEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draft: {
          ...currentState.draft,
          images: currentState.draft.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
        },
      };
    });
  };

  const handleConfirmVariantEditor = () => {
    if (!variantEditorState) {
      return;
    }

    const { mode, variantIndex } = variantEditorState;
    const nextVariant = cloneVariant(syncVariantOptionsByOptionGroups(formValues.optionGroups, variantEditorState.draft));

    onValuesChange((currentValues) => {
      const syncedVariant = cloneVariant(syncVariantOptionsByOptionGroups(currentValues.optionGroups, nextVariant));

      if (mode === 'create') {
        return {
          ...currentValues,
          variants: [...currentValues.variants, syncedVariant],
        };
      }

      if (variantIndex === null || variantIndex < 0 || variantIndex >= currentValues.variants.length) {
        return currentValues;
      }

      return {
        ...currentValues,
        variants: currentValues.variants.map((variant, index) => (index === variantIndex ? syncedVariant : variant)),
      };
    });

    setVariantImageUploadError('');
    setVariantEditorState(null);
  };

  const handleDeleteVariantFromEditor = () => {
    if (!variantEditorState || variantEditorState.mode !== 'edit' || variantEditorState.variantIndex === null) {
      return;
    }

    const { variantIndex } = variantEditorState;

    onValuesChange((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.filter((_, index) => index !== variantIndex),
    }));

    setVariantImageUploadError('');
    setVariantEditorState(null);
  };

  const handleVariantImageUploadClick = () => {
    if (isVariantImageUploading) {
      return;
    }

    variantImageUploadInputRef.current?.click();
  };

  const handleVariantImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!imageFiles.length || !variantEditorState) {
      return;
    }

    if (imageFiles.some((imageFile) => !SUPPORTED_PRODUCT_IMAGE_TYPES.has(imageFile.type))) {
      setVariantImageUploadError('Выберите изображение в формате JPG, PNG или WEBP.');
      return;
    }

    setVariantImageUploadError('');
    setIsVariantImageUploading(true);

    try {
      for (const imageFile of imageFiles) {
        const initResult = await initProductImageUpload({
          targetType: 'VARIANT',
          targetId: variantEditorState.draft.id,
          contentType: imageFile.type,
          sizeBytes: imageFile.size,
          fileName: imageFile.name || null,
        });

        if (!initResult.upload) {
          setVariantImageUploadError(initResult.error ?? 'Не удалось получить данные для загрузки изображения.');
          return;
        }

        const uploadData = initResult.upload;
        const storageUploadResult = await uploadProductImageToStorage({
          uploadUrl: uploadData.uploadUrl,
          requiredHeaders: uploadData.requiredHeaders,
          file: imageFile,
        });

        if (storageUploadResult.error) {
          setVariantImageUploadError(storageUploadResult.error);
          return;
        }

        const completeResult = await completeProductImageUpload({
          uploadId: uploadData.uploadId,
        });

        if (completeResult.error) {
          setVariantImageUploadError(completeResult.error);
          return;
        }

        const previewDataUrl = await readFileAsDataUrl(imageFile);

        setVariantEditorState((currentState) => {
          if (!currentState) {
            return currentState;
          }

          return {
            ...currentState,
            draft: {
              ...currentState.draft,
              images: [
                ...currentState.draft.images,
                {
                  id: completeResult.image?.id ?? null,
                  url: previewDataUrl,
                },
              ],
            },
          };
        });
      }
    } catch {
      setVariantImageUploadError('Не удалось обработать выбранный файл.');
    } finally {
      setIsVariantImageUploading(false);
    }
  };

  const variantEditorKey =
    variantEditorState && variantEditorState.mode === 'edit' && variantEditorState.variantIndex !== null
      ? String(variantEditorState.variantIndex)
      : 'new';
  const isOptionGroupEditorBusy = isSaving;
  const isVariantEditorBusy = isSaving || isVariantImageUploading;
  const variantEditorTitle =
    variantEditorState?.mode === 'create'
      ? 'Новый вариант'
      : `Редактирование варианта #${(variantEditorState?.variantIndex ?? 0) + 1}`;
  const variantEditorTitleId = `${idPrefix}-variant-editor-title-${variantEditorKey}`;
  const variantImageAltBase =
    variantEditorState?.draft.title.trim() ||
    variantEditorState?.draft.sku.trim() ||
    'Изображение варианта товара';
  const optionGroupEditorKey =
    optionGroupEditorState && optionGroupEditorState.mode === 'edit' && optionGroupEditorState.optionGroupIndex !== null
      ? String(optionGroupEditorState.optionGroupIndex)
      : 'new';
  const optionGroupEditorTitle =
    optionGroupEditorState?.mode === 'create'
      ? 'Новая опция'
      : `Редактирование опции #${(optionGroupEditorState?.optionGroupIndex ?? 0) + 1}`;
  const optionGroupEditorTitleId = `${idPrefix}-option-editor-title-${optionGroupEditorKey}`;

  const optionGroupEditorContent = optionGroupEditorState ? (
    <div className="space-y-4" aria-label="Редактирование опции товара">
      {optionGroupEditorMode === 'inline' ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{optionGroupEditorTitle}</p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <FormField htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-code`} label="Code">
          <Input
            id={`${idPrefix}-option-editor-${optionGroupEditorKey}-code`}
            value={optionGroupEditorState.draft.code}
            onChange={(event) => handleOptionGroupDraftFieldChange('code', event.target.value)}
            disabled={isOptionGroupEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-title`} label="Название">
          <Input
            id={`${idPrefix}-option-editor-${optionGroupEditorKey}-title`}
            value={optionGroupEditorState.draft.title}
            onChange={(event) => handleOptionGroupDraftFieldChange('title', event.target.value)}
            disabled={isOptionGroupEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-sort-order`} label="Sort order">
          <Input
            id={`${idPrefix}-option-editor-${optionGroupEditorKey}-sort-order`}
            inputMode="numeric"
            value={optionGroupEditorState.draft.sortOrder}
            onChange={(event) => handleOptionGroupDraftFieldChange('sortOrder', event.target.value)}
            disabled={isOptionGroupEditorBusy}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className={SUBSECTION_LABEL_CLASSNAME}>Значения опции</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddOptionValueDraft} disabled={isOptionGroupEditorBusy}>
          Добавить значение
        </Button>
      </div>

      {optionGroupEditorState.draft.values.length ? (
        <div className="space-y-2">
          {optionGroupEditorState.draft.values.map((value, valueIndex) => (
            <div key={`option-editor-value-${valueIndex}`} className="space-y-3 rounded-xl border border-border/60 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <FormField htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-code`} label="Code">
                  <Input
                    id={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-code`}
                    value={value.code}
                    onChange={(event) => handleOptionValueDraftFieldChange(valueIndex, 'code', event.target.value)}
                    disabled={isOptionGroupEditorBusy}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-title`} label="Название">
                  <Input
                    id={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-title`}
                    value={value.title}
                    onChange={(event) => handleOptionValueDraftFieldChange(valueIndex, 'title', event.target.value)}
                    disabled={isOptionGroupEditorBusy}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-sort-order`} label="Sort order">
                  <Input
                    id={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-sort-order`}
                    inputMode="numeric"
                    value={value.sortOrder}
                    onChange={(event) => handleOptionValueDraftFieldChange(valueIndex, 'sortOrder', event.target.value)}
                    disabled={isOptionGroupEditorBusy}
                  />
                </FormField>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveOptionValueDraft(valueIndex)}
                disabled={isOptionGroupEditorBusy}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Значения опции пока не добавлены.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {optionGroupEditorState.mode === 'edit' ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteOptionGroupFromEditor}
            disabled={isOptionGroupEditorBusy}
          >
            Удалить опцию
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleCloseOptionGroupEditor} disabled={isOptionGroupEditorBusy}>
          Отменить
        </Button>
        <Button
          type="button"
          onClick={handleConfirmOptionGroupEditor}
          disabled={isOptionGroupEditorBusy}
        >
          {optionGroupEditorState.mode === 'create' ? 'Добавить опцию' : 'Сохранить опцию'}
        </Button>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    const isOptionGroupDrawerOpen = optionGroupEditorMode === 'drawer' && Boolean(optionGroupEditorState);
    const isVariantDrawerOpen = variantEditorMode === 'drawer' && Boolean(variantEditorState);

    if (!isOptionGroupDrawerOpen && !isVariantDrawerOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isOptionGroupDrawerOpen && isOptionGroupEditorBusy) {
        return;
      }

      if (isVariantDrawerOpen && isVariantEditorBusy) {
        return;
      }

      if (isOptionGroupDrawerOpen) {
        handleCloseOptionGroupEditor();
      }

      if (isVariantDrawerOpen) {
        handleCloseVariantEditor();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [
    isOptionGroupEditorBusy,
    isVariantEditorBusy,
    optionGroupEditorMode,
    optionGroupEditorState,
    variantEditorMode,
    variantEditorState,
  ]);

  const variantEditorContent = variantEditorState ? (
    <div className="space-y-4" aria-label="Редактирование варианта товара">
      {variantEditorMode === 'inline' ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{variantEditorTitle}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {variantEditorState.draft.images.length ? (
          <div className="flex flex-wrap gap-2">
            {variantEditorState.draft.images.map((image, imageIndex) => (
              <div key={`${image.id ?? image.url}-${imageIndex}`} className="relative">
                <img
                  className="h-24 w-24 rounded-lg object-cover"
                  src={image.url}
                  alt={`${variantImageAltBase} • фото ${imageIndex + 1}`}
                />
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold leading-none text-white"
                  onClick={() => handleRemoveVariantDraftImage(imageIndex)}
                  disabled={isVariantEditorBusy}
                  aria-label={`Удалить фото варианта ${imageIndex + 1}`}
                  title="Удалить фото"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Фотографии варианта не загружены</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVariantImageUploadClick}
            disabled={isVariantEditorBusy}
          >
            {isVariantImageUploading ? 'Загрузка...' : 'Загрузить фото'}
          </Button>
          <input
            ref={variantImageUploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => void handleVariantImageUpload(event)}
            disabled={isVariantEditorBusy}
            tabIndex={-1}
          />
          {variantImageUploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {variantImageUploadError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-external-id`} label="External ID">
          <Input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-external-id`}
            value={variantEditorState.draft.externalId}
            onChange={(event) => handleVariantDraftFieldChange('externalId', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-sku`} label="SKU">
          <Input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-sku`}
            value={variantEditorState.draft.sku}
            onChange={(event) => handleVariantDraftFieldChange('sku', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-title`} label="Название">
          <Input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-title`}
            value={variantEditorState.draft.title}
            onChange={(event) => handleVariantDraftFieldChange('title', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-price`} label="Цена, руб.">
          <Input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-price`}
            inputMode="decimal"
            value={variantEditorState.draft.price}
            onChange={(event) => handleVariantDraftFieldChange('price', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-old-price`} label="Старая цена, руб.">
          <Input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-old-price`}
            inputMode="decimal"
            value={variantEditorState.draft.oldPrice}
            onChange={(event) => handleVariantDraftFieldChange('oldPrice', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-sort-order`} label="Sort order">
          <Input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-sort-order`}
            inputMode="numeric"
            value={variantEditorState.draft.sortOrder}
            onChange={(event) => handleVariantDraftFieldChange('sortOrder', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </FormField>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          id={`${idPrefix}-variant-editor-${variantEditorKey}-active`}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={variantEditorState.draft.isActive}
          onChange={(event) => handleVariantDraftIsActiveChange(event.target.checked)}
          disabled={isVariantEditorBusy}
        />
        <span className="text-sm font-medium">Активен</span>
      </label>

      {formValues.optionGroups.length ? (
        <div className="space-y-2">
          {formValues.optionGroups.map((group, groupIndex) => {
            const normalizedGroupCode = group.code.trim();
            const selectedOption =
              variantEditorState.draft.options.find((option) => option.optionGroupCode === normalizedGroupCode) ?? null;

            return (
              <FormField
                key={`variant-editor-option-${groupIndex}`}
                htmlFor={`${idPrefix}-variant-editor-option-${variantEditorKey}-${groupIndex}`}
                label={group.title.trim() || `Группа #${groupIndex + 1}`}
              >
                <select
                  id={`${idPrefix}-variant-editor-option-${variantEditorKey}-${groupIndex}`}
                  className={SELECT_CLASSNAME}
                  value={selectedOption?.optionValueCode ?? ''}
                  onChange={(event) => handleVariantDraftOptionValueChange(normalizedGroupCode, event.target.value)}
                  disabled={isVariantEditorBusy || !normalizedGroupCode}
                >
                  <option value="">Выберите значение</option>
                  {group.values.map((value, valueIndex) => {
                    const normalizedValueCode = value.code.trim();

                    return (
                      <option
                        key={`variant-editor-option-${groupIndex}-value-${valueIndex}`}
                        value={normalizedValueCode}
                        disabled={!normalizedValueCode}
                      >
                        {value.title.trim() || normalizedValueCode || `Значение #${valueIndex + 1}`}
                      </option>
                    );
                  })}
                </select>
              </FormField>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Добавьте группы опций, чтобы выбрать значения для варианта.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {variantEditorState.mode === 'edit' ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteVariantFromEditor}
            disabled={isVariantEditorBusy}
          >
            Удалить вариант
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleCloseVariantEditor} disabled={isVariantEditorBusy}>
          Отменить
        </Button>
        <Button
          type="button"
          onClick={handleConfirmVariantEditor}
          disabled={isVariantEditorBusy}
        >
          {variantEditorState.mode === 'create' ? 'Добавить вариант' : 'Сохранить вариант'}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Основные поля */}
      <AdminSectionCard eyebrow={eyebrow} title={title} description={description} aria-label={ariaLabel}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField htmlFor={`${idPrefix}-title`} label="Название">
              <Input
                id={`${idPrefix}-title`}
                value={formValues.title}
                onChange={(event) => handleFieldChange('title', event.target.value)}
                disabled={isSaving}
              />
            </FormField>

            <FormField htmlFor={`${idPrefix}-category`} label="Категория">
              <select
                id={`${idPrefix}-category`}
                className={SELECT_CLASSNAME}
                value={formValues.categoryId}
                onChange={(event) => handleFieldChange('categoryId', event.target.value)}
                disabled={isSaving || disableCategorySelect}
              >
                {!categoryOptions.length ? <option value="">{emptyCategoryLabel}</option> : null}
                {categoryOptions.map(([id, categoryTitle]) => (
                  <option key={id} value={id}>
                    {categoryTitle}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField htmlFor={`${idPrefix}-price`} label="Цена, руб.">
              <Input
                id={`${idPrefix}-price`}
                inputMode="decimal"
                value={formValues.price}
                onChange={(event) => handleFieldChange('price', event.target.value)}
                disabled={isSaving}
              />
            </FormField>

            <FormField htmlFor={`${idPrefix}-old-price`} label="Старая цена, руб.">
              <Input
                id={`${idPrefix}-old-price`}
                inputMode="decimal"
                value={formValues.oldPrice}
                onChange={(event) => handleFieldChange('oldPrice', event.target.value)}
                disabled={isSaving}
              />
            </FormField>

            <FormField htmlFor={`${idPrefix}-unit`} label="Единица измерения">
              <select
                id={`${idPrefix}-unit`}
                className={SELECT_CLASSNAME}
                value={formValues.unit}
                onChange={(event) => handleFieldChange('unit', event.target.value)}
                disabled={isSaving}
              >
                {PRODUCT_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField htmlFor={`${idPrefix}-step`} label="Шаг продажи">
              <Input
                id={`${idPrefix}-step`}
                inputMode="numeric"
                value={formValues.countStep}
                onChange={(event) => handleFieldChange('countStep', event.target.value)}
                disabled={isSaving}
              />
            </FormField>

            <FormField htmlFor={`${idPrefix}-weight`} label="Вес на витрине">
              <Input
                id={`${idPrefix}-weight`}
                value={formValues.displayWeight}
                onChange={(event) => handleFieldChange('displayWeight', event.target.value)}
                disabled={isSaving}
              />
            </FormField>

            <FormField htmlFor={`${idPrefix}-sku`} label="SKU">
              <Input
                id={`${idPrefix}-sku`}
                value={formValues.sku}
                onChange={(event) => handleFieldChange('sku', event.target.value)}
                disabled={isSaving}
              />
            </FormField>
          </div>

          <hr className="border-border/60" />

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                id={`${idPrefix}-active`}
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={formValues.isActive}
                onChange={(event) => handleIsActiveChange(event.target.checked)}
                disabled={isSaving}
              />
              <span className="text-sm font-medium">Отображать на витрине</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                id={`${idPrefix}-has-variants`}
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={formValues.hasVariants}
                onChange={(event) => handleHasVariantsChange(event.target.checked)}
                disabled={isSaving}
              />
              <span className="text-sm font-medium">Товар с вариантами</span>
            </label>

            {!formValues.hasVariants ? (
              <p className="text-sm text-muted-foreground">
                Режим вариантов выключен. Товар сохранится как обычный (simple product).
              </p>
            ) : null}
          </div>
        </div>
      </AdminSectionCard>

      {/* Опции товара */}
      {formValues.hasVariants ? (
        <>
          <AdminSectionCard
            eyebrow="Варианты"
            title="Опции товара"
            action={
              <Button variant="outline" onClick={handleOpenOptionGroupCreate} disabled={isSaving}>
                Добавить опцию
              </Button>
            }
          >
            {formValues.optionGroups.length ? (
              <LazyDataTable
                columns={optionGroupColumns}
                data={formValues.optionGroups}
                fallback={<p className="text-sm text-muted-foreground">Загрузка таблицы опций...</p>}
                getRowId={(_, index) => `option-group-${index}`}
                getRowClassName={(row) =>
                  optionGroupEditorState?.mode === 'edit' && optionGroupEditorState.optionGroupIndex === row.index
                    ? 'bg-accent/50'
                    : undefined
                }
                wrapperClassName="overflow-auto rounded-xl border border-border/60"
                tableClassName="w-full text-sm"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Группы опций пока не добавлены.</p>
            )}

            {optionGroupEditorMode === 'inline' ? optionGroupEditorContent : null}
          </AdminSectionCard>

          <AdminSectionCard
            eyebrow="Варианты"
            title="Варианты товара"
            action={
              <Button variant="outline" onClick={handleOpenVariantCreate} disabled={isVariantEditorBusy}>
                Добавить вариант
              </Button>
            }
          >
            {formValues.variants.length ? (
              <LazyDataTable
                columns={variantColumns}
                data={formValues.variants}
                fallback={<p className="text-sm text-muted-foreground">Загрузка таблицы вариантов...</p>}
                getRowId={(_, index) => `variant-${index}`}
                getRowClassName={(row) =>
                  variantEditorState?.mode === 'edit' && variantEditorState.variantIndex === row.index
                    ? 'bg-accent/50'
                    : undefined
                }
                wrapperClassName="overflow-auto rounded-xl border border-border/60"
                tableClassName="w-full text-sm"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Варианты пока не добавлены.</p>
            )}

            {variantEditorMode === 'inline' ? variantEditorContent : null}
          </AdminSectionCard>
        </>
      ) : null}

      {/* Модификаторы */}
      <AdminSectionCard
        eyebrow="Модификаторы"
        title="Привязки к группам"
        description="Привяжите к товару готовые группы модификаторов из административного справочника."
        action={
          availableModifierGroups.length ? (
            <Button variant="outline" onClick={handleAddModifierGroup} disabled={isSaving}>
              Добавить модификатор
            </Button>
          ) : undefined
        }
      >
        {!availableModifierGroups.length ? (
          <p className="text-sm text-muted-foreground">
            Сначала создайте хотя бы одну группу модификаторов в соответствующем разделе каталога.
          </p>
        ) : formValues.modifierGroups.length ? (
          <div className="space-y-3">
            {formValues.modifierGroups.map((modifierGroup, modifierGroupIndex) => {
              const selectedModifierGroupId = modifierGroup.modifierGroupId.trim();
              const selectedModifierGroup = modifierGroupLookup.get(selectedModifierGroupId) ?? null;

              return (
                <div key={`modifier-group-${modifierGroupIndex}`} className="space-y-3 rounded-xl border border-border/60 p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <FormField htmlFor={`${idPrefix}-modifier-group-${modifierGroupIndex}-id`} label="Группа">
                      <select
                        id={`${idPrefix}-modifier-group-${modifierGroupIndex}-id`}
                        className={SELECT_CLASSNAME}
                        value={modifierGroup.modifierGroupId}
                        onChange={(event) =>
                          handleModifierGroupFieldChange(modifierGroupIndex, 'modifierGroupId', event.target.value)
                        }
                        disabled={isSaving}
                      >
                        <option value="">Выберите группу</option>
                        {availableModifierGroups.map((group) => {
                          const isTakenByAnotherRow = formValues.modifierGroups.some(
                            (currentModifierGroup, currentModifierGroupIndex) =>
                              currentModifierGroupIndex !== modifierGroupIndex &&
                              currentModifierGroup.modifierGroupId.trim() === group.id,
                          );

                          return (
                            <option key={group.id} value={group.id} disabled={isTakenByAnotherRow}>
                              {group.name} ({group.code})
                            </option>
                          );
                        })}
                      </select>
                    </FormField>

                    <FormField htmlFor={`${idPrefix}-modifier-group-${modifierGroupIndex}-sort-order`} label="Sort order">
                      <Input
                        id={`${idPrefix}-modifier-group-${modifierGroupIndex}-sort-order`}
                        inputMode="numeric"
                        value={modifierGroup.sortOrder}
                        onChange={(event) => handleModifierGroupFieldChange(modifierGroupIndex, 'sortOrder', event.target.value)}
                        disabled={isSaving}
                      />
                    </FormField>

                    <div className="flex items-end pb-1">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={modifierGroup.isActive}
                          onChange={(event) => handleModifierGroupIsActiveChange(modifierGroupIndex, event.target.checked)}
                          disabled={isSaving}
                        />
                        <span className="text-sm font-medium">Привязка активна</span>
                      </label>
                    </div>
                  </div>

                  {selectedModifierGroup ? (
                    <div className="space-y-0.5">
                      <p className="text-sm text-muted-foreground">
                        {selectedModifierGroup.code} • {formatModifierConstraints(selectedModifierGroup)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Справочник: {selectedModifierGroup.isActive ? 'активен' : 'выключен'}
                      </p>
                    </div>
                  ) : selectedModifierGroupId ? (
                    <p className="text-sm text-destructive">Выбранная группа модификаторов не найдена в справочнике.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Выберите группу, чтобы увидеть ограничения и состав опций.</p>
                  )}

                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveModifierGroup(modifierGroupIndex)}
                      disabled={isSaving}
                    >
                      Удалить модификатор
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Модификаторы пока не привязаны.</p>
        )}
      </AdminSectionCard>

      {/* Описание */}
      <AdminSectionCard eyebrow="Описание" title="Текстовое описание">
        <FormField htmlFor={`${idPrefix}-description`} label="Описание">
          <textarea
            id={`${idPrefix}-description`}
            className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            rows={6}
            value={formValues.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            disabled={isSaving}
          />
        </FormField>
      </AdminSectionCard>

      {/* Сохранение */}
      <AdminSectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSubmit} disabled={isVariantEditorBusy}>
            {isSaving ? savingLabel : submitLabel}
          </Button>
        </div>

        {saveError ? (
          <AdminNotice tone="destructive" role="alert">{saveError}</AdminNotice>
        ) : null}

        {saveSuccess ? (
          <AdminNotice>{saveSuccess}</AdminNotice>
        ) : null}
      </AdminSectionCard>

      {/* Drawer: опция товара */}
      {optionGroupEditorState && optionGroupEditorMode === 'drawer' ? (
        <div className="fixed inset-0 z-50" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Закрыть панель опции товара"
            onClick={handleCloseOptionGroupEditor}
            disabled={isOptionGroupEditorBusy}
          />

          <aside
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-hidden bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={optionGroupEditorTitleId}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-6 py-4">
              <div>
                <p className={SUBSECTION_LABEL_CLASSNAME}>Опция товара</p>
                <h3 id={optionGroupEditorTitleId} className="text-lg font-semibold">
                  {optionGroupEditorTitle}
                </h3>
              </div>
              <Button variant="outline" onClick={handleCloseOptionGroupEditor} disabled={isOptionGroupEditorBusy}>
                Закрыть
              </Button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {optionGroupEditorContent}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Drawer: вариант товара */}
      {variantEditorState && variantEditorMode === 'drawer' ? (
        <div className="fixed inset-0 z-50" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Закрыть панель варианта товара"
            onClick={handleCloseVariantEditor}
            disabled={isVariantEditorBusy}
          />

          <aside
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-hidden bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={variantEditorTitleId}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-6 py-4">
              <div>
                <p className={SUBSECTION_LABEL_CLASSNAME}>Вариант товара</p>
                <h3 id={variantEditorTitleId} className="text-lg font-semibold">
                  {variantEditorTitle}
                </h3>
              </div>
              <Button variant="outline" onClick={handleCloseVariantEditor} disabled={isVariantEditorBusy}>
                Закрыть
              </Button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {variantEditorContent}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
