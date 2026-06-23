import type { Product } from '@/entities/product';

export type ProductPublishingChecklistItem = {
  id: string;
  label: string;
  detail: string;
  isReady: boolean;
};

export function buildProductPublishingChecklist(product: Product): ProductPublishingChecklistItem[] {
  const hasVariantStructure = Boolean(product.optionGroups.length || product.variants.length);
  const variantGroupsWithValues = product.optionGroups.filter((group) => group.values.length).length;
  const variantsWithCompleteOptions = product.variants.filter((variant) => {
    if (!product.optionGroups.length) {
      return true;
    }

    const selectedGroupCodes = new Set(variant.options.map((option) => option.optionGroupCode));

    return product.optionGroups.every((group) => selectedGroupCodes.has(group.code));
  }).length;
  const inactiveRequiredModifierGroups = product.modifierGroups.filter((group) => group.isRequired && !group.isActive);

  return [
    {
      id: 'basic',
      label: 'Основная информация',
      isReady: Boolean(product.title.trim() && product.categoryId.trim() && product.countStep > 0 && product.unit),
      detail: 'Название, категория, единица измерения и шаг продажи',
    },
    {
      id: 'pricing',
      label: 'Цена',
      isReady: product.price >= 0 && (product.oldPrice === null || product.oldPrice >= 0),
      detail: product.oldPrice === null ? 'Основная цена заполнена' : 'Основная и старая цена заполнены',
    },
    {
      id: 'media',
      label: 'Медиа',
      isReady: Boolean(product.images.length || product.variants.some((variant) => variant.images.length)),
      detail: `${product.images.length} фото продукта, ${product.variants.reduce((total, variant) => total + variant.images.length, 0)} фото вариантов`,
    },
    {
      id: 'variants',
      label: 'Варианты',
      isReady: !hasVariantStructure
        || Boolean(product.optionGroups.length && variantGroupsWithValues === product.optionGroups.length && variantsWithCompleteOptions === product.variants.length && product.variants.length),
      detail: hasVariantStructure
        ? `${product.optionGroups.length} групп, ${variantGroupsWithValues} с значениями, ${variantsWithCompleteOptions}/${product.variants.length} вариантов заполнены`
        : 'Обычный товар без вариантов',
    },
    {
      id: 'modifiers',
      label: 'Модификаторы',
      isReady: inactiveRequiredModifierGroups.length === 0,
      detail: product.modifierGroups.length
        ? `${product.modifierGroups.length} назначений, обязательных выключено: ${inactiveRequiredModifierGroups.length}`
        : 'Назначений модификаторов нет',
    },
    {
      id: 'configured',
      label: 'Состояние конфигурации',
      isReady: product.isConfigured,
      detail: product.isConfigured ? 'Карточка прошла системную проверку конфигурации' : 'Карточка не прошла системную проверку конфигурации',
    },
  ];
}

export function getProductPublishingReadyCount(checklist: ProductPublishingChecklistItem[]): number {
  return checklist.filter((item) => item.isReady).length;
}
