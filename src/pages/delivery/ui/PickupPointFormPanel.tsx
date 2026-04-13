import { getPickupPointCoordinateSummary, type PickupPointEditorValues } from '@/features/pickup-point-map-editor';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField } from '@/shared/ui';
import { checkboxInputClassName, DeliveryTextarea, nativeFieldClassName } from '@/pages/delivery/ui/deliveryShared';

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
    <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 py-0 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
      <CardHeader className="gap-2 border-b border-border/70 py-6">
        <CardTitle className="text-xl font-semibold tracking-tight">{form.id ? 'Редактирование пункта' : 'Новый пункт'}</CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-6">
          Базовые поля: код, название и адрес. Координаты можно оставить пустыми, если они не участвуют в логике расчета.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="pickup-point-code" label="Код">
            <input
              id="pickup-point-code"
              className={nativeFieldClassName}
              value={form.code}
              disabled={isSaving}
              onChange={(event) => onFieldChange('code', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-name" label="Название">
            <input
              id="pickup-point-name"
              className={nativeFieldClassName}
              value={form.name}
              disabled={isSaving}
              onChange={(event) => onFieldChange('name', event.target.value)}
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField htmlFor="pickup-point-country" label="Страна">
            <input
              id="pickup-point-country"
              className={nativeFieldClassName}
              value={form.country}
              disabled={isSaving}
              onChange={(event) => onFieldChange('country', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-region" label="Регион">
            <input
              id="pickup-point-region"
              className={nativeFieldClassName}
              value={form.region}
              disabled={isSaving}
              onChange={(event) => onFieldChange('region', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-city" label="Город">
            <input
              id="pickup-point-city"
              className={nativeFieldClassName}
              value={form.city}
              disabled={isSaving}
              onChange={(event) => onFieldChange('city', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-postal-code" label="Индекс">
            <input
              id="pickup-point-postal-code"
              className={nativeFieldClassName}
              value={form.postalCode}
              disabled={isSaving}
              onChange={(event) => onFieldChange('postalCode', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-street" label="Улица">
            <input
              id="pickup-point-street"
              className={nativeFieldClassName}
              value={form.street}
              disabled={isSaving}
              onChange={(event) => onFieldChange('street', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-house" label="Дом">
            <input
              id="pickup-point-house"
              className={nativeFieldClassName}
              value={form.house}
              disabled={isSaving}
              onChange={(event) => onFieldChange('house', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-apartment" label="Квартира / офис">
            <input
              id="pickup-point-apartment"
              className={nativeFieldClassName}
              value={form.apartment}
              disabled={isSaving}
              onChange={(event) => onFieldChange('apartment', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-entrance" label="Подъезд">
            <input
              id="pickup-point-entrance"
              className={nativeFieldClassName}
              value={form.entrance}
              disabled={isSaving}
              onChange={(event) => onFieldChange('entrance', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-floor" label="Этаж">
            <input
              id="pickup-point-floor"
              className={nativeFieldClassName}
              value={form.floor}
              disabled={isSaving}
              onChange={(event) => onFieldChange('floor', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-intercom" label="Домофон">
            <input
              id="pickup-point-intercom"
              className={nativeFieldClassName}
              value={form.intercom}
              disabled={isSaving}
              onChange={(event) => onFieldChange('intercom', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-latitude" label="Широта">
            <input
              id="pickup-point-latitude"
              className={nativeFieldClassName}
              value={form.latitude}
              disabled={isSaving}
              onChange={(event) => onFieldChange('latitude', event.target.value)}
            />
          </FormField>

          <FormField htmlFor="pickup-point-longitude" label="Долгота">
            <input
              id="pickup-point-longitude"
              className={nativeFieldClassName}
              value={form.longitude}
              disabled={isSaving}
              onChange={(event) => onFieldChange('longitude', event.target.value)}
            />
          </FormField>
        </div>

        <FormField htmlFor="pickup-point-comment" label="Комментарий">
          <DeliveryTextarea
            id="pickup-point-comment"
            value={form.comment}
            disabled={isSaving}
            onChange={(event) => onFieldChange('comment', event.target.value)}
          />
        </FormField>

        <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">Точка на карте</h3>
              <p className="text-sm leading-6 text-muted-foreground">{getPickupPointCoordinateSummary(form)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" size="lg" className="rounded-xl bg-background/80 shadow-sm" onClick={onOpenMap} disabled={isActionDisabled}>
                Выбрать на карте
              </Button>
              <Button type="button" variant="outline" size="lg" className="rounded-xl bg-background/80 shadow-sm" onClick={onDetectAddress} disabled={isActionDisabled}>
                {isDetectingAddress ? 'Определение адреса...' : 'Определить адрес'}
              </Button>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            Откройте карту, чтобы поставить точку пункта самовывоза кликом или перетащить существующий маркер.
          </p>

          {detectError ? <p className="text-sm font-medium text-destructive">{detectError}</p> : null}
          {detectSuccess ? <p className="text-sm font-medium text-emerald-700">{detectSuccess}</p> : null}
        </section>

        <label className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-4">
          <input
            type="checkbox"
            className={checkboxInputClassName}
            checked={form.isActive}
            disabled={isActionDisabled}
            onChange={(event) => onIsActiveChange(event.target.checked)}
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">Показывать пункт самовывоза клиентам</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              Отключенный пункт остаётся в справочнике, но не отображается в клиентском приложении.
            </span>
          </span>
        </label>

        {saveError ? <p className="text-sm font-medium text-destructive">{saveError}</p> : null}
        {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={onSubmit} disabled={isActionDisabled}>
            {isSaving ? 'Сохранение...' : form.id ? 'Сохранить пункт' : 'Создать пункт'}
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
