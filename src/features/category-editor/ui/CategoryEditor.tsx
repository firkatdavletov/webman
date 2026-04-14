import { cn } from '@/shared/lib/cn';
import { AdminNotice, AdminSectionCard, Button, FormField, Input } from '@/shared/ui';
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

const textareaClassName =
  'min-h-32 w-full rounded-xl border border-input bg-background/80 px-3 py-3 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';

const checkboxInputClassName =
  'mt-0.5 size-4 rounded border border-input text-primary outline-none transition focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';

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
    <AdminSectionCard aria-label={ariaLabel} eyebrow={eyebrow} title={title} description={description}>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor={`${idPrefix}-title`} label="Название" description="Отображается в каталоге и карточках товаров.">
            <Input
              id={`${idPrefix}-title`}
              className="h-11 rounded-xl bg-background/80 shadow-sm"
              value={formValues.title}
              onChange={(event) => onFieldChange('title', event.target.value)}
              disabled={isSaving}
            />
          </FormField>

          <FormField
            htmlFor={`${idPrefix}-slug`}
            label="Slug"
            description="Оставьте пустым, если backend должен сгенерировать slug сам."
          >
            <Input
              id={`${idPrefix}-slug`}
              className="h-11 rounded-xl bg-background/80 font-mono text-[0.82rem] shadow-sm"
              value={formValues.slug}
              onChange={(event) => onFieldChange('slug', event.target.value)}
              disabled={isSaving}
            />
          </FormField>

          <FormField
            htmlFor={`${idPrefix}-external-id`}
            label="Внешний ID"
            description="Опциональный идентификатор для интеграций с внешними системами."
          >
            <Input
              id={`${idPrefix}-external-id`}
              className="h-11 rounded-xl bg-background/80 shadow-sm"
              value={formValues.externalId}
              onChange={(event) => onFieldChange('externalId', event.target.value)}
              disabled={isSaving}
            />
          </FormField>

          <FormField
            htmlFor={`${idPrefix}-sort-order`}
            label="Порядок сортировки"
            description="Целое число. Чем меньше значение, тем выше категория в списках."
          >
            <Input
              id={`${idPrefix}-sort-order`}
              type="number"
              inputMode="numeric"
              className="h-11 rounded-xl bg-background/80 shadow-sm"
              value={formValues.sortOrder}
              onChange={(event) => onFieldChange('sortOrder', event.target.value)}
              disabled={isSaving}
            />
          </FormField>

          <FormField
            className="md:col-span-2"
            htmlFor={`${idPrefix}-description`}
            label="Описание"
            description="Внутреннее описание категории. Можно оставить пустым."
          >
            <textarea
              id={`${idPrefix}-description`}
              className={cn(textareaClassName)}
              value={formValues.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <div className="rounded-[1.25rem] border border-border/70 bg-muted/25 p-4">
          <label className="flex items-start gap-3">
            <input
              id={`${idPrefix}-active`}
              type="checkbox"
              className={checkboxInputClassName}
              checked={formValues.isActive}
              onChange={(event) => onIsActiveChange(event.target.checked)}
              disabled={isSaving}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">Отображать на витрине</span>
              <span className="block text-sm leading-6 text-muted-foreground">
                Если выключить категорию, она останется в админке, но перестанет считаться активной в каталоге.
              </span>
            </span>
          </label>
        </div>

        {saveError ? (
          <AdminNotice tone="destructive" role="alert">
            {saveError}
          </AdminNotice>
        ) : null}

        {saveSuccess ? (
          <div
            className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm leading-6 text-emerald-700"
            role="status"
          >
            {saveSuccess}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-1">
          <Button type="submit" size="lg" className="h-11 rounded-xl px-5" disabled={isSaving}>
            {isSaving ? savingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </AdminSectionCard>
  );
}
