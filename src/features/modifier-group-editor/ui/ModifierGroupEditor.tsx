import type { ModifierGroupEditorValues } from '@/features/modifier-group-editor/model/modifierGroupEditor';
import { Button, FormField, Input } from '@/shared/ui';

type EditableModifierGroupField = Exclude<keyof ModifierGroupEditorValues, 'isRequired' | 'isActive'>;

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

  return (
    <section aria-label={ariaLabel} className="space-y-5 rounded-2xl border border-border/70 bg-card/70 p-4 md:p-5">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
        <h3 className="font-heading text-xl font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField htmlFor={`${idPrefix}-code`} label="Code">
          <Input
            id={`${idPrefix}-code`}
            value={formValues.code}
            onChange={(event) => handleFieldChange('code', event.target.value)}
            disabled={isSaving}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-name`} label="Название" className="md:col-span-2">
          <Input
            id={`${idPrefix}-name`}
            value={formValues.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            disabled={isSaving}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField htmlFor={`${idPrefix}-min-selected`} label="Минимум выбранных">
          <Input
            id={`${idPrefix}-min-selected`}
            inputMode="numeric"
            value={formValues.minSelected}
            onChange={(event) => handleFieldChange('minSelected', event.target.value)}
            disabled={isSaving}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-max-selected`} label="Максимум выбранных">
          <Input
            id={`${idPrefix}-max-selected`}
            inputMode="numeric"
            value={formValues.maxSelected}
            onChange={(event) => handleFieldChange('maxSelected', event.target.value)}
            disabled={isSaving}
          />
        </FormField>

        <FormField htmlFor={`${idPrefix}-sort-order`} label="Sort order">
          <Input
            id={`${idPrefix}-sort-order`}
            inputMode="numeric"
            value={formValues.sortOrder}
            onChange={(event) => handleFieldChange('sortOrder', event.target.value)}
            disabled={isSaving}
          />
        </FormField>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={formValues.isRequired}
            onChange={(event) => handleBooleanFieldChange('isRequired', event.target.checked)}
            disabled={isSaving}
          />
          <span>Обязательный выбор</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={formValues.isActive}
            onChange={(event) => handleBooleanFieldChange('isActive', event.target.checked)}
            disabled={isSaving}
          />
          <span>Группа активна</span>
        </label>
      </div>

      {saveError ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      {saveSuccess ? (
        <p className="rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {saveSuccess}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="lg" className="rounded-xl" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? savingLabel : submitLabel}
        </Button>
      </div>
    </section>
  );
}
