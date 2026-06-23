import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatModifierApplicationScopeLabel,
  formatModifierConstraints,
  formatModifierPriceTypeLabel,
  type ModifierGroup,
  type ProductModifierGroupLink,
} from '@/entities/modifier-group';
import {
  formatPrice,
  type Product,
} from '@/entities/product';
import {
  applyProductModifierAssignmentFormValues,
  buildProductModifierAssignmentFormValues,
  type ProductModifierAssignmentFormValues,
  type ProductWorkspaceMutationResult,
} from '@/pages/catalog/product-workspace/model/productWorkspaceForms';
import { ModifierGroupPicker } from '@/pages/catalog/product-workspace/ui/ModifierGroupPicker';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminSectionCard,
  Badge,
  Button,
  FormField,
  Input,
} from '@/shared/ui';

type ProductModifierGroupsSectionProps = {
  isReferenceLoading: boolean;
  modifierGroups: ModifierGroup[];
  onSaveProduct: (product: Product) => Promise<ProductWorkspaceMutationResult>;
  product: Product;
};

const checkboxInputClassName =
  'size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50';

function getStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

function buildModifierGroupAssignment(modifierGroupId: string, sortOrder: number): ProductModifierAssignmentFormValues {
  return {
    modifierGroupId,
    sortOrder: String(sortOrder),
    isActive: true,
  };
}

function getAssignedModifierGroup(
  product: Product,
  modifierGroupId: string,
): ProductModifierGroupLink | null {
  return product.modifierGroups.find((group) => group.modifierGroupId === modifierGroupId) ?? null;
}

export function ProductModifierGroupsSection({
  isReferenceLoading,
  modifierGroups,
  onSaveProduct,
  product,
}: ProductModifierGroupsSectionProps) {
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
  const selectedModifierGroupIds = values.map((value) => value.modifierGroupId).filter(Boolean);
  const isDisabled = isSaving || isReferenceLoading;

  const handleValuesChange = (
    updater: (currentValues: ProductModifierAssignmentFormValues[]) => ProductModifierAssignmentFormValues[],
  ) => {
    setValues((currentValues) => updater(currentValues));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleAddModifierGroup = (modifierGroupId: string) => {
    handleValuesChange((currentValues) => [
      ...currentValues,
      buildModifierGroupAssignment(modifierGroupId, currentValues.length * 10),
    ]);
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
      setSaveError(result.error ?? 'Не удалось сохранить назначения модификаторов.');
      setIsSaving(false);
      return;
    }

    setValues(buildProductModifierAssignmentFormValues(result.product));
    setSaveError(result.error ?? '');
    setSaveSuccess(result.error ? '' : 'Назначения модификаторов сохранены.');
    setIsSaving(false);
  };

  return (
    <AdminSectionCard
      eyebrow="Модификаторы"
      title="Группы модификаторов продукта"
      description="Назначайте существующие группы и меняйте только настройки связи с продуктом."
    >
      <ModifierGroupPicker
        disabled={isDisabled}
        isReferenceLoading={isReferenceLoading}
        modifierGroups={modifierGroups}
        onAddModifierGroup={handleAddModifierGroup}
        selectedModifierGroupIds={selectedModifierGroupIds}
      />

      {values.length ? (
        <div className="space-y-4">
          {values.map((value, index) => {
            const assignedModifierGroup = getAssignedModifierGroup(product, value.modifierGroupId);
            const modifierGroupDefinition = modifierGroupLookup.get(value.modifierGroupId) ?? null;
            const groupLabel =
              assignedModifierGroup?.name
              ?? modifierGroupDefinition?.name
              ?? 'Группа не выбрана';
            const groupCode =
              assignedModifierGroup?.code
              ?? modifierGroupDefinition?.code
              ?? '';
            const constraintsSource = assignedModifierGroup ?? modifierGroupDefinition;
            const isDefinitionActive = modifierGroupDefinition?.isActive ?? assignedModifierGroup?.isActive ?? false;
            const modifierOptions = assignedModifierGroup?.options ?? [];

            return (
              <article key={`${value.modifierGroupId || 'new'}-${index}`} className="rounded-2xl border border-border/70 bg-background/70">
                <div className="flex flex-col gap-4 border-b border-border/60 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{groupLabel}</p>
                      {groupCode ? <Badge className="border border-border bg-muted/40 text-muted-foreground">{groupCode}</Badge> : null}
                      <Badge className={cn('border', getStatusClassName(value.isActive))}>
                        {value.isActive ? 'Назначение активно' : 'Назначение выключено'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {constraintsSource ? formatModifierConstraints(constraintsSource) : 'Выберите группу модификаторов.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('border', getStatusClassName(isDefinitionActive))}>
                      {isDefinitionActive ? 'В справочнике активна' : 'В справочнике выключена'}
                    </Badge>
                    {value.modifierGroupId ? (
                      <Link className="text-sm font-medium text-primary hover:underline" to={`/modifier-groups/${value.modifierGroupId}`}>
                        Открыть определение
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_minmax(10rem,14rem)_auto] lg:items-end">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Опции группы</p>
                    {modifierOptions.length ? (
                      <div className="mt-3 grid gap-2">
                        {modifierOptions.map((option) => (
                          <div
                            key={option.id}
                            className="grid gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{option.name}</p>
                                <Badge className="border border-border bg-muted/40 text-muted-foreground">{option.code}</Badge>
                                {option.isDefault ? (
                                  <Badge className="border border-blue-200 bg-blue-50 text-blue-700">По умолчанию</Badge>
                                ) : null}
                              </div>
                              {option.description ? (
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <Badge className="border border-border bg-background text-muted-foreground">
                                {formatModifierPriceTypeLabel(option.priceType)}
                                {option.priceType === 'FIXED' ? ` · ${formatPrice(option.price)}` : ''}
                              </Badge>
                              <Badge className="border border-border bg-background text-muted-foreground">
                                {formatModifierApplicationScopeLabel(option.applicationScope)}
                              </Badge>
                              <Badge className={cn('border', getStatusClassName(option.isActive))}>
                                {option.isActive ? 'Активна' : 'Выключена'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AdminEmptyState className="mt-3 min-h-28" description="Опции появятся после сохранения назначения и обновления снимка продукта." />
                    )}
                  </div>

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

                  <FormField htmlFor={`workspace-modifier-active-${index}`} label="Статус назначения">
                    <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-input bg-background/80 px-3 text-sm text-foreground shadow-sm">
                      <input
                        id={`workspace-modifier-active-${index}`}
                        type="checkbox"
                        className={checkboxInputClassName}
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
                      {value.isActive ? 'Активно' : 'Выключено'}
                    </label>
                  </FormField>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveModifierGroup(index)}
                    disabled={isDisabled}
                  >
                    Убрать
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <AdminEmptyState
          title="Группы не назначены"
          description="Добавьте существующую группу модификаторов из справочника, чтобы настроить ее для продукта."
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={isDisabled}>
          {isSaving ? 'Сохранение...' : 'Сохранить назначения'}
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
