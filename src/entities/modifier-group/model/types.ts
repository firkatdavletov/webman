import type { components } from '@/shared/api/schema';

export type ModifierPriceType = components['schemas']['ModifierPriceType'];
export type ModifierApplicationScope = components['schemas']['ModifierApplicationScope'];

export type ModifierOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceType: ModifierPriceType;
  price: number;
  applicationScope: ModifierApplicationScope;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type ModifierGroup = {
  id: string;
  code: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: ModifierOption[];
};

export type ProductModifierGroupLink = {
  modifierGroupId: string;
  code: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: ModifierOption[];
};
