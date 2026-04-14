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
            className="product-option-row-button"
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
          cellClassName: 'product-options-cell-numeric',
        },
      },
      {
        id: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => row.original.sortOrder.trim() || '0',
        meta: {
          cellClassName: 'product-options-cell-numeric',
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
            className="product-variant-row-button"
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
          cellClassName: 'product-variants-cell-numeric',
        },
      },
      {
        id: 'price',
        header: 'Цена',
        cell: ({ row }) => getVariantPriceLabel(row.original.price),
        meta: {
          cellClassName: 'product-variants-cell-numeric',
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
    <div
      className={`product-option-editor${optionGroupEditorMode === 'drawer' ? ' product-option-editor-drawer' : ''}`}
      aria-label="Редактирование опции товара"
    >
      {optionGroupEditorMode === 'inline' ? (
        <div className="product-editor-card-header">
          <p className="product-editor-card-title">{optionGroupEditorTitle}</p>
        </div>
      ) : null}

      <div className="product-editor-inline-grid product-editor-inline-grid-3">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-code`}>
            Code
          </label>
          <input
            id={`${idPrefix}-option-editor-${optionGroupEditorKey}-code`}
            className="field-input"
            value={optionGroupEditorState.draft.code}
            onChange={(event) => handleOptionGroupDraftFieldChange('code', event.target.value)}
            disabled={isOptionGroupEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-title`}>
            Название
          </label>
          <input
            id={`${idPrefix}-option-editor-${optionGroupEditorKey}-title`}
            className="field-input"
            value={optionGroupEditorState.draft.title}
            onChange={(event) => handleOptionGroupDraftFieldChange('title', event.target.value)}
            disabled={isOptionGroupEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-sort-order`}>
            Sort order
          </label>
          <input
            id={`${idPrefix}-option-editor-${optionGroupEditorKey}-sort-order`}
            className="field-input"
            inputMode="numeric"
            value={optionGroupEditorState.draft.sortOrder}
            onChange={(event) => handleOptionGroupDraftFieldChange('sortOrder', event.target.value)}
            disabled={isOptionGroupEditorBusy}
          />
        </div>
      </div>

      <div className="product-editor-subsection-header">
        <p className="product-editor-card-title">Значения опции</p>
        <button type="button" className="secondary-button" onClick={handleAddOptionValueDraft} disabled={isOptionGroupEditorBusy}>
          Добавить значение
        </button>
      </div>

      {optionGroupEditorState.draft.values.length ? (
        <div className="product-editor-list product-editor-list-compact">
          {optionGroupEditorState.draft.values.map((value, valueIndex) => (
            <div key={`option-editor-value-${valueIndex}`} className="product-editor-row">
              <div className="product-editor-inline-grid product-editor-inline-grid-3">
                <div className="field">
                  <label className="field-label" htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-code`}>
                    Code
                  </label>
                  <input
                    id={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-code`}
                    className="field-input"
                    value={value.code}
                    onChange={(event) => handleOptionValueDraftFieldChange(valueIndex, 'code', event.target.value)}
                    disabled={isOptionGroupEditorBusy}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-title`}>
                    Название
                  </label>
                  <input
                    id={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-title`}
                    className="field-input"
                    value={value.title}
                    onChange={(event) => handleOptionValueDraftFieldChange(valueIndex, 'title', event.target.value)}
                    disabled={isOptionGroupEditorBusy}
                  />
                </div>

                <div className="field">
                  <label
                    className="field-label"
                    htmlFor={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-sort-order`}
                  >
                    Sort order
                  </label>
                  <input
                    id={`${idPrefix}-option-editor-${optionGroupEditorKey}-value-${valueIndex}-sort-order`}
                    className="field-input"
                    inputMode="numeric"
                    value={value.sortOrder}
                    onChange={(event) => handleOptionValueDraftFieldChange(valueIndex, 'sortOrder', event.target.value)}
                    disabled={isOptionGroupEditorBusy}
                  />
                </div>
              </div>

              <button
                type="button"
                className="secondary-button secondary-button-danger"
                onClick={() => handleRemoveOptionValueDraft(valueIndex)}
                disabled={isOptionGroupEditorBusy}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="catalog-meta">Значения опции пока не добавлены.</p>
      )}

      <div className="product-option-editor-actions">
        {optionGroupEditorState.mode === 'edit' ? (
          <button
            type="button"
            className="secondary-button secondary-button-danger"
            onClick={handleDeleteOptionGroupFromEditor}
            disabled={isOptionGroupEditorBusy}
          >
            Удалить опцию
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={handleCloseOptionGroupEditor} disabled={isOptionGroupEditorBusy}>
          Отменить
        </button>
        <button
          type="button"
          className="submit-button product-option-editor-submit"
          onClick={handleConfirmOptionGroupEditor}
          disabled={isOptionGroupEditorBusy}
        >
          {optionGroupEditorState.mode === 'create' ? 'Добавить опцию' : 'Сохранить опцию'}
        </button>
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
    <div
      className={`product-variant-editor${variantEditorMode === 'drawer' ? ' product-variant-editor-drawer' : ''}`}
      aria-label="Редактирование варианта товара"
    >
      {variantEditorMode === 'inline' ? (
        <div className="product-editor-card-header">
          <p className="product-editor-card-title">{variantEditorTitle}</p>
        </div>
      ) : null}

      <div className="product-variant-image-field">
        {variantEditorState.draft.images.length ? (
          <div className="product-variant-image-list">
            {variantEditorState.draft.images.map((image, imageIndex) => (
              <div key={`${image.id ?? image.url}-${imageIndex}`} className="media-image-card">
                <img
                  className="product-variant-image-preview"
                  src={image.url}
                  alt={`${variantImageAltBase} • фото ${imageIndex + 1}`}
                />
                <button
                  type="button"
                  className="media-image-remove-button"
                  onClick={() => handleRemoveVariantDraftImage(imageIndex)}
                  disabled={isVariantEditorBusy}
                  aria-label={`Удалить фото варианта ${imageIndex + 1}`}
                  title="Удалить фото"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="product-variant-image-placeholder">Фотографии варианта не загружены</div>
        )}

        <div className="product-media-actions product-variant-image-actions">
          <button
            type="button"
            className="secondary-button image-upload-button"
            onClick={handleVariantImageUploadClick}
            disabled={isVariantEditorBusy}
          >
            {isVariantImageUploading ? 'Загрузка...' : 'Загрузить фото'}
          </button>
          <input
            ref={variantImageUploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="file-picker-input"
            onChange={(event) => void handleVariantImageUpload(event)}
            disabled={isVariantEditorBusy}
            tabIndex={-1}
          />
          {variantImageUploadError ? (
            <p className="field-error" role="alert">
              {variantImageUploadError}
            </p>
          ) : (
            null
          )}
        </div>
      </div>

      <div className="product-editor-inline-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-external-id`}>
            External ID
          </label>
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-external-id`}
            className="field-input"
            value={variantEditorState.draft.externalId}
            onChange={(event) => handleVariantDraftFieldChange('externalId', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-sku`}>
            SKU
          </label>
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-sku`}
            className="field-input"
            value={variantEditorState.draft.sku}
            onChange={(event) => handleVariantDraftFieldChange('sku', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-title`}>
            Название
          </label>
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-title`}
            className="field-input"
            value={variantEditorState.draft.title}
            onChange={(event) => handleVariantDraftFieldChange('title', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-price`}>
            Цена, руб.
          </label>
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-price`}
            className="field-input"
            inputMode="decimal"
            value={variantEditorState.draft.price}
            onChange={(event) => handleVariantDraftFieldChange('price', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-old-price`}>
            Старая цена, руб.
          </label>
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-old-price`}
            className="field-input"
            inputMode="decimal"
            value={variantEditorState.draft.oldPrice}
            onChange={(event) => handleVariantDraftFieldChange('oldPrice', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-sort-order`}>
            Sort order
          </label>
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-sort-order`}
            className="field-input"
            inputMode="numeric"
            value={variantEditorState.draft.sortOrder}
            onChange={(event) => handleVariantDraftFieldChange('sortOrder', event.target.value)}
            disabled={isVariantEditorBusy}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-checkbox">
          <input
            id={`${idPrefix}-variant-editor-${variantEditorKey}-active`}
            type="checkbox"
            checked={variantEditorState.draft.isActive}
            onChange={(event) => handleVariantDraftIsActiveChange(event.target.checked)}
            disabled={isVariantEditorBusy}
          />
          <span className="field-label">Активен</span>
        </label>
      </div>

      {formValues.optionGroups.length ? (
        <div className="product-editor-list product-editor-list-compact">
          {formValues.optionGroups.map((group, groupIndex) => {
            const normalizedGroupCode = group.code.trim();
            const selectedOption =
              variantEditorState.draft.options.find((option) => option.optionGroupCode === normalizedGroupCode) ?? null;

            return (
              <div key={`variant-editor-option-${groupIndex}`} className="field">
                <label className="field-label" htmlFor={`${idPrefix}-variant-editor-option-${variantEditorKey}-${groupIndex}`}>
                  {group.title.trim() || `Группа #${groupIndex + 1}`}
                </label>
                <select
                  id={`${idPrefix}-variant-editor-option-${variantEditorKey}-${groupIndex}`}
                  className="field-input"
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
              </div>
            );
          })}
        </div>
      ) : (
        <p className="catalog-meta">Добавьте группы опций, чтобы выбрать значения для варианта.</p>
      )}

      <div className="product-variant-editor-actions">
        {variantEditorState.mode === 'edit' ? (
          <button
            type="button"
            className="secondary-button secondary-button-danger"
            onClick={handleDeleteVariantFromEditor}
            disabled={isVariantEditorBusy}
          >
            Удалить вариант
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={handleCloseVariantEditor} disabled={isVariantEditorBusy}>
          Отменить
        </button>
        <button
          type="button"
          className="submit-button product-variant-editor-submit"
          onClick={handleConfirmVariantEditor}
          disabled={isVariantEditorBusy}
        >
          {variantEditorState.mode === 'create' ? 'Добавить вариант' : 'Сохранить вариант'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <section className="product-edit-section" aria-label={ariaLabel}>
      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">{eyebrow}</p>
        <h4 className="catalog-card-title">{title}</h4>
        {description ? <p className="catalog-meta">{description}</p> : null}
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-title`}>
            Название
          </label>
          <input
            id={`${idPrefix}-title`}
            className="field-input"
            value={formValues.title}
            onChange={(event) => handleFieldChange('title', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-category`}>
            Категория
          </label>
          <select
            id={`${idPrefix}-category`}
            className="field-input"
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
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-price`}>
            Цена, руб.
          </label>
          <input
            id={`${idPrefix}-price`}
            className="field-input"
            inputMode="decimal"
            value={formValues.price}
            onChange={(event) => handleFieldChange('price', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-old-price`}>
            Старая цена, руб.
          </label>
          <input
            id={`${idPrefix}-old-price`}
            className="field-input"
            inputMode="decimal"
            value={formValues.oldPrice}
            onChange={(event) => handleFieldChange('oldPrice', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-unit`}>
            Единица измерения
          </label>
          <select
            id={`${idPrefix}-unit`}
            className="field-input"
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
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-step`}>
            Шаг продажи
          </label>
          <input
            id={`${idPrefix}-step`}
            className="field-input"
            inputMode="numeric"
            value={formValues.countStep}
            onChange={(event) => handleFieldChange('countStep', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-weight`}>
            Вес на витрине
          </label>
          <input
            id={`${idPrefix}-weight`}
            className="field-input"
            value={formValues.displayWeight}
            onChange={(event) => handleFieldChange('displayWeight', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-sku`}>
            SKU
          </label>
          <input
            id={`${idPrefix}-sku`}
            className="field-input"
            value={formValues.sku}
            onChange={(event) => handleFieldChange('sku', event.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-checkbox">
          <input
            id={`${idPrefix}-active`}
            type="checkbox"
            checked={formValues.isActive}
            onChange={(event) => handleIsActiveChange(event.target.checked)}
            disabled={isSaving}
          />
          <span className="field-label">Отображать на витрине</span>
        </label>
      </div>

      <div className="field">
        <label className="field-checkbox">
          <input
            id={`${idPrefix}-has-variants`}
            type="checkbox"
            checked={formValues.hasVariants}
            onChange={(event) => handleHasVariantsChange(event.target.checked)}
            disabled={isSaving}
          />
          <span className="field-label">Товар с вариантами</span>
        </label>
      </div>

      {formValues.hasVariants ? (
        <>
          <section className="product-editor-subsection product-editor-subsection-borderless" aria-label="Опции товара">
            <div className="product-editor-subsection-header">
              <h5 className="product-editor-subsection-title">Опции товара</h5>
              <button type="button" className="secondary-button" onClick={handleOpenOptionGroupCreate} disabled={isSaving}>
                Добавить опцию
              </button>
            </div>

	            {formValues.optionGroups.length ? (
	              <LazyDataTable
	                columns={optionGroupColumns}
	                data={formValues.optionGroups}
	                fallback={<p className="catalog-meta">Загрузка таблицы опций...</p>}
	                getRowId={(_, index) => `option-group-${index}`}
	                getRowClassName={(row) =>
	                  optionGroupEditorState?.mode === 'edit' && optionGroupEditorState.optionGroupIndex === row.index
	                    ? 'product-options-row-selected'
	                    : undefined
	                }
	                wrapperClassName="product-options-table-wrap"
	                tableClassName="product-options-table"
	              />
	            ) : (
	              <p className="catalog-meta">Группы опций пока не добавлены.</p>
	            )}

            {optionGroupEditorMode === 'inline' ? optionGroupEditorContent : null}
          </section>

          <section className="product-editor-subsection product-editor-subsection-borderless" aria-label="Варианты товара">
            <div className="product-editor-subsection-header">
              <h5 className="product-editor-subsection-title">Варианты товара</h5>
              <button type="button" className="secondary-button" onClick={handleOpenVariantCreate} disabled={isVariantEditorBusy}>
                Добавить вариант
              </button>
            </div>

	            {formValues.variants.length ? (
	              <LazyDataTable
	                columns={variantColumns}
	                data={formValues.variants}
	                fallback={<p className="catalog-meta">Загрузка таблицы вариантов...</p>}
	                getRowId={(_, index) => `variant-${index}`}
	                getRowClassName={(row) =>
	                  variantEditorState?.mode === 'edit' && variantEditorState.variantIndex === row.index
	                    ? 'product-variants-row-selected'
	                    : undefined
	                }
	                wrapperClassName="product-variants-table-wrap"
	                tableClassName="product-variants-table"
	              />
	            ) : (
	              <p className="catalog-meta">Варианты пока не добавлены.</p>
	            )}

            {variantEditorMode === 'inline' ? variantEditorContent : null}
          </section>
        </>
      ) : (
        <p className="catalog-meta">Режим вариантов выключен. Товар сохранится как обычный (simple product).</p>
      )}

      <section className="product-editor-subsection" aria-label="Модификаторы товара">
        <div className="product-editor-subsection-header">
          <div className="catalog-card-copy">
            <h5 className="product-editor-subsection-title">Модификаторы товара</h5>
            <p className="catalog-meta">Привяжите к товару готовые группы модификаторов из административного справочника.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={handleAddModifierGroup}
            disabled={isSaving || !availableModifierGroups.length}
          >
            Добавить модификатор
          </button>
        </div>

        {!availableModifierGroups.length ? (
          <p className="catalog-meta">Сначала создайте хотя бы одну группу модификаторов в соответствующем разделе каталога.</p>
        ) : formValues.modifierGroups.length ? (
          <div className="product-editor-list">
            {formValues.modifierGroups.map((modifierGroup, modifierGroupIndex) => {
              const selectedModifierGroupId = modifierGroup.modifierGroupId.trim();
              const selectedModifierGroup = modifierGroupLookup.get(selectedModifierGroupId) ?? null;

              return (
                <div key={`modifier-group-${modifierGroupIndex}`} className="product-editor-row">
                  <div className="product-editor-inline-grid product-editor-inline-grid-3">
                    <div className="field">
                      <label className="field-label" htmlFor={`${idPrefix}-modifier-group-${modifierGroupIndex}-id`}>
                        Группа
                      </label>
                      <select
                        id={`${idPrefix}-modifier-group-${modifierGroupIndex}-id`}
                        className="field-input"
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
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor={`${idPrefix}-modifier-group-${modifierGroupIndex}-sort-order`}>
                        Sort order
                      </label>
                      <input
                        id={`${idPrefix}-modifier-group-${modifierGroupIndex}-sort-order`}
                        className="field-input"
                        inputMode="numeric"
                        value={modifierGroup.sortOrder}
                        onChange={(event) => handleModifierGroupFieldChange(modifierGroupIndex, 'sortOrder', event.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="field">
                      <label className="field-checkbox">
                        <input
                          type="checkbox"
                          checked={modifierGroup.isActive}
                          onChange={(event) => handleModifierGroupIsActiveChange(modifierGroupIndex, event.target.checked)}
                          disabled={isSaving}
                        />
                        <span className="field-label">Привязка активна</span>
                      </label>
                    </div>
                  </div>

                  {selectedModifierGroup ? (
                    <div className="product-editor-helper-list">
                      <p className="catalog-meta">
                        {selectedModifierGroup.code} • {formatModifierConstraints(selectedModifierGroup)}
                      </p>
                      <p className="catalog-meta">
                        Справочник: {selectedModifierGroup.isActive ? 'активен' : 'выключен'}
                      </p>
                    </div>
                  ) : selectedModifierGroupId ? (
                    <p className="form-error">Выбранная группа модификаторов не найдена в справочнике.</p>
                  ) : (
                    <p className="catalog-meta">Выберите группу, чтобы увидеть ограничения и состав опций.</p>
                  )}

                  <div className="product-option-editor-actions">
                    <button
                      type="button"
                      className="secondary-button secondary-button-danger"
                      onClick={() => handleRemoveModifierGroup(modifierGroupIndex)}
                      disabled={isSaving}
                    >
                      Удалить модификатор
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="catalog-meta">Модификаторы пока не привязаны.</p>
        )}
      </section>

      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-description`}>
          Описание
        </label>
        <textarea
          id={`${idPrefix}-description`}
          className="field-input field-textarea"
          value={formValues.description}
          onChange={(event) => handleFieldChange('description', event.target.value)}
          disabled={isSaving}
        />
      </div>

      {saveError ? (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      ) : null}

      {saveSuccess ? (
        <p className="form-success" role="status">
          {saveSuccess}
        </p>
      ) : null}

      <div className="product-edit-actions">
        <button type="button" className="submit-button" onClick={onSubmit} disabled={isVariantEditorBusy}>
          {isSaving ? savingLabel : submitLabel}
        </button>
      </div>

      {optionGroupEditorState && optionGroupEditorMode === 'drawer' ? (
        <div className="product-editor-drawer-root" role="presentation">
          <button
            type="button"
            className="product-editor-drawer-backdrop"
            aria-label="Закрыть панель опции товара"
            onClick={handleCloseOptionGroupEditor}
            disabled={isOptionGroupEditorBusy}
          />

          <aside className="product-editor-drawer" role="dialog" aria-modal="true" aria-labelledby={optionGroupEditorTitleId}>
            <header className="product-editor-drawer-header">
              <div>
                <p className="placeholder-eyebrow">Опция товара</p>
                <h3 id={optionGroupEditorTitleId} className="product-editor-drawer-title">
                  {optionGroupEditorTitle}
                </h3>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseOptionGroupEditor} disabled={isOptionGroupEditorBusy}>
                Закрыть
              </button>
            </header>

            <div className="product-editor-drawer-content">{optionGroupEditorContent}</div>
          </aside>
        </div>
      ) : null}

      {variantEditorState && variantEditorMode === 'drawer' ? (
        <div className="product-editor-drawer-root" role="presentation">
          <button
            type="button"
            className="product-editor-drawer-backdrop"
            aria-label="Закрыть панель варианта товара"
            onClick={handleCloseVariantEditor}
            disabled={isVariantEditorBusy}
          />

          <aside className="product-editor-drawer" role="dialog" aria-modal="true" aria-labelledby={variantEditorTitleId}>
            <header className="product-editor-drawer-header">
              <div>
                <p className="placeholder-eyebrow">Вариант товара</p>
                <h3 id={variantEditorTitleId} className="product-editor-drawer-title">
                  {variantEditorTitle}
                </h3>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseVariantEditor} disabled={isVariantEditorBusy}>
                Закрыть
              </button>
            </header>

            <div className="product-editor-drawer-content">{variantEditorContent}</div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
