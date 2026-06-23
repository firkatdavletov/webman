import { useEffect, useMemo, useState } from 'react';
import {
  formatModifierConstraints,
  type ModifierGroup,
} from '@/entities/modifier-group';
import type { Product } from '@/entities/product';
import {
  applyProductModifierAssignmentFormValues,
  buildProductModifierAssignmentFormValues,
  type ProductModifierAssignmentFormValues,
  type ProductWorkspaceMutationResult,
} from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import {
  AdminEmptyState,
  AdminNotice,
  AdminSectionCard,
  Badge,
  Button,
  FormField,
  Input,
  Select,
} from '@/shared/ui';

type ProductModifiersSectionProps = {
  isReferenceLoading: boolean;
  modifierGroups: ModifierGroup[];
  onSaveProduct: (product: Product) => Promise<ProductWorkspaceMutationResult>;
  product: Product;
};

function createEmptyModifierAssignment(): ProductModifierAssignmentFormValues {
  return {
    modifierGroupId: '',
    sortOrder: '0',
    isActive: true,
  };
}

export function ProductModifiersSection({
  isReferenceLoading,
  modifierGroups,
  onSaveProduct,
  product,
}: ProductModifiersSectionProps) {
  const [values, setValues] = useState<ProductModifierAssignmentFormValues[]>(() =>
    buildProductModifierAssignmentFormValues(product),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    setValues(buildProductModifierAssignmentFormValues(product));
    setSaveError('');
    setSaveSuccess('');
  }, [product]);

  const modifierGroupLookup = useMemo(
    () => new Map(modifierGroups.map((group) => [group.id, group])),
    [modifierGroups],
  );
  const isDisabled = isSaving || isReferenceLoading;

  const handleValuesChange = (
    updater: (currentValues: ProductModifierAssignmentFormValues[]) => ProductModifierAssignmentFormValues[],
  ) => {
    setValues((currentValues) => updater(currentValues));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleAddModifierGroup = () => {
    handleValuesChange((currentValues) => [...currentValues, createEmptyModifierAssignment()]);
  };

  const handleRemoveModifierGroup = (index: number) => {
    handleValuesChange((currentValues) => currentValues.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleReset = () => {
    setValues(buildProductModifierAssignmentFormValues(product));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    const mappingResult = applyProductModifierAssignmentFormValues(product, values, modifierGroups);

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
      setSaveError(result.error ?? 'Не удалось сохранить группы модификаторов.');
      setIsSaving(false);
      return;
    }

    setValues(buildProductModifierAssignmentFormValues(result.product));
    setSaveError(result.error ?? '');
    setSaveSuccess(result.error ? '' : 'Группы модификаторов сохранены.');
    setIsSaving(false);
  };

  return (
    <AdminSectionCard
      eyebrow="Модификаторы"
      title="Назначенные группы модификаторов"
      description="Секция сохраняет только связи продукта с существующими группами модификаторов."
      action={
        <Button type="button" variant="outline" onClick={handleAddModifierGroup} disabled={isDisabled}>
          Добавить группу
        </Button>
      }
    >
      {values.length ? (
        <div className="space-y-3">
          {values.map((value, index) => {
            const selectedModifierGroup = modifierGroupLookup.get(value.modifierGroupId);

            return (
              <article
                key={`${value.modifierGroupId || 'new'}-${index}`}
                className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.65fr)_minmax(9rem,0.55fr)_auto]"
              >
                <FormField htmlFor={`workspace-modifier-group-${index}`} label="Группа">
                  <Select
                    id={`workspace-modifier-group-${index}`}
                    value={value.modifierGroupId}
                    disabled={isDisabled}
                    onChange={(event) =>
                      handleValuesChange((currentValues) =>
                        currentValues.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                modifierGroupId: event.target.value,
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="">Выберите группу</option>
                    {modifierGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.code})
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {selectedModifierGroup ? formatModifierConstraints(selectedModifierGroup) : 'Группа не выбрана'}
                  </p>
                </FormField>

                <FormField htmlFor={`workspace-modifier-sort-${index}`} label="Sort order">
                  <Input
                    id={`workspace-modifier-sort-${index}`}
                    value={value.sortOrder}
                    disabled={isDisabled}
                    inputMode="numeric"
                    onChange={(event) =>
                      handleValuesChange((currentValues) =>
                        currentValues.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                sortOrder: event.target.value,
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </FormField>

                <FormField htmlFor={`workspace-modifier-active-${index}`} label="Статус">
                  <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground shadow-sm">
                    <input
                      id={`workspace-modifier-active-${index}`}
                      type="checkbox"
                      className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
                      checked={value.isActive}
                      disabled={isDisabled}
                      onChange={(event) =>
                        handleValuesChange((currentValues) =>
                          currentValues.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  isActive: event.target.checked,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    {value.isActive ? 'Активна' : 'Выключена'}
                  </label>
                </FormField>

                <div className="flex items-end justify-between gap-2 lg:flex-col lg:items-end lg:justify-end">
                  <Badge className="border border-border bg-muted/40 text-muted-foreground">
                    {selectedModifierGroup
                      ? selectedModifierGroup.isActive
                        ? 'В справочнике активна'
                        : 'В справочнике выключена'
                      : 'Нет данных'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveModifierGroup(index)}
                    disabled={isDisabled}
                  >
                    Удалить
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmptyState description="К продукту не привязаны группы модификаторов." />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={isDisabled}>
          {isSaving ? 'Сохранение...' : 'Сохранить модификаторы'}
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
