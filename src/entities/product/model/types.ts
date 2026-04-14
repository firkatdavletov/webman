import type { ProductModifierGroupLink } from '@/entities/modifier-group/model/types';
import type { components } from '@/shared/api/schema';
import type { MediaImage } from '@/shared/model/media';

export type ProductUnit = components['schemas']['ProductUnit'];

export type ProductOptionValue = {
  id: string | null;
  code: string;
  title: string;
  sortOrder: number;
};

export type ProductOptionGroup = {
  id: string | null;
  code: string;
  title: string;
  sortOrder: number;
  values: ProductOptionValue[];
};

export type ProductVariantOption = {
  optionGroupCode: string;
  optionValueCode: string;
};

export type ProductVariant = {
  id: string | null;
  externalId: string | null;
  sku: string;
  title: string | null;
  price: number | null;
  oldPrice: number | null;
  images: MediaImage[];
  sortOrder: number;
  isActive: boolean;
  options: ProductVariantOption[];
};

export type ProductVariantDetails = {
  id: string;
  externalId: string | null;
  sku: string;
  title: string | null;
  price: number | null;
  oldPrice: number | null;
  images: MediaImage[];
  sortOrder: number;
  isActive: boolean;
  optionValueIds: string[];
};

export type Product = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  isActive: boolean;
  description: string | null;
  price: number;
  oldPrice: number | null;
  images: MediaImage[];
  unit: ProductUnit;
  displayWeight: string | null;
  countStep: number;
  sku: string | null;
  defaultVariantId: string | null;
  optionGroups: ProductOptionGroup[];
  modifierGroups: ProductModifierGroupLink[];
  variants: ProductVariant[];
};
