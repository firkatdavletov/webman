import type { CategoryEditorValues } from '@/features/category-editor/model/categoryEditor';

type CategoryEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  formValues: CategoryEditorValues;
  isSaving: boolean;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onFieldChange: (field: Exclude<keyof CategoryEditorValues, 'isActive'>, value: string) => void;
  onIsActiveChange: (value: boolean) => void;
  onSubmit: () => void;
};

export function CategoryEditor({
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
  onFieldChange,
  onIsActiveChange,
  onSubmit,
}: CategoryEditorProps) {
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
      </div>

      <div className="field">
        <label className="field-checkbox">
          <input
            id={`${idPrefix}-active`}
            type="checkbox"
            checked={formValues.isActive}
            onChange={(event) => onIsActiveChange(event.target.checked)}
            disabled={isSaving}
          />
          <span className="field-label">Отображать на витрине</span>
        </label>
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
