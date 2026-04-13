import type { DeliveryMethod } from '@/entities/delivery';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField } from '@/shared/ui';
import { checkboxInputClassName, DeliveryNativeSelect, nativeFieldClassName } from '@/pages/delivery/ui/deliveryShared';
import type { DeliveryTariffFormValues } from '@/pages/delivery/model/deliveryAdmin';

export type TariffFormValues = DeliveryTariffFormValues;
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
    <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 py-0 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
      <CardHeader className="gap-2 border-b border-border/70 py-6">
        <CardTitle className="text-xl font-semibold tracking-tight">{form.id ? 'Редактирование тарифа' : 'Новый тариф'}</CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-6">
          Привяжите тариф к способу доставки и зоне. Цена и порог бесплатной доставки хранятся в minor units.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="delivery-tariff-method" label="Способ доставки">
            <DeliveryNativeSelect
              id="delivery-tariff-method"
              value={form.method}
              disabled={isSaving}
              onChange={(event) => onMethodChange(event.target.value as DeliveryMethod)}
            >
              {methodOptions.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </DeliveryNativeSelect>
          </FormField>

          <FormField htmlFor="delivery-tariff-zone" label="Зона">
            <DeliveryNativeSelect
              id="delivery-tariff-zone"
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
            </DeliveryNativeSelect>
          </FormField>

          <FormField htmlFor="delivery-tariff-fixed-price" label="Цена, minor units">
            <input
              id="delivery-tariff-fixed-price"
              type="number"
              className={nativeFieldClassName}
              value={form.fixedPriceMinor}
              disabled={isSaving}
              onChange={(event) => onFieldChange('fixedPriceMinor', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="delivery-tariff-free-from" label="Бесплатно от, minor units">
            <input
              id="delivery-tariff-free-from"
              type="number"
              className={nativeFieldClassName}
              value={form.freeFromAmountMinor}
              disabled={isSaving}
              onChange={(event) => onFieldChange('freeFromAmountMinor', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="delivery-tariff-currency" label="Валюта">
            <input
              id="delivery-tariff-currency"
              className={nativeFieldClassName}
              value={form.currency}
              disabled={isSaving}
              onChange={(event) => onFieldChange('currency', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="delivery-tariff-estimated-days" label="Срок доставки, дней">
            <input
              id="delivery-tariff-estimated-days"
              type="number"
              className={nativeFieldClassName}
              value={form.estimatedDays}
              disabled={isSaving}
              onChange={(event) => onFieldChange('estimatedDays', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="delivery-tariff-delivery-minutes" label="Срок доставки, минут">
            <input
              id="delivery-tariff-delivery-minutes"
              type="number"
              className={nativeFieldClassName}
              value={form.deliveryMinutes}
              disabled={isSaving}
              onChange={(event) => onFieldChange('deliveryMinutes', event.target.value)}
            />
          </FormField>
        </div>

        <label className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-4">
          <input
            type="checkbox"
            className={checkboxInputClassName}
            checked={form.isAvailable}
            disabled={isSaving}
            onChange={(event) => onIsAvailableChange(event.target.checked)}
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">Тариф доступен для расчета</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              Отключённый тариф останется в системе, но не будет участвовать в расчёте стоимости доставки.
            </span>
          </span>
        </label>

        {saveError ? <p className="text-sm font-medium text-destructive">{saveError}</p> : null}
        {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={onSubmit} disabled={isActionDisabled}>
            {isSaving ? 'Сохранение...' : form.id ? 'Сохранить тариф' : 'Создать тариф'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-xl bg-background/80 shadow-sm"
            onClick={onReset}
            disabled={isActionDisabled}
          >
            Сбросить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
