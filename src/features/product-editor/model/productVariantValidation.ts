import {
  parseProductEditorSortOrder,
  type ProductEditorValues,
} from '@/features/product-editor/model/productEditor';
import { parseOptionalProductPrice } from '@/features/product-editor/model/productBasicValidation';

export function validateProductVariantsSection(values: ProductEditorValues): string | null {
  if (!values.hasVariants) {
    return null;
  }

  const normalizedGroupCodes = new Set<string>();
  const normalizedOptionValuesByGroup = new Map<string, Set<string>>();
  const normalizedVariantSkus = new Set<string>();
  const normalizedProductSku = values.sku.trim();

  for (let groupIndex = 0; groupIndex < values.optionGroups.length; groupIndex += 1) {
    const group = values.optionGroups[groupIndex];
    const normalizedGroupCode = group.code.trim();
    const normalizedGroupTitle = group.title.trim();
    const groupSortOrder = parseProductEditorSortOrder(group.sortOrder);

    if (!normalizedGroupCode) {
      return `Укажите code у группы опций №${groupIndex + 1}.`;
    }

    if (normalizedGroupCodes.has(normalizedGroupCode)) {
      return `Code группы опций "${normalizedGroupCode}" должен быть уникальным.`;
    }

    if (!normalizedGroupTitle) {
      return `Укажите название у группы опций "${normalizedGroupCode}".`;
    }

    if (groupSortOrder === null) {
      return `Sort order у группы "${normalizedGroupCode}" должен быть целым числом.`;
    }

    normalizedGroupCodes.add(normalizedGroupCode);

    const normalizedValueCodes = new Set<string>();
    normalizedOptionValuesByGroup.set(normalizedGroupCode, normalizedValueCodes);

    if (!group.values.length) {
      return `Добавьте хотя бы одно значение в группу "${normalizedGroupCode}".`;
    }

    for (let valueIndex = 0; valueIndex < group.values.length; valueIndex += 1) {
      const value = group.values[valueIndex];
      const normalizedValueCode = value.code.trim();
      const normalizedValueTitle = value.title.trim();
      const valueSortOrder = parseProductEditorSortOrder(value.sortOrder);

      if (!normalizedValueCode) {
        return `Укажите code у значения №${valueIndex + 1} в группе "${normalizedGroupCode}".`;
      }

      if (normalizedValueCodes.has(normalizedValueCode)) {
        return `Code значения "${normalizedValueCode}" в группе "${normalizedGroupCode}" должен быть уникальным.`;
      }

      if (!normalizedValueTitle) {
        return `Укажите название у значения "${normalizedValueCode}" в группе "${normalizedGroupCode}".`;
      }

      if (valueSortOrder === null) {
        return `Sort order значения "${normalizedValueCode}" в группе "${normalizedGroupCode}" должен быть целым числом.`;
      }

      normalizedValueCodes.add(normalizedValueCode);
    }
  }

  if (!values.variants.length) {
    return 'Добавьте хотя бы один вариант товара или выключите режим вариантов.';
  }

  for (let variantIndex = 0; variantIndex < values.variants.length; variantIndex += 1) {
    const variant = values.variants[variantIndex];
    const normalizedVariantSku = variant.sku.trim();
    const variantLabel = normalizedVariantSku || `№${variantIndex + 1}`;
    const variantSortOrder = parseProductEditorSortOrder(variant.sortOrder);
    const variantPrice = parseOptionalProductPrice(variant.price);
    const variantOldPrice = parseOptionalProductPrice(variant.oldPrice);

    if (!normalizedVariantSku) {
      return `Укажите SKU у варианта №${variantIndex + 1}.`;
    }

    if (normalizedVariantSkus.has(normalizedVariantSku)) {
      return `SKU варианта "${normalizedVariantSku}" должен быть уникальным.`;
    }

    if (normalizedProductSku && normalizedVariantSku === normalizedProductSku) {
      return `SKU варианта "${normalizedVariantSku}" не должен совпадать с SKU товара.`;
    }

    normalizedVariantSkus.add(normalizedVariantSku);

    if (variantSortOrder === null) {
      return `Sort order варианта "${variantLabel}" должен быть целым числом.`;
    }

    if (variantPrice === undefined) {
      return `Цена варианта "${variantLabel}" должна быть неотрицательным числом или пустым значением.`;
    }

    if (variantOldPrice === undefined) {
      return `Старая цена варианта "${variantLabel}" должна быть неотрицательным числом или пустым значением.`;
    }

    if (normalizedGroupCodes.size > 0) {
      if (!variant.options.length) {
        return `Для варианта "${variantLabel}" укажите значения всех групп опций.`;
      }

      const selectedGroupCodes = new Set<string>();

      for (let optionIndex = 0; optionIndex < variant.options.length; optionIndex += 1) {
        const option = variant.options[optionIndex];
        const optionGroupCode = option.optionGroupCode.trim();
        const optionValueCode = option.optionValueCode.trim();

        if (!optionGroupCode) {
          return `У варианта "${variantLabel}" выбрана опция без группы.`;
        }

        if (selectedGroupCodes.has(optionGroupCode)) {
          return `У варианта "${variantLabel}" выбрано несколько значений группы "${optionGroupCode}".`;
        }

        if (!normalizedGroupCodes.has(optionGroupCode)) {
          return `У варианта "${variantLabel}" выбрана неизвестная группа "${optionGroupCode}".`;
        }

        if (!optionValueCode) {
          return `У варианта "${variantLabel}" не выбрано значение группы "${optionGroupCode}".`;
        }

        const groupValueCodes = normalizedOptionValuesByGroup.get(optionGroupCode);

        if (!groupValueCodes || !groupValueCodes.has(optionValueCode)) {
          return `У варианта "${variantLabel}" выбрано неизвестное значение "${optionValueCode}" для группы "${optionGroupCode}".`;
        }

        selectedGroupCodes.add(optionGroupCode);
      }

      if (selectedGroupCodes.size !== normalizedGroupCodes.size) {
        return `У варианта "${variantLabel}" должно быть выбрано по одному значению для каждой группы опций.`;
      }
    }
  }

  return null;
}
