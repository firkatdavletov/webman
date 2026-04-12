import type { DeliveryMethod } from '@/entities/delivery';

export type TariffFormValues = {
  id: string;
  method: DeliveryMethod;
  zoneId: string;
  isAvailable: boolean;
  fixedPriceMinor: string;
  freeFromAmountMinor: string;
  currency: string;
  estimatedDays: string;
  deliveryMinutes: string;
};

export type TariffFormField = Exclude<keyof TariffFormValues, 'isAvailable' | 'method'>;

type DeliveryTariffFormPanelProps = {
  form: TariffFormValues;
  methodOptions: Array<{
    value: DeliveryMethod;
    label: string;
  }>;
  zoneOptions: Array<{
    id: string;
    label: string;
  }>;
  isSaving: boolean;
  hasPendingDelete: boolean;
  saveError?: string;
  saveSuccess?: string;
  onMethodChange: (method: DeliveryMethod) => void;
  onFieldChange: (field: TariffFormField, value: string) => void;
  onIsAvailableChange: (value: boolean) => void;
  onSubmit: () => void;
  onReset: () => void;
};

export function DeliveryTariffFormPanel({
  form,
  methodOptions,
  zoneOptions,
  isSaving,
  hasPendingDelete,
  saveError = '',
  saveSuccess = '',
  onMethodChange,
  onFieldChange,
  onIsAvailableChange,
  onSubmit,
  onReset,
}: DeliveryTariffFormPanelProps) {
  const isActionDisabled = isSaving || hasPendingDelete;

  return (
    <div className="delivery-form-panel">
      <div className="catalog-card-copy">
        <h4 className="delivery-subtitle">{form.id ? 'Редактирование тарифа' : 'Новый тариф'}</h4>
        <p className="catalog-meta">Привяжите тариф к способу доставки и зоне. Цена и порог бесплатной доставки хранятся в minor units.</p>
      </div>

      <div className="product-edit-grid">
        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-method">
            Способ доставки
          </label>
          <select
            id="delivery-tariff-method"
            className="field-input"
            value={form.method}
            disabled={isSaving}
            onChange={(event) => onMethodChange(event.target.value as DeliveryMethod)}
          >
            {methodOptions.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-zone">
            Зона
          </label>
          <select
            id="delivery-tariff-zone"
            className="field-input"
            value={form.zoneId}
            disabled={isSaving}
            onChange={(event) => onFieldChange('zoneId', event.target.value)}
          >
            <option value="">Без зоны</option>
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-fixed-price">
            Цена, minor units
          </label>
          <input
            id="delivery-tariff-fixed-price"
            type="number"
            className="field-input"
            value={form.fixedPriceMinor}
            disabled={isSaving}
            onChange={(event) => onFieldChange('fixedPriceMinor', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-free-from">
            Бесплатно от, minor units
          </label>
          <input
            id="delivery-tariff-free-from"
            type="number"
            className="field-input"
            value={form.freeFromAmountMinor}
            disabled={isSaving}
            onChange={(event) => onFieldChange('freeFromAmountMinor', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-currency">
            Валюта
          </label>
          <input
            id="delivery-tariff-currency"
            className="field-input"
            value={form.currency}
            disabled={isSaving}
            onChange={(event) => onFieldChange('currency', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-estimated-days">
            Срок доставки, дней
          </label>
          <input
            id="delivery-tariff-estimated-days"
            type="number"
            className="field-input"
            value={form.estimatedDays}
            disabled={isSaving}
            onChange={(event) => onFieldChange('estimatedDays', event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="delivery-tariff-delivery-minutes">
            Срок доставки, минут
          </label>
          <input
            id="delivery-tariff-delivery-minutes"
            type="number"
            className="field-input"
            value={form.deliveryMinutes}
            disabled={isSaving}
            onChange={(event) => onFieldChange('deliveryMinutes', event.target.value)}
          />
        </div>
      </div>

      <label className="field-checkbox">
        <input
          type="checkbox"
          checked={form.isAvailable}
          disabled={isSaving}
          onChange={(event) => onIsAvailableChange(event.target.checked)}
        />
        <span className="field-label">Тариф доступен для расчета</span>
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
          {isSaving ? 'Сохранение...' : form.id ? 'Сохранить тариф' : 'Создать тариф'}
        </button>

        <button type="button" className="secondary-button" onClick={onReset} disabled={isActionDisabled}>
          Сбросить
        </button>
      </div>
    </div>
  );
}
