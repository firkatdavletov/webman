import type { CatalogProduct } from '../catalog/catalogService';

export type ProductEditorValues = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  unit: string;
  displayWeight: string;
  countStep: string;
  sku: string;
};

type ProductEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  categoryOptions: Array<[number, string]>;
  formValues: ProductEditorValues;
  isSaving: boolean;
  disableCategorySelect?: boolean;
  emptyCategoryLabel?: string;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onFieldChange: (field: keyof ProductEditorValues, value: string) => void;
  onSubmit: () => void;
};

export const PRODUCT_UNIT_OPTIONS = [
  { value: 'PIECE', label: 'шт' },
  { value: 'KILOGRAM', label: 'кг' },
  { value: 'GRAM', label: 'г' },
  { value: 'LITER', label: 'л' },
  { value: 'MILLILITER', label: 'мл' },
] as const;

export const EMPTY_PRODUCT_EDITOR_VALUES: ProductEditorValues = {
  categoryId: '',
  title: '',
  description: '',
  price: '',
  imageUrl: '',
  unit: 'PIECE',
  displayWeight: '',
  countStep: '1',
  sku: '',
};

function formatEditablePrice(price: number): string {
  const rawValue = (price / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function buildProductEditorValues(product: CatalogProduct): ProductEditorValues {
  return {
    categoryId: String(product.categoryId),
    title: product.title,
    description: product.description ?? '',
    price: formatEditablePrice(product.price),
    imageUrl: product.imageUrl ?? '',
    unit: product.unit,
    displayWeight: product.displayWeight ?? '',
    countStep: String(product.countStep),
    sku: product.sku ?? '',
  };
}

export function parseProductPrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');
  const numericValue = Number(normalizedValue);

  if (!normalizedValue || Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
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
  onFieldChange,
  onSubmit,
}: ProductEditorProps) {
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
            onChange={(event) => onFieldChange('title', event.target.value)}
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
            onChange={(event) => onFieldChange('categoryId', event.target.value)}
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
            onChange={(event) => onFieldChange('price', event.target.value)}
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
            onChange={(event) => onFieldChange('unit', event.target.value)}
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
            onChange={(event) => onFieldChange('countStep', event.target.value)}
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
            onChange={(event) => onFieldChange('displayWeight', event.target.value)}
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
            onChange={(event) => onFieldChange('sku', event.target.value)}
            disabled={isSaving}
          />
        </div>

      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-description`}>
          Описание
        </label>
        <textarea
          id={`${idPrefix}-description`}
          className="field-input field-textarea"
          value={formValues.description}
          onChange={(event) => onFieldChange('description', event.target.value)}
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
