import type { ModifierGroup, ProductModifierGroupLink } from '@/entities/modifier-group';
import { parseProductSortOrder } from '@/features/product-editor/model/productControls';

export type ProductModifierGroupAssignmentValues = {
  modifierGroupId: string;
  sortOrder: string;
  isActive: boolean;
};

export type ProductModifierGroupAssignmentOptions = {
  allowEmptySortOrder?: boolean;
};

function buildModifierGroupLookup(availableModifierGroups: ModifierGroup[]): Map<string, ModifierGroup> {
  return new Map(availableModifierGroups.map((group) => [group.id, group]));
}

function parseModifierSortOrder(
  value: string,
  options: ProductModifierGroupAssignmentOptions = {},
): number | null {
  if (!options.allowEmptySortOrder && !value.trim()) {
    return null;
  }

  return parseProductSortOrder(value);
}

export function validateProductModifierGroupAssignments(
  modifierGroups: ProductModifierGroupAssignmentValues[],
  availableModifierGroups: ModifierGroup[],
  options: ProductModifierGroupAssignmentOptions = {},
): string | null {
  const modifierGroupLookup = buildModifierGroupLookup(availableModifierGroups);
  const selectedModifierGroupIds = new Set<string>();

  for (let modifierGroupIndex = 0; modifierGroupIndex < modifierGroups.length; modifierGroupIndex += 1) {
    const modifierGroup = modifierGroups[modifierGroupIndex];
    const normalizedModifierGroupId = modifierGroup.modifierGroupId.trim();
    const modifierSortOrder = parseModifierSortOrder(modifierGroup.sortOrder, options);

    if (!normalizedModifierGroupId) {
      return `Выберите группу модификаторов в строке №${modifierGroupIndex + 1}.`;
    }

    if (selectedModifierGroupIds.has(normalizedModifierGroupId)) {
      return 'Одна и та же группа модификаторов не может быть привязана к товару несколько раз.';
    }

    if (!modifierGroupLookup.has(normalizedModifierGroupId)) {
      return 'Одна из выбранных групп модификаторов отсутствует в справочнике.';
    }

    if (modifierSortOrder === null) {
      return `Sort order у модификатора №${modifierGroupIndex + 1} должен быть целым числом.`;
    }

    selectedModifierGroupIds.add(normalizedModifierGroupId);
  }

  return null;
}

export function mapProductModifierGroupAssignmentsToProduct(
  modifierGroups: ProductModifierGroupAssignmentValues[],
  availableModifierGroups: ModifierGroup[],
  options: ProductModifierGroupAssignmentOptions = {},
): ProductModifierGroupLink[] {
  const modifierGroupLookup = buildModifierGroupLookup(availableModifierGroups);

  return modifierGroups
    .map((group) => {
      const normalizedModifierGroupId = group.modifierGroupId.trim();
      const modifierDefinition = modifierGroupLookup.get(normalizedModifierGroupId) ?? null;

      return {
        modifierGroupId: normalizedModifierGroupId,
        code: modifierDefinition?.code ?? '',
        name: modifierDefinition?.name ?? '',
        minSelected: modifierDefinition?.minSelected ?? 0,
        maxSelected: modifierDefinition?.maxSelected ?? 0,
        isRequired: modifierDefinition?.isRequired ?? false,
        isActive: group.isActive,
        sortOrder: parseModifierSortOrder(group.sortOrder, options) ?? 0,
        options: [],
      };
    })
    .filter((group) => Boolean(group.modifierGroupId));
}
