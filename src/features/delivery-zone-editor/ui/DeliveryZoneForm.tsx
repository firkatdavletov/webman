import { Link } from 'react-router-dom';
import { getDeliveryZoneGeometrySummary, getDeliveryZoneGeometryValidationError } from '@/features/delivery-zone-editor/model/geometryMappers';
import {
  DELIVERY_ZONE_TYPE_OPTIONS,
  type DeliveryZoneEditorValues,
  getDeliveryZoneTypeLabel,
} from '@/features/delivery-zone-editor/model/types';
import { cn } from '@/shared/lib/cn';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField } from '@/shared/ui';
import { checkboxInputClassName, DeliveryNativeSelect, nativeFieldClassName } from '@/pages/delivery/ui/deliveryShared';

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
    <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 py-0 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
      <CardHeader className="gap-2 border-b border-border/70 py-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-xl font-semibold tracking-tight md:text-2xl">{title}</CardTitle>
            <span
              className={cn(
                'inline-flex rounded-full border px-3 py-1 text-[0.72rem] font-medium',
                isDirty ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/70 bg-muted/40 text-muted-foreground',
              )}
            >
              {isDirty ? 'Есть несохраненные изменения' : 'Изменений нет'}
            </span>
          </div>
          <CardDescription className="max-w-3xl text-sm leading-6">{description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor={`${idPrefix}-code`} label="Код">
            <input
              id={`${idPrefix}-code`}
              className={nativeFieldClassName}
              value={values.code}
              disabled={isSaving}
              onChange={(event) => handleFieldChange('code', event.target.value)}
            />
          </FormField>

          <FormField htmlFor={`${idPrefix}-name`} label="Название">
            <input
              id={`${idPrefix}-name`}
              className={nativeFieldClassName}
              value={values.name}
              disabled={isSaving}
              onChange={(event) => handleFieldChange('name', event.target.value)}
            />
          </FormField>

          <FormField
            htmlFor={`${idPrefix}-type`}
            label="Тип зоны"
            description={
              DELIVERY_ZONE_TYPE_OPTIONS.find((option) => option.value === values.type)?.description ?? getDeliveryZoneTypeLabel(values.type)
            }
          >
            <DeliveryNativeSelect
              id={`${idPrefix}-type`}
              value={values.type}
              disabled={isSaving}
              onChange={(event) => handleFieldChange('type', event.target.value)}
            >
              {DELIVERY_ZONE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </DeliveryNativeSelect>
          </FormField>

          <FormField
            htmlFor={`${idPrefix}-priority`}
            label="Приоритет"
            description="Меньший приоритет можно использовать для более точного матчирования зон на backend."
          >
            <input
              id={`${idPrefix}-priority`}
              type="number"
              className={nativeFieldClassName}
              value={values.priority}
              disabled={isSaving}
              onChange={(event) => handleFieldChange('priority', event.target.value)}
            />
          </FormField>
        </div>

        {values.type === 'CITY' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField htmlFor={`${idPrefix}-city`} label="Город">
              <input
                id={`${idPrefix}-city`}
                className={nativeFieldClassName}
                value={values.city}
                disabled={isSaving}
                onChange={(event) => handleFieldChange('city', event.target.value)}
              />
            </FormField>
          </div>
        ) : null}

        {values.type === 'POSTAL_CODE' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField htmlFor={`${idPrefix}-postal-code`} label="Почтовый индекс">
              <input
                id={`${idPrefix}-postal-code`}
                className={nativeFieldClassName}
                value={values.postalCode}
                disabled={isSaving}
                onChange={(event) => handleFieldChange('postalCode', event.target.value)}
              />
            </FormField>
          </div>
        ) : null}

        {values.type === 'POLYGON' ? (
          <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Геометрия зоны</h3>
                <p className="text-sm leading-6 text-muted-foreground">{getDeliveryZoneGeometrySummary(values.geometry)}</p>
              </div>
              {mapEditorPath ? (
                <Button variant="outline" size="lg" className="rounded-xl bg-background/80 shadow-sm" render={<Link to={mapEditorPath} />}>
                  Открыть редактор зоны на карте
                </Button>
              ) : null}
            </div>

            {values.geometry?.polygons.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {values.geometry.polygons.map((polygon, polygonIndex) => (
                  <article key={`polygon-${polygonIndex}`} className="rounded-[1.25rem] border border-border/70 bg-background/75 px-4 py-4">
                    <h4 className="text-sm font-semibold text-foreground">Контур {polygonIndex + 1}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {polygon.outer.length} вершин{polygon.holes.length ? ` • ${polygon.holes.length} внутренних колец` : ''}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/60 px-4 py-5 text-sm leading-6 text-muted-foreground">
                Геометрия пока не задана. Откройте карту, чтобы нарисовать контур зоны.
              </p>
            )}

            {geometryValidationError ? <p className="text-sm font-medium text-destructive">{geometryValidationError}</p> : null}
          </section>
        ) : null}

        <label className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-4">
          <input
            type="checkbox"
            className={checkboxInputClassName}
            checked={values.isActive}
            disabled={isSaving}
            onChange={(event) =>
              onValuesChange((currentValues) => ({
                ...currentValues,
                isActive: event.target.checked,
              }))
            }
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">Использовать зону в расчете доставки</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              Если зона выключена, backend не должен использовать её при поиске совпадений.
            </span>
          </span>
        </label>

        {saveError ? <p className="text-sm font-medium text-destructive">{saveError}</p> : null}
        {saveSuccess ? <p className="text-sm font-medium text-emerald-700">{saveSuccess}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? savingLabel : submitLabel}
          </Button>
          <Button type="button" variant="outline" size="lg" className="rounded-xl bg-background/80 shadow-sm" onClick={onReset} disabled={isSaving}>
            Сбросить к последнему сохранению
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
