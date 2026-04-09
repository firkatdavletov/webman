import type { BannerStatus, BannerTextAlignment, BannerThemeVariant } from '@/entities/hero-banner';
import type {
  HeroBannerEditorValues,
  HeroBannerTranslationValues,
} from '@/features/hero-banner-editor/model/heroBannerEditor';

type HeroBannerEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  formValues: HeroBannerEditorValues;
  isSaving: boolean;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onFieldChange: (field: string, value: string) => void;
  onTranslationChange: (index: number, field: keyof HeroBannerTranslationValues, value: string) => void;
  onAddTranslation: () => void;
  onRemoveTranslation: (index: number) => void;
  onSubmit: () => void;
};

const STATUS_OPTIONS: { value: BannerStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'PUBLISHED', label: 'Опубликован' },
  { value: 'ARCHIVED', label: 'В архиве' },
];

const THEME_OPTIONS: { value: BannerThemeVariant; label: string }[] = [
  { value: 'LIGHT', label: 'Светлая' },
  { value: 'DARK', label: 'Тёмная' },
  { value: 'ACCENT', label: 'Акцент' },
];

const ALIGNMENT_OPTIONS: { value: BannerTextAlignment; label: string }[] = [
  { value: 'LEFT', label: 'Слева' },
  { value: 'CENTER', label: 'По центру' },
  { value: 'RIGHT', label: 'Справа' },
];

export function HeroBannerEditor({
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
  onTranslationChange,
  onAddTranslation,
  onRemoveTranslation,
  onSubmit,
}: HeroBannerEditorProps) {
  return (
    <section className="product-edit-section" aria-label={ariaLabel}>
      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">{eyebrow}</p>
        <h4 className="catalog-card-title">{title}</h4>
        {description ? <p className="catalog-meta">{description}</p> : null}
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-code`}>
            Код баннера
          </label>
          <input
            id={`${idPrefix}-code`}
            className="field-input"
            value={formValues.code}
            onChange={(e) => onFieldChange('code', e.target.value)}
            disabled={isSaving}
            placeholder="home-promo-spring"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-storefront`}>
            Код витрины
          </label>
          <input
            id={`${idPrefix}-storefront`}
            className="field-input"
            value={formValues.storefrontCode}
            onChange={(e) => onFieldChange('storefrontCode', e.target.value)}
            disabled={isSaving}
            placeholder="default"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-status`}>
            Статус
          </label>
          <select
            id={`${idPrefix}-status`}
            className="field-input"
            value={formValues.status}
            onChange={(e) => onFieldChange('status', e.target.value)}
            disabled={isSaving}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-sort-order`}>
            Порядок сортировки
          </label>
          <input
            id={`${idPrefix}-sort-order`}
            className="field-input"
            type="number"
            value={formValues.sortOrder}
            onChange={(e) => onFieldChange('sortOrder', e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Изображения</p>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-desktop-image`}>
            URL десктоп-изображения
          </label>
          <input
            id={`${idPrefix}-desktop-image`}
            className="field-input"
            value={formValues.desktopImageUrl}
            onChange={(e) => onFieldChange('desktopImageUrl', e.target.value)}
            disabled={isSaving}
            placeholder="https://..."
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-mobile-image`}>
            URL мобильного изображения
          </label>
          <input
            id={`${idPrefix}-mobile-image`}
            className="field-input"
            value={formValues.mobileImageUrl}
            onChange={(e) => onFieldChange('mobileImageUrl', e.target.value)}
            disabled={isSaving}
            placeholder="https://..."
          />
        </div>
      </div>

      {formValues.desktopImageUrl ? (
        <div className="product-detail-media" style={{ marginBottom: '1rem' }}>
          <img
            className="product-detail-image"
            src={formValues.desktopImageUrl}
            alt="Превью десктоп-баннера"
            style={{ maxHeight: '200px', objectFit: 'contain' }}
          />
        </div>
      ) : null}

      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Ссылки</p>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-primary-action`}>
            URL основного действия
          </label>
          <input
            id={`${idPrefix}-primary-action`}
            className="field-input"
            value={formValues.primaryActionUrl}
            onChange={(e) => onFieldChange('primaryActionUrl', e.target.value)}
            disabled={isSaving}
            placeholder="/catalog/sale"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-secondary-action`}>
            URL дополнительного действия
          </label>
          <input
            id={`${idPrefix}-secondary-action`}
            className="field-input"
            value={formValues.secondaryActionUrl}
            onChange={(e) => onFieldChange('secondaryActionUrl', e.target.value)}
            disabled={isSaving}
            placeholder="/about"
          />
        </div>
      </div>

      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Оформление</p>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-theme`}>
            Тема
          </label>
          <select
            id={`${idPrefix}-theme`}
            className="field-input"
            value={formValues.themeVariant}
            onChange={(e) => onFieldChange('themeVariant', e.target.value)}
            disabled={isSaving}
          >
            {THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-alignment`}>
            Выравнивание текста
          </label>
          <select
            id={`${idPrefix}-alignment`}
            className="field-input"
            value={formValues.textAlignment}
            onChange={(e) => onFieldChange('textAlignment', e.target.value)}
            disabled={isSaving}
          >
            {ALIGNMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Расписание</p>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-starts-at`}>
            Начало показа
          </label>
          <input
            id={`${idPrefix}-starts-at`}
            className="field-input"
            type="datetime-local"
            value={formValues.startsAt}
            onChange={(e) => onFieldChange('startsAt', e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-ends-at`}>
            Конец показа
          </label>
          <input
            id={`${idPrefix}-ends-at`}
            className="field-input"
            type="datetime-local"
            value={formValues.endsAt}
            onChange={(e) => onFieldChange('endsAt', e.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Переводы</p>
      </div>

      {formValues.translations.map((translation, index) => (
        <div key={index} className="product-edit-section" style={{ border: '1px solid var(--border, #e0e0e0)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <div className="product-edit-grid">
            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-locale`}>
                Локаль
              </label>
              <input
                id={`${idPrefix}-t${index}-locale`}
                className="field-input"
                value={translation.locale}
                onChange={(e) => onTranslationChange(index, 'locale', e.target.value)}
                disabled={isSaving}
                placeholder="ru"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-title`}>
                Заголовок
              </label>
              <input
                id={`${idPrefix}-t${index}-title`}
                className="field-input"
                value={translation.title}
                onChange={(e) => onTranslationChange(index, 'title', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-subtitle`}>
                Подзаголовок
              </label>
              <input
                id={`${idPrefix}-t${index}-subtitle`}
                className="field-input"
                value={translation.subtitle}
                onChange={(e) => onTranslationChange(index, 'subtitle', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-description`}>
                Описание
              </label>
              <textarea
                id={`${idPrefix}-t${index}-description`}
                className="field-input"
                value={translation.description}
                onChange={(e) => onTranslationChange(index, 'description', e.target.value)}
                disabled={isSaving}
                rows={2}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-desktop-alt`}>
                Alt десктоп-изображения
              </label>
              <input
                id={`${idPrefix}-t${index}-desktop-alt`}
                className="field-input"
                value={translation.desktopImageAlt}
                onChange={(e) => onTranslationChange(index, 'desktopImageAlt', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-mobile-alt`}>
                Alt мобильного изображения
              </label>
              <input
                id={`${idPrefix}-t${index}-mobile-alt`}
                className="field-input"
                value={translation.mobileImageAlt}
                onChange={(e) => onTranslationChange(index, 'mobileImageAlt', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-primary-label`}>
                Текст основной кнопки
              </label>
              <input
                id={`${idPrefix}-t${index}-primary-label`}
                className="field-input"
                value={translation.primaryActionLabel}
                onChange={(e) => onTranslationChange(index, 'primaryActionLabel', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-t${index}-secondary-label`}>
                Текст дополнительной кнопки
              </label>
              <input
                id={`${idPrefix}-t${index}-secondary-label`}
                className="field-input"
                value={translation.secondaryActionLabel}
                onChange={(e) => onTranslationChange(index, 'secondaryActionLabel', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          {formValues.translations.length > 1 ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onRemoveTranslation(index)}
              disabled={isSaving}
              style={{ marginTop: '0.5rem' }}
            >
              Удалить перевод
            </button>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        className="secondary-button"
        onClick={onAddTranslation}
        disabled={isSaving}
        style={{ marginBottom: '1rem' }}
      >
        Добавить перевод
      </button>

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
