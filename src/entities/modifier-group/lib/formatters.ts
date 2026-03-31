import type {
  ModifierApplicationScope,
  ModifierGroup,
  ModifierPriceType,
  ProductModifierGroupLink,
} from '@/entities/modifier-group/model/types';

const modifierPriceTypeLabels: Record<ModifierPriceType, string> = {
  FIXED: 'Платно',
  FREE: 'Бесплатно',
};

const modifierApplicationScopeLabels: Record<ModifierApplicationScope, string> = {
  PER_ITEM: 'За единицу товара',
  PER_LINE: 'За всю позицию',
};

type ModifierConstraintsLike = Pick<ModifierGroup, 'minSelected' | 'maxSelected' | 'isRequired'> | Pick<
  ProductModifierGroupLink,
  'minSelected' | 'maxSelected' | 'isRequired'
>;

export function formatModifierPriceTypeLabel(priceType: ModifierPriceType): string {
  return modifierPriceTypeLabels[priceType] ?? priceType;
}

export function formatModifierApplicationScopeLabel(applicationScope: ModifierApplicationScope): string {
  return modifierApplicationScopeLabels[applicationScope] ?? applicationScope;
}

export function formatModifierConstraints({ minSelected, maxSelected, isRequired }: ModifierConstraintsLike): string {
  const selectionLabel =
    minSelected === maxSelected
      ? `Ровно ${maxSelected}`
      : minSelected > 0
        ? `${minSelected}–${maxSelected}`
        : `До ${maxSelected}`;

  return `${selectionLabel} • ${isRequired ? 'обязательно' : 'необязательно'}`;
}
