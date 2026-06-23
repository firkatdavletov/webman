import { useEffect, useState } from 'react';
import type { Product } from '@/entities/product';
import { PRODUCT_UNIT_OPTIONS } from '@/features/product-editor';
import {
  applyBasicInformationFormValues,
  buildBasicInformationFormValues,
  type BasicInformationFormValues,
  type ProductWorkspaceMutationResult,
} from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import {
  AdminNotice,
  AdminSectionCard,
  Button,
  FormField,
  Input,
  Select,
} from '@/shared/ui';

type BasicInformationSectionProps = {
  categoryOptions: Array<[string, string]>;
  isReferenceLoading: boolean;
  onSaveProduct: (product: Product) => Promise<ProductWorkspaceMutationResult>;
  product: Product;
};

export function BasicInformationSection({
  categoryOptions,
  isReferenceLoading,
  onSaveProduct,
  product,
}: BasicInformationSectionProps) {
  const [values, setValues] = useState<BasicInformationFormValues>(() => buildBasicInformationFormValues(product));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    setValues(buildBasicInformationFormValues(product));
    setSaveError('');
    setSaveSuccess('');
  }, [product]);

  const isDisabled = isSaving || isReferenceLoading;

  const handleValuesChange = (updater: (currentValues: BasicInformationFormValues) => BasicInformationFormValues) => {
    setValues((currentValues) => updater(currentValues));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleReset = () => {
    setValues(buildBasicInformationFormValues(product));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    const mappingResult = applyBasicInformationFormValues(product, values);

    if (!mappingResult.product) {
      setSaveError(mappingResult.error);
      setSaveSuccess('');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await onSaveProduct(mappingResult.product);

    if (!result.product) {
      setSaveError(result.error ?? 'Не удалось сохранить базовую информацию.');
      setIsSaving(false);
      return;
    }

    setValues(buildBasicInformationFormValues(result.product));
    setSaveError(result.error ?? '');
    setSaveSuccess(result.error ? '' : 'Базовая информация сохранена.');
    setIsSaving(false);
  };

  return (
    <AdminSectionCard
      eyebrow="Основное"
      title="Базовая информация"
      description="Секция сохраняет только основные поля товара через текущий API продукта."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField htmlFor="workspace-product-title" label="Название">
          <Input
            id="workspace-product-title"
            value={values.title}
            disabled={isDisabled}
            onChange={(event) => handleValuesChange((currentValues) => ({ ...currentValues, title: event.target.value }))}
          />
        </FormField>

        <FormField htmlFor="workspace-product-category" label="Категория">
          <Select
            id="workspace-product-category"
            value={values.categoryId}
            disabled={isDisabled}
            onChange={(event) =>
              handleValuesChange((currentValues) => ({
                ...currentValues,
                categoryId: event.target.value,
              }))
            }
          >
            <option value="">Выберите категорию</option>
            {categoryOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="workspace-product-unit" label="Единица измерения">
          <Select
            id="workspace-product-unit"
            value={values.unit}
            disabled={isDisabled}
            onChange={(event) =>
              handleValuesChange((currentValues) => ({
                ...currentValues,
                unit: event.target.value as Product['unit'],
              }))
            }
          >
            {PRODUCT_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="workspace-product-count-step" label="Шаг продажи">
          <Input
            id="workspace-product-count-step"
            value={values.countStep}
            disabled={isDisabled}
            inputMode="numeric"
            onChange={(event) =>
              handleValuesChange((currentValues) => ({
                ...currentValues,
                countStep: event.target.value,
              }))
            }
          />
        </FormField>

        <FormField htmlFor="workspace-product-sku" label="SKU">
          <Input
            id="workspace-product-sku"
            value={values.sku}
            disabled={isDisabled}
            onChange={(event) => handleValuesChange((currentValues) => ({ ...currentValues, sku: event.target.value }))}
          />
        </FormField>

        <FormField htmlFor="workspace-product-active" label="Статус">
          <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground shadow-sm">
            <input
              id="workspace-product-active"
              type="checkbox"
              className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
              checked={values.isActive}
              disabled={isDisabled}
              onChange={(event) =>
                handleValuesChange((currentValues) => ({
                  ...currentValues,
                  isActive: event.target.checked,
                }))
              }
            />
            {values.isActive ? 'Активен' : 'Выключен'}
          </label>
        </FormField>
      </div>

      <FormField htmlFor="workspace-product-description" label="Описание">
        <textarea
          id="workspace-product-description"
          className="min-h-28 w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          value={values.description}
          disabled={isDisabled}
          onChange={(event) =>
            handleValuesChange((currentValues) => ({
              ...currentValues,
              description: event.target.value,
            }))
          }
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={isDisabled}>
          {isSaving ? 'Сохранение...' : 'Сохранить основное'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} disabled={isDisabled}>
          Сбросить к снимку
        </Button>
      </div>

      {saveError ? <AdminNotice tone="destructive">{saveError}</AdminNotice> : null}
      {saveSuccess ? <AdminNotice>{saveSuccess}</AdminNotice> : null}
    </AdminSectionCard>
  );
}
