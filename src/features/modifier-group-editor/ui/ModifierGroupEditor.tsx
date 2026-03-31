import type { ModifierGroupEditorOptionValues, ModifierGroupEditorValues } from '@/features/modifier-group-editor/model/modifierGroupEditor';
import {
  createEmptyModifierOption,
  MODIFIER_APPLICATION_SCOPE_OPTIONS,
  MODIFIER_PRICE_TYPE_OPTIONS,
} from '@/features/modifier-group-editor/model/modifierGroupEditor';

type EditableModifierGroupField = Exclude<keyof ModifierGroupEditorValues, 'isRequired' | 'isActive' | 'options'>;
type EditableModifierOptionField = Exclude<keyof ModifierGroupEditorOptionValues, 'isDefault' | 'isActive'>;

type ModifierGroupEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  formValues: ModifierGroupEditorValues;
  isSaving: boolean;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onValuesChange: (updater: (currentValues: ModifierGroupEditorValues) => ModifierGroupEditorValues) => void;
  onSubmit: () => void;
};

export function ModifierGroupEditor({
  idPrefix,
  ariaLabel,
  eyebrow,
  title,
  description,
  formValues,
  isSaving,
  saveError,
  saveSuccess,
  submitLabel,
  savingLabel,
  onValuesChange,
  onSubmit,
}: ModifierGroupEditorProps) {
  const handleFieldChange = (field: EditableModifierGroupField, value: string) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleBooleanFieldChange = (field: 'isRequired' | 'isActive', value: boolean) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleAddOption = () => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      options: [...currentValues.options, createEmptyModifierOption()],
    }));
  };

  const handleOptionFieldChange = (optionIndex: number, field: EditableModifierOptionField, value: string) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      options: currentValues.options.map((option, currentOptionIndex) => {
        if (currentOptionIndex !== optionIndex) {
          return option;
        }

        const nextPriceType = field === 'priceType' ? value : option.priceType;

        return {
          ...option,
          [field]: value,
          price: field === 'priceType' && nextPriceType === 'FREE' ? '' : field === 'price' ? value : option.price,
        };
      }),
    }));
  };

  const handleOptionBooleanFieldChange = (optionIndex: number, field: 'isDefault' | 'isActive', value: boolean) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      options: currentValues.options.map((option, currentOptionIndex) => {
        if (currentOptionIndex !== optionIndex) {
          return option;
        }

        return {
          ...option,
          [field]: value,
        };
      }),
    }));
  };

  const handleRemoveOption = (optionIndex: number) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      options: currentValues.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex),
    }));
  };

  return (
    <section className="product-edit-section" aria-label={ariaLabel}>
      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">{eyebrow}</p>
        <h4 className="catalog-card-title">{title}</h4>
        {description ? <p className="catalog-meta">{description}</p> : null}
      </div>

      <div className="product-editor-inline-grid product-editor-inline-grid-3">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-code`}>
            Code
          </label>
          <input
            id={`${idPrefix}-code`}
            className="field-input"
            value={formValues.code}
            onChange={(event) => handleFieldChange('code', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-name`}>
            Название
          </label>
          <input
            id={`${idPrefix}-name`}
            className="field-input"
            value={formValues.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-sort-order`}>
            Sort order
          </label>
          <input
            id={`${idPrefix}-sort-order`}
            className="field-input"
            inputMode="numeric"
            value={formValues.sortOrder}
            onChange={(event) => handleFieldChange('sortOrder', event.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="product-editor-inline-grid product-editor-inline-grid-3">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-min-selected`}>
            Минимум выбранных
          </label>
          <input
            id={`${idPrefix}-min-selected`}
            className="field-input"
            inputMode="numeric"
            value={formValues.minSelected}
            onChange={(event) => handleFieldChange('minSelected', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-max-selected`}>
            Максимум выбранных
          </label>
          <input
            id={`${idPrefix}-max-selected`}
            className="field-input"
            inputMode="numeric"
            value={formValues.maxSelected}
            onChange={(event) => handleFieldChange('maxSelected', event.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="modifier-editor-check-list">
          <label className="field-checkbox">
            <input
              type="checkbox"
              checked={formValues.isRequired}
              onChange={(event) => handleBooleanFieldChange('isRequired', event.target.checked)}
              disabled={isSaving}
            />
            <span className="field-label">Обязательный выбор</span>
          </label>

          <label className="field-checkbox">
            <input
              type="checkbox"
              checked={formValues.isActive}
              onChange={(event) => handleBooleanFieldChange('isActive', event.target.checked)}
              disabled={isSaving}
            />
            <span className="field-label">Группа активна</span>
          </label>
        </div>
      </div>

      <section className="product-editor-subsection" aria-label="Опции модификаторов">
        <div className="product-editor-subsection-header">
          <div className="catalog-card-copy">
            <h5 className="product-editor-subsection-title">Опции модификатора</h5>
            <p className="catalog-meta">Каждая опция может быть бесплатной или платной и применяться к единице товара либо ко всей позиции.</p>
          </div>
          <button type="button" className="secondary-button" onClick={handleAddOption} disabled={isSaving}>
            Добавить опцию
          </button>
        </div>

        {formValues.options.length ? (
          <div className="product-editor-list">
            {formValues.options.map((option, optionIndex) => (
              <div key={`modifier-option-${optionIndex}`} className="product-editor-row">
                <div className="product-editor-inline-grid product-editor-inline-grid-3">
                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-code`}>
                      Code
                    </label>
                    <input
                      id={`${idPrefix}-option-${optionIndex}-code`}
                      className="field-input"
                      value={option.code}
                      onChange={(event) => handleOptionFieldChange(optionIndex, 'code', event.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-name`}>
                      Название
                    </label>
                    <input
                      id={`${idPrefix}-option-${optionIndex}-name`}
                      className="field-input"
                      value={option.name}
                      onChange={(event) => handleOptionFieldChange(optionIndex, 'name', event.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-sort-order`}>
                      Sort order
                    </label>
                    <input
                      id={`${idPrefix}-option-${optionIndex}-sort-order`}
                      className="field-input"
                      inputMode="numeric"
                      value={option.sortOrder}
                      onChange={(event) => handleOptionFieldChange(optionIndex, 'sortOrder', event.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-description`}>
                    Описание
                  </label>
                  <textarea
                    id={`${idPrefix}-option-${optionIndex}-description`}
                    className="field-input field-textarea modifier-editor-option-description"
                    value={option.description}
                    onChange={(event) => handleOptionFieldChange(optionIndex, 'description', event.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="product-editor-inline-grid product-editor-inline-grid-3">
                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-price-type`}>
                      Тип цены
                    </label>
                    <select
                      id={`${idPrefix}-option-${optionIndex}-price-type`}
                      className="field-input"
                      value={option.priceType}
                      onChange={(event) => handleOptionFieldChange(optionIndex, 'priceType', event.target.value)}
                      disabled={isSaving}
                    >
                      {MODIFIER_PRICE_TYPE_OPTIONS.map((priceTypeOption) => (
                        <option key={priceTypeOption.value} value={priceTypeOption.value}>
                          {priceTypeOption.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-price`}>
                      Доплата, ₽
                    </label>
                    <input
                      id={`${idPrefix}-option-${optionIndex}-price`}
                      className="field-input"
                      inputMode="decimal"
                      value={option.price}
                      onChange={(event) => handleOptionFieldChange(optionIndex, 'price', event.target.value)}
                      disabled={isSaving || option.priceType === 'FREE'}
                      placeholder={option.priceType === 'FREE' ? 'Бесплатно' : '0'}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor={`${idPrefix}-option-${optionIndex}-application-scope`}>
                      Область применения
                    </label>
                    <select
                      id={`${idPrefix}-option-${optionIndex}-application-scope`}
                      className="field-input"
                      value={option.applicationScope}
                      onChange={(event) => handleOptionFieldChange(optionIndex, 'applicationScope', event.target.value)}
                      disabled={isSaving}
                    >
                      {MODIFIER_APPLICATION_SCOPE_OPTIONS.map((applicationScopeOption) => (
                        <option key={applicationScopeOption.value} value={applicationScopeOption.value}>
                          {applicationScopeOption.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modifier-editor-option-footer">
                  <div className="modifier-editor-check-list">
                    <label className="field-checkbox">
                      <input
                        type="checkbox"
                        checked={option.isDefault}
                        onChange={(event) => handleOptionBooleanFieldChange(optionIndex, 'isDefault', event.target.checked)}
                        disabled={isSaving}
                      />
                      <span className="field-label">Выбрана по умолчанию</span>
                    </label>

                    <label className="field-checkbox">
                      <input
                        type="checkbox"
                        checked={option.isActive}
                        onChange={(event) => handleOptionBooleanFieldChange(optionIndex, 'isActive', event.target.checked)}
                        disabled={isSaving}
                      />
                      <span className="field-label">Опция активна</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="secondary-button secondary-button-danger"
                    onClick={() => handleRemoveOption(optionIndex)}
                    disabled={isSaving}
                  >
                    Удалить опцию
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="catalog-meta">Опции модификаторов пока не добавлены.</p>
        )}
      </section>

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
