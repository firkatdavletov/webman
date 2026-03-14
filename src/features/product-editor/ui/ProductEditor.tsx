import { useEffect, useMemo, useState } from 'react';
import {
  createEmptyProductOptionGroup,
  createEmptyProductOptionValue,
  createEmptyProductVariant,
  PRODUCT_UNIT_OPTIONS,
  syncVariantOptionsByOptionGroups,
  type ProductEditorOptionGroupValues,
  type ProductEditorValues,
} from '@/features/product-editor/model/productEditor';

type EditableProductField = Exclude<
  keyof ProductEditorValues,
  'isActive' | 'hasVariants' | 'optionGroups' | 'variants'
>;

type EditableVariantField = Exclude<keyof ProductEditorValues['variants'][number], 'isActive' | 'options'>;
type ProductEditorVariantValues = ProductEditorValues['variants'][number];

type VariantEditorState = {
  mode: 'create' | 'edit';
  variantIndex: number | null;
  draft: ProductEditorVariantValues;
};

type ProductEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  categoryOptions: Array<[string, string]>;
  formValues: ProductEditorValues;
  isSaving: boolean;
  disableCategorySelect?: boolean;
  emptyCategoryLabel?: string;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onValuesChange: (updater: (currentValues: ProductEditorValues) => ProductEditorValues) => void;
  onSubmit: () => void;
};

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
    options: variant.options.map((option) => ({
      ...option,
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
  formValues,
  isSaving,
  disableCategorySelect = false,
  emptyCategoryLabel = 'Нет доступных категорий',
  saveError,
  saveSuccess,
  submitLabel,
  savingLabel,
  onValuesChange,
  onSubmit,
}: ProductEditorProps) {
  const [variantEditorState, setVariantEditorState] = useState<VariantEditorState | null>(null);
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

  useEffect(() => {
    if (!formValues.hasVariants) {
      setVariantEditorState(null);
      return;
    }

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

  const handleAddOptionGroup = () => {
    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) => [...groups, createEmptyProductOptionGroup()]),
    );
  };

  const handleRemoveOptionGroup = (groupIndex: number) => {
    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) => groups.filter((_, index) => index !== groupIndex)),
    );
  };

  const handleOptionGroupFieldChange = (
    groupIndex: number,
    field: Exclude<keyof ProductEditorOptionGroupValues, 'values'>,
    value: string,
  ) => {
    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) =>
        groups.map((group, index) => {
          if (index !== groupIndex) {
            return group;
          }

          return {
            ...group,
            [field]: value,
          };
        }),
      ),
    );
  };

  const handleAddOptionValue = (groupIndex: number) => {
    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) =>
        groups.map((group, index) => {
          if (index !== groupIndex) {
            return group;
          }

          return {
            ...group,
            values: [...group.values, createEmptyProductOptionValue()],
          };
        }),
      ),
    );
  };

  const handleRemoveOptionValue = (groupIndex: number, valueIndex: number) => {
    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) =>
        groups.map((group, index) => {
          if (index !== groupIndex) {
            return group;
          }

          return {
            ...group,
            values: group.values.filter((_, currentValueIndex) => currentValueIndex !== valueIndex),
          };
        }),
      ),
    );
  };

  const handleOptionValueFieldChange = (
    groupIndex: number,
    valueIndex: number,
    field: 'code' | 'title' | 'sortOrder',
    value: string,
  ) => {
    onValuesChange((currentValues) =>
      updateOptionGroups(currentValues, (groups) =>
        groups.map((group, currentGroupIndex) => {
          if (currentGroupIndex !== groupIndex) {
            return group;
          }

          return {
            ...group,
            values: group.values.map((optionValue, currentValueIndex) => {
              if (currentValueIndex !== valueIndex) {
                return optionValue;
              }

              return {
                ...optionValue,
                [field]: value,
              };
            }),
          };
        }),
      ),
    );
  };

  const handleOpenVariantCreate = () => {
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

    setVariantEditorState({
      mode: 'edit',
      variantIndex,
      draft: cloneVariant(syncVariantOptionsByOptionGroups(formValues.optionGroups, variant)),
    });
  };

  const handleCloseVariantEditor = () => {
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

    setVariantEditorState(null);
  };

  const variantEditorKey =
    variantEditorState && variantEditorState.mode === 'edit' && variantEditorState.variantIndex !== null
      ? String(variantEditorState.variantIndex)
      : 'new';

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
          <section className="product-editor-subsection" aria-label="Опции товара">
            <div className="product-editor-subsection-header">
              <h5 className="product-editor-subsection-title">Опции товара</h5>
              <button type="button" className="secondary-button" onClick={handleAddOptionGroup} disabled={isSaving}>
                Добавить группу
              </button>
            </div>

            {formValues.optionGroups.length ? (
              <div className="product-editor-list">
                {formValues.optionGroups.map((group, groupIndex) => (
                  <article key={`option-group-${groupIndex}`} className="product-editor-card">
                    <div className="product-editor-card-header">
                      <p className="product-editor-card-title">Группа #{groupIndex + 1}</p>
                      <button
                        type="button"
                        className="secondary-button secondary-button-danger"
                        onClick={() => handleRemoveOptionGroup(groupIndex)}
                        disabled={isSaving}
                      >
                        Удалить группу
                      </button>
                    </div>

                    <div className="product-editor-inline-grid product-editor-inline-grid-3">
                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-option-group-${groupIndex}-code`}>
                          Code
                        </label>
                        <input
                          id={`${idPrefix}-option-group-${groupIndex}-code`}
                          className="field-input"
                          value={group.code}
                          onChange={(event) => handleOptionGroupFieldChange(groupIndex, 'code', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-option-group-${groupIndex}-title`}>
                          Название
                        </label>
                        <input
                          id={`${idPrefix}-option-group-${groupIndex}-title`}
                          className="field-input"
                          value={group.title}
                          onChange={(event) => handleOptionGroupFieldChange(groupIndex, 'title', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-option-group-${groupIndex}-sort-order`}>
                          Sort order
                        </label>
                        <input
                          id={`${idPrefix}-option-group-${groupIndex}-sort-order`}
                          className="field-input"
                          inputMode="numeric"
                          value={group.sortOrder}
                          onChange={(event) => handleOptionGroupFieldChange(groupIndex, 'sortOrder', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="product-editor-subsection-header">
                      <p className="product-editor-card-title">Значения опции</p>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleAddOptionValue(groupIndex)}
                        disabled={isSaving}
                      >
                        Добавить значение
                      </button>
                    </div>

                    <div className="product-editor-list product-editor-list-compact">
                      {group.values.map((value, valueIndex) => (
                        <div key={`option-group-${groupIndex}-value-${valueIndex}`} className="product-editor-row">
                          <div className="product-editor-inline-grid product-editor-inline-grid-3">
                            <div className="field">
                              <label className="field-label" htmlFor={`${idPrefix}-option-group-${groupIndex}-value-${valueIndex}-code`}>
                                Code
                              </label>
                              <input
                                id={`${idPrefix}-option-group-${groupIndex}-value-${valueIndex}-code`}
                                className="field-input"
                                value={value.code}
                                onChange={(event) =>
                                  handleOptionValueFieldChange(groupIndex, valueIndex, 'code', event.target.value)
                                }
                                disabled={isSaving}
                              />
                            </div>

                            <div className="field">
                              <label
                                className="field-label"
                                htmlFor={`${idPrefix}-option-group-${groupIndex}-value-${valueIndex}-title`}
                              >
                                Название
                              </label>
                              <input
                                id={`${idPrefix}-option-group-${groupIndex}-value-${valueIndex}-title`}
                                className="field-input"
                                value={value.title}
                                onChange={(event) =>
                                  handleOptionValueFieldChange(groupIndex, valueIndex, 'title', event.target.value)
                                }
                                disabled={isSaving}
                              />
                            </div>

                            <div className="field">
                              <label
                                className="field-label"
                                htmlFor={`${idPrefix}-option-group-${groupIndex}-value-${valueIndex}-sort-order`}
                              >
                                Sort order
                              </label>
                              <input
                                id={`${idPrefix}-option-group-${groupIndex}-value-${valueIndex}-sort-order`}
                                className="field-input"
                                inputMode="numeric"
                                value={value.sortOrder}
                                onChange={(event) =>
                                  handleOptionValueFieldChange(groupIndex, valueIndex, 'sortOrder', event.target.value)
                                }
                                disabled={isSaving}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            className="secondary-button secondary-button-danger"
                            onClick={() => handleRemoveOptionValue(groupIndex, valueIndex)}
                            disabled={isSaving}
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="catalog-meta">Группы опций пока не добавлены.</p>
            )}
          </section>

          <section className="product-editor-subsection" aria-label="Варианты товара">
            <div className="product-editor-subsection-header">
              <h5 className="product-editor-subsection-title">Варианты товара</h5>
              <button type="button" className="secondary-button" onClick={handleOpenVariantCreate} disabled={isSaving}>
                Добавить вариант
              </button>
            </div>

            {formValues.variants.length ? (
              <div className="product-variants-table-wrap">
                <table className="product-variants-table">
                  <thead>
                    <tr>
                      <th scope="col">SKU</th>
                      <th scope="col">Цвет</th>
                      <th scope="col">Размер</th>
                      <th scope="col">Цена</th>
                      <th scope="col">Активен</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.variants.map((variant, variantIndex) => (
                      <tr
                        key={`variant-${variantIndex}`}
                        className={
                          variantEditorState?.mode === 'edit' && variantEditorState.variantIndex === variantIndex
                            ? 'product-variants-row-selected'
                            : undefined
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className="product-variant-row-button"
                            onClick={() => handleOpenVariantEdit(variantIndex)}
                            disabled={isSaving}
                          >
                            {variant.sku.trim() || `Вариант #${variantIndex + 1}`}
                          </button>
                        </td>
                        <td>{getVariantOptionLabel(variant, colorOptionGroup)}</td>
                        <td className="product-variants-cell-numeric">{getVariantOptionLabel(variant, sizeOptionGroup)}</td>
                        <td className="product-variants-cell-numeric">{getVariantPriceLabel(variant.price)}</td>
                        <td>{variant.isActive ? 'Да' : 'Нет'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="catalog-meta">Варианты пока не добавлены.</p>
            )}

            {variantEditorState ? (
              <div className="product-variant-editor" aria-label="Редактирование варианта товара">
                <div className="product-editor-card-header">
                  <p className="product-editor-card-title">
                    {variantEditorState.mode === 'create'
                      ? 'Новый вариант'
                      : `Редактирование варианта #${(variantEditorState.variantIndex ?? 0) + 1}`}
                  </p>
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
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={isSaving}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-variant-editor-${variantEditorKey}-image-url`}>
                      Ссылка на изображение
                    </label>
                    <input
                      id={`${idPrefix}-variant-editor-${variantEditorKey}-image-url`}
                      className="field-input"
                      value={variantEditorState.draft.imageUrl}
                      onChange={(event) => handleVariantDraftFieldChange('imageUrl', event.target.value)}
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                            onChange={(event) =>
                              handleVariantDraftOptionValueChange(normalizedGroupCode, event.target.value)
                            }
                            disabled={isSaving || !normalizedGroupCode}
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
                      disabled={isSaving}
                    >
                      Удалить вариант
                    </button>
                  ) : null}
                  <button type="button" className="secondary-button" onClick={handleCloseVariantEditor} disabled={isSaving}>
                    Отменить
                  </button>
                  <button
                    type="button"
                    className="submit-button product-variant-editor-submit"
                    onClick={handleConfirmVariantEditor}
                    disabled={isSaving}
                  >
                    {variantEditorState.mode === 'create' ? 'Добавить вариант' : 'Сохранить вариант'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <p className="catalog-meta">Режим вариантов выключен. Товар сохранится как обычный (simple product).</p>
      )}

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
        <button type="button" className="submit-button" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? savingLabel : submitLabel}
        </button>
      </div>
    </section>
  );
}
