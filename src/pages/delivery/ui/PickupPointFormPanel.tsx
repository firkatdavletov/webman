import { getPickupPointCoordinateSummary, type PickupPointEditorValues } from '@/features/pickup-point-map-editor';

export type PickupPointFormField = Exclude<keyof PickupPointEditorValues, 'isActive'>;

type PickupPointFormPanelProps = {
  form: PickupPointEditorValues;
  isSaving: boolean;
  hasPendingDelete: boolean;
  isDetectingAddress: boolean;
  detectError?: string;
  detectSuccess?: string;
  saveError?: string;
  saveSuccess?: string;
  onFieldChange: (field: PickupPointFormField, value: string) => void;
  onIsActiveChange: (value: boolean) => void;
  onOpenMap: () => void;
  onDetectAddress: () => void;
  onSubmit: () => void;
  onReset: () => void;
};

export function PickupPointFormPanel({
  form,
  isSaving,
  hasPendingDelete,
  isDetectingAddress,
  detectError = '',
  detectSuccess = '',
  saveError = '',
  saveSuccess = '',
  onFieldChange,
  onIsActiveChange,
  onOpenMap,
  onDetectAddress,
  onSubmit,
  onReset,
}: PickupPointFormPanelProps) {
  const isActionDisabled = isSaving || hasPendingDelete || isDetectingAddress;

  return (
    <div className="delivery-form-panel">
      <div className="catalog-card-copy">
        <h4 className="delivery-subtitle">{form.id ? 'Редактирование пункта' : 'Новый пункт'}</h4>
        <p className="catalog-meta">
          Базовые поля: код, название и адрес. Координаты можно оставить пустыми, если они не участвуют в логике расчета.
        </p>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor="pickup-point-code">
            Код
          </label>
          <input
            id="pickup-point-code"
            className="field-input"
            value={form.code}
            disabled={isSaving}
            onChange={(event) => onFieldChange('code', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-name">
            Название
          </label>
          <input
            id="pickup-point-name"
            className="field-input"
            value={form.name}
            disabled={isSaving}
            onChange={(event) => onFieldChange('name', event.target.value)}
          />
        </div>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor="pickup-point-country">
            Страна
          </label>
          <input
            id="pickup-point-country"
            className="field-input"
            value={form.country}
            disabled={isSaving}
            onChange={(event) => onFieldChange('country', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-region">
            Регион
          </label>
          <input
            id="pickup-point-region"
            className="field-input"
            value={form.region}
            disabled={isSaving}
            onChange={(event) => onFieldChange('region', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-city">
            Город
          </label>
          <input
            id="pickup-point-city"
            className="field-input"
            value={form.city}
            disabled={isSaving}
            onChange={(event) => onFieldChange('city', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-postal-code">
            Индекс
          </label>
          <input
            id="pickup-point-postal-code"
            className="field-input"
            value={form.postalCode}
            disabled={isSaving}
            onChange={(event) => onFieldChange('postalCode', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-street">
            Улица
          </label>
          <input
            id="pickup-point-street"
            className="field-input"
            value={form.street}
            disabled={isSaving}
            onChange={(event) => onFieldChange('street', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-house">
            Дом
          </label>
          <input
            id="pickup-point-house"
            className="field-input"
            value={form.house}
            disabled={isSaving}
            onChange={(event) => onFieldChange('house', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-apartment">
            Квартира / офис
          </label>
          <input
            id="pickup-point-apartment"
            className="field-input"
            value={form.apartment}
            disabled={isSaving}
            onChange={(event) => onFieldChange('apartment', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-entrance">
            Подъезд
          </label>
          <input
            id="pickup-point-entrance"
            className="field-input"
            value={form.entrance}
            disabled={isSaving}
            onChange={(event) => onFieldChange('entrance', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-floor">
            Этаж
          </label>
          <input
            id="pickup-point-floor"
            className="field-input"
            value={form.floor}
            disabled={isSaving}
            onChange={(event) => onFieldChange('floor', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-intercom">
            Домофон
          </label>
          <input
            id="pickup-point-intercom"
            className="field-input"
            value={form.intercom}
            disabled={isSaving}
            onChange={(event) => onFieldChange('intercom', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-latitude">
            Широта
          </label>
          <input
            id="pickup-point-latitude"
            className="field-input"
            value={form.latitude}
            disabled={isSaving}
            onChange={(event) => onFieldChange('latitude', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pickup-point-longitude">
            Долгота
          </label>
          <input
            id="pickup-point-longitude"
            className="field-input"
            value={form.longitude}
            disabled={isSaving}
            onChange={(event) => onFieldChange('longitude', event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pickup-point-comment">
          Комментарий
        </label>
        <textarea
          id="pickup-point-comment"
          className="field-input field-textarea"
          value={form.comment}
          disabled={isSaving}
          onChange={(event) => onFieldChange('comment', event.target.value)}
        />
      </div>

      <div className="delivery-zone-geometry-card">
        <div className="delivery-zone-header-row">
          <div className="catalog-card-copy">
            <h4 className="delivery-subtitle">Точка на карте</h4>
            <p className="catalog-meta">{getPickupPointCoordinateSummary(form)}</p>
          </div>

          <div className="delivery-table-link-group">
            <button type="button" className="secondary-button" onClick={onOpenMap} disabled={isActionDisabled}>
              Выбрать на карте
            </button>

            <button type="button" className="secondary-button" onClick={onDetectAddress} disabled={isActionDisabled}>
              {isDetectingAddress ? 'Определение адреса...' : 'Определить адрес'}
            </button>
          </div>
        </div>

        <p className="catalog-meta">
          Откройте карту, чтобы поставить точку пункта самовывоза кликом или перетащить существующий маркер.
        </p>

        {detectError ? (
          <p className="form-error" role="alert">
            {detectError}
          </p>
        ) : null}

        {detectSuccess ? (
          <p className="form-success" role="status">
            {detectSuccess}
          </p>
        ) : null}
      </div>

      <label className="field-checkbox">
        <input
          type="checkbox"
          checked={form.isActive}
          disabled={isActionDisabled}
          onChange={(event) => onIsActiveChange(event.target.checked)}
        />
        <span className="field-label">Показывать пункт самовывоза клиентам</span>
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
        <button type="button" className="submit-button" onClick={onSubmit} disabled={isActionDisabled}>
          {isSaving ? 'Сохранение...' : form.id ? 'Сохранить пункт' : 'Создать пункт'}
        </button>

        <button type="button" className="secondary-button" onClick={onReset} disabled={isActionDisabled}>
          Сбросить
        </button>
      </div>
    </div>
  );
}
