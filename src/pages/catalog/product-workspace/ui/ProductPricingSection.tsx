import { useEffect, useState } from 'react';
import type { Product } from '@/entities/product';
import {
  applyProductPricingFormValues,
  buildProductPricingFormValues,
  type ProductPricingFormValues,
  type ProductWorkspaceMutationResult,
} from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import {
  AdminNotice,
  AdminSectionCard,
  Button,
  FormField,
  PriceInput,
} from '@/shared/ui';

type ProductPricingSectionProps = {
  onSaveProduct: (product: Product) => Promise<ProductWorkspaceMutationResult>;
  product: Product;
};

export function ProductPricingSection({ onSaveProduct, product }: ProductPricingSectionProps) {
  const [values, setValues] = useState<ProductPricingFormValues>(() => buildProductPricingFormValues(product));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    setValues(buildProductPricingFormValues(product));
    setSaveError('');
    setSaveSuccess('');
  }, [product]);

  const handleValuesChange = (updater: (currentValues: ProductPricingFormValues) => ProductPricingFormValues) => {
    setValues((currentValues) => updater(currentValues));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleReset = () => {
    setValues(buildProductPricingFormValues(product));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    const mappingResult = applyProductPricingFormValues(product, values);

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
      setSaveError(result.error ?? 'Не удалось сохранить цену.');
      setIsSaving(false);
      return;
    }

    setValues(buildProductPricingFormValues(result.product));
    setSaveError(result.error ?? '');
    setSaveSuccess(result.error ? '' : 'Цена сохранена.');
    setIsSaving(false);
  };

  return (
    <AdminSectionCard
      eyebrow="Цена"
      title="Цена и остатки"
      description="Секция редактирует текущие поля цены товара. Остатки и цена варианта по умолчанию требуют будущих API."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <FormField htmlFor="workspace-product-price" label="Цена (руб.)">
          <PriceInput
            id="workspace-product-price"
            value={values.price}
            disabled={isSaving}
            onValueChange={(value) => handleValuesChange((currentValues) => ({ ...currentValues, price: value }))}
          />
        </FormField>

        <FormField htmlFor="workspace-product-old-price" label="Старая цена (руб.)">
          <PriceInput
            id="workspace-product-old-price"
            value={values.oldPrice}
            disabled={isSaving}
            onValueChange={(value) => handleValuesChange((currentValues) => ({ ...currentValues, oldPrice: value }))}
          />
        </FormField>

        <FormField
          htmlFor="workspace-product-stock"
          label="Остатки"
          description="Текущий API продукта не возвращает остатки для отдельного сохранения."
        >
          <input
            id="workspace-product-stock"
            className="h-8 w-full rounded-lg border border-input bg-muted/50 px-2.5 text-sm text-muted-foreground"
            value="Недоступно"
            disabled
            readOnly
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Сохранить цену'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
          Сбросить к снимку
        </Button>
      </div>

      {saveError ? <AdminNotice tone="destructive">{saveError}</AdminNotice> : null}
      {saveSuccess ? <AdminNotice>{saveSuccess}</AdminNotice> : null}
    </AdminSectionCard>
  );
}
