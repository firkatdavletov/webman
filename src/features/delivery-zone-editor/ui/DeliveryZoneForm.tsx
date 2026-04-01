import { Link } from 'react-router-dom';
import { getDeliveryZoneGeometrySummary, getDeliveryZoneGeometryValidationError } from '@/features/delivery-zone-editor/model/geometryMappers';
import {
  DELIVERY_ZONE_TYPE_OPTIONS,
  type DeliveryZoneEditorValues,
  getDeliveryZoneTypeLabel,
} from '@/features/delivery-zone-editor/model/types';

type DeliveryZoneFormProps = {
  idPrefix: string;
  eyebrow: string;
  title: string;
  description: string;
  values: DeliveryZoneEditorValues;
  isSaving: boolean;
  isDirty: boolean;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  mapEditorPath?: string;
  onValuesChange: (updater: (currentValues: DeliveryZoneEditorValues) => DeliveryZoneEditorValues) => void;
  onSubmit: () => void;
  onReset: () => void;
};

export function DeliveryZoneForm({
  idPrefix,
  eyebrow,
  title,
  description,
  values,
  isSaving,
  isDirty,
  saveError,
  saveSuccess,
  submitLabel,
  savingLabel,
  mapEditorPath,
  onValuesChange,
  onSubmit,
  onReset,
}: DeliveryZoneFormProps) {
  const geometryValidationError = values.type === 'POLYGON' ? getDeliveryZoneGeometryValidationError(values.geometry) : null;

  const handleFieldChange = (field: keyof Omit<DeliveryZoneEditorValues, 'isActive' | 'geometry'>, value: string) => {
    onValuesChange((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  return (
    <section className="catalog-card product-detail-card delivery-zone-form-card" aria-label={title}>
      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">{eyebrow}</p>
        <div className="delivery-zone-header-row">
          <div>
            <h3 className="product-detail-title">{title}</h3>
            <p className="catalog-card-text">{description}</p>
          </div>

          <span className={`delivery-status-pill${isDirty ? ' delivery-status-pill-live' : ''}`}>
            {isDirty ? 'Есть несохраненные изменения' : 'Изменений нет'}
          </span>
        </div>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-code`}>
            Код
          </label>
          <input
            id={`${idPrefix}-code`}
            className="field-input"
            value={values.code}
            disabled={isSaving}
            onChange={(event) => handleFieldChange('code', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-name`}>
            Название
          </label>
          <input
            id={`${idPrefix}-name`}
            className="field-input"
            value={values.name}
            disabled={isSaving}
            onChange={(event) => handleFieldChange('name', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-type`}>
            Тип зоны
          </label>
          <select
            id={`${idPrefix}-type`}
            className="field-input"
            value={values.type}
            disabled={isSaving}
            onChange={(event) => handleFieldChange('type', event.target.value)}
          >
            {DELIVERY_ZONE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="catalog-meta">
            {DELIVERY_ZONE_TYPE_OPTIONS.find((option) => option.value === values.type)?.description ?? getDeliveryZoneTypeLabel(values.type)}
          </p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-priority`}>
            Приоритет
          </label>
          <input
            id={`${idPrefix}-priority`}
            type="number"
            className="field-input"
            value={values.priority}
            disabled={isSaving}
            onChange={(event) => handleFieldChange('priority', event.target.value)}
          />
          <p className="catalog-meta">Меньший приоритет можно использовать для более точного матчирования зон на backend.</p>
        </div>
      </div>

      {values.type === 'CITY' ? (
        <div className="product-edit-grid">
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-city`}>
              Город
            </label>
            <input
              id={`${idPrefix}-city`}
              className="field-input"
              value={values.city}
              disabled={isSaving}
              onChange={(event) => handleFieldChange('city', event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {values.type === 'POSTAL_CODE' ? (
        <div className="product-edit-grid">
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-postal-code`}>
              Почтовый индекс
            </label>
            <input
              id={`${idPrefix}-postal-code`}
              className="field-input"
              value={values.postalCode}
              disabled={isSaving}
              onChange={(event) => handleFieldChange('postalCode', event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {values.type === 'POLYGON' ? (
        <div className="delivery-zone-geometry-card">
          <div className="delivery-zone-header-row">
            <div className="catalog-card-copy">
              <h4 className="delivery-subtitle">Геометрия зоны</h4>
              <p className="catalog-meta">{getDeliveryZoneGeometrySummary(values.geometry)}</p>
            </div>

            {mapEditorPath ? (
              <Link className="secondary-link" to={mapEditorPath}>
                Открыть редактор зоны на карте
              </Link>
            ) : null}
          </div>

          {values.geometry?.polygons.length ? (
            <div className="delivery-zone-preview-list">
              {values.geometry.polygons.map((polygon, polygonIndex) => (
                <article key={`polygon-${polygonIndex}`} className="delivery-zone-preview-item">
                  <h5 className="delivery-zone-preview-title">Контур {polygonIndex + 1}</h5>
                  <p className="catalog-meta">
                    {polygon.outer.length} вершин{polygon.holes.length ? ` • ${polygon.holes.length} внутренних колец` : ''}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="catalog-empty-state delivery-zone-empty-note">
              Геометрия пока не задана. Откройте карту, чтобы нарисовать контур зоны.
            </p>
          )}

          {geometryValidationError ? (
            <p className="form-error" role="alert">
              {geometryValidationError}
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="field-checkbox">
        <input
          type="checkbox"
          checked={values.isActive}
          disabled={isSaving}
          onChange={(event) =>
            onValuesChange((currentValues) => ({
              ...currentValues,
              isActive: event.target.checked,
            }))
          }
        />
        <span className="field-label">Использовать зону в расчете доставки</span>
      </label>

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

      <div className="delivery-form-actions">
        <button type="button" className="submit-button" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? savingLabel : submitLabel}
        </button>

        <button type="button" className="secondary-button" onClick={onReset} disabled={isSaving}>
          Сбросить к последнему сохранению
        </button>
      </div>
    </section>
  );
}
