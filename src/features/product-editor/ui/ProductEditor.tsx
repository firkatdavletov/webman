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
        variants: [createEmptyProductVariant(initialOptionGroups)],
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

  const handleAddVariant = () => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      variants: [...currentValues.variants, createEmptyProductVariant(currentValues.optionGroups)],
    }));
  };

  const handleRemoveVariant = (variantIndex: number) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.filter((_, index) => index !== variantIndex),
    }));
  };

  const handleVariantFieldChange = (
    variantIndex: number,
    field: Exclude<keyof ProductEditorValues['variants'][number], 'isActive' | 'options'>,
    value: string,
  ) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant, index) => {
        if (index !== variantIndex) {
          return variant;
        }

        return {
          ...variant,
          [field]: value,
        };
      }),
    }));
  };

  const handleVariantIsActiveChange = (variantIndex: number, value: boolean) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant, index) => {
        if (index !== variantIndex) {
          return variant;
        }

        return {
          ...variant,
          isActive: value,
        };
      }),
    }));
  };

  const handleVariantOptionValueChange = (variantIndex: number, optionGroupCode: string, optionValueCode: string) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant, index) => {
        if (index !== variantIndex) {
          return variant;
        }

        const syncedVariant = syncVariantOptionsByOptionGroups(currentValues.optionGroups, variant);

        return {
          ...syncedVariant,
          options: syncedVariant.options.map((option) => {
            if (option.optionGroupCode !== optionGroupCode) {
              return option;
            }

            return {
              ...option,
              optionValueCode,
            };
          }),
        };
      }),
    }));
  };

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
              <button type="button" className="secondary-button" onClick={handleAddVariant} disabled={isSaving}>
                Добавить вариант
              </button>
            </div>

            {formValues.variants.length ? (
              <div className="product-editor-list">
                {formValues.variants.map((variant, variantIndex) => (
                  <article key={`variant-${variantIndex}`} className="product-editor-card">
                    <div className="product-editor-card-header">
                      <p className="product-editor-card-title">
                        Вариант #{variantIndex + 1}
                        {variant.sku ? ` (${variant.sku})` : ''}
                      </p>
                      <button
                        type="button"
                        className="secondary-button secondary-button-danger"
                        onClick={() => handleRemoveVariant(variantIndex)}
                        disabled={isSaving}
                      >
                        Удалить вариант
                      </button>
                    </div>

                    <div className="product-editor-inline-grid">
                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-external-id`}>
                          External ID
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-external-id`}
                          className="field-input"
                          value={variant.externalId}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'externalId', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-sku`}>
                          SKU
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-sku`}
                          className="field-input"
                          value={variant.sku}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'sku', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-title`}>
                          Название
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-title`}
                          className="field-input"
                          value={variant.title}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'title', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-price`}>
                          Цена, руб.
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-price`}
                          className="field-input"
                          inputMode="decimal"
                          value={variant.price}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'price', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-old-price`}>
                          Старая цена, руб.
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-old-price`}
                          className="field-input"
                          inputMode="decimal"
                          value={variant.oldPrice}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'oldPrice', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-image-url`}>
                          Ссылка на изображение
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-image-url`}
                          className="field-input"
                          value={variant.imageUrl}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'imageUrl', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-sort-order`}>
                          Sort order
                        </label>
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-sort-order`}
                          className="field-input"
                          inputMode="numeric"
                          value={variant.sortOrder}
                          onChange={(event) => handleVariantFieldChange(variantIndex, 'sortOrder', event.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label className="field-checkbox">
                        <input
                          id={`${idPrefix}-variant-${variantIndex}-active`}
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={(event) => handleVariantIsActiveChange(variantIndex, event.target.checked)}
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
                            variant.options.find((option) => option.optionGroupCode === normalizedGroupCode) ?? null;

                          return (
                            <div key={`variant-${variantIndex}-option-${groupIndex}`} className="field">
                              <label className="field-label" htmlFor={`${idPrefix}-variant-${variantIndex}-option-${groupIndex}`}>
                                {group.title.trim() || `Группа #${groupIndex + 1}`}
                              </label>
                              <select
                                id={`${idPrefix}-variant-${variantIndex}-option-${groupIndex}`}
                                className="field-input"
                                value={selectedOption?.optionValueCode ?? ''}
                                onChange={(event) =>
                                  handleVariantOptionValueChange(variantIndex, normalizedGroupCode, event.target.value)
                                }
                                disabled={isSaving || !normalizedGroupCode}
                              >
                                <option value="">Выберите значение</option>
                                {group.values.map((value, valueIndex) => {
                                  const normalizedValueCode = value.code.trim();

                                  return (
                                    <option
                                      key={`variant-${variantIndex}-option-${groupIndex}-value-${valueIndex}`}
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
                  </article>
                ))}
              </div>
            ) : (
              <p className="catalog-meta">Варианты пока не добавлены.</p>
            )}
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
