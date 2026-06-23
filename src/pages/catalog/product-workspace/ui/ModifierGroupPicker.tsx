import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatModifierConstraints,
  type ModifierGroup,
} from '@/entities/modifier-group';
import {
  AdminEmptyState,
  Badge,
  Button,
  FormField,
  Select,
} from '@/shared/ui';

type ModifierGroupPickerProps = {
  disabled: boolean;
  isReferenceLoading: boolean;
  modifierGroups: ModifierGroup[];
  onAddModifierGroup: (modifierGroupId: string) => void;
  selectedModifierGroupIds: string[];
};

function getStatusClassName(isActive: boolean): string {
  return isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted/40 text-muted-foreground';
}

export function ModifierGroupPicker({
  disabled,
  isReferenceLoading,
  modifierGroups,
  onAddModifierGroup,
  selectedModifierGroupIds,
}: ModifierGroupPickerProps) {
  const selectedModifierGroupIdSet = useMemo(() => new Set(selectedModifierGroupIds), [selectedModifierGroupIds]);
  const availableModifierGroups = useMemo(
    () => modifierGroups.filter((group) => !selectedModifierGroupIdSet.has(group.id)),
    [modifierGroups, selectedModifierGroupIdSet],
  );
  const [pickedModifierGroupId, setPickedModifierGroupId] = useState('');
  const pickedModifierGroup = availableModifierGroups.find((group) => group.id === pickedModifierGroupId) ?? null;

  useEffect(() => {
    if (!pickedModifierGroupId) {
      return;
    }

    if (!availableModifierGroups.some((group) => group.id === pickedModifierGroupId)) {
      setPickedModifierGroupId('');
    }
  }, [availableModifierGroups, pickedModifierGroupId]);

  const handleAdd = () => {
    if (!pickedModifierGroupId) {
      return;
    }

    onAddModifierGroup(pickedModifierGroupId);
    setPickedModifierGroupId('');
  };

  if (!availableModifierGroups.length) {
    return (
      <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
        <AdminEmptyState
          className="min-h-28"
          description={
            isReferenceLoading
              ? 'Загружаем справочник групп модификаторов.'
              : 'Все доступные группы модификаторов уже назначены продукту.'
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <FormField
          htmlFor="workspace-modifier-group-picker"
          label="Добавить группу из справочника"
          description="Определения модификаторов редактируются отдельно от карточки продукта."
        >
          <Select
            id="workspace-modifier-group-picker"
            value={pickedModifierGroupId}
            disabled={disabled}
            onChange={(event) => setPickedModifierGroupId(event.target.value)}
          >
            <option value="">Выберите группу</option>
            {availableModifierGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.code})
              </option>
            ))}
          </Select>
        </FormField>

        <Button type="button" onClick={handleAdd} disabled={disabled || !pickedModifierGroupId}>
          Добавить
        </Button>
      </div>

      {pickedModifierGroup ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{pickedModifierGroup.name}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {pickedModifierGroup.code} • {formatModifierConstraints(pickedModifierGroup)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`border ${getStatusClassName(pickedModifierGroup.isActive)}`}>
              {pickedModifierGroup.isActive ? 'Активна' : 'Выключена'}
            </Badge>
            <Link className="text-sm font-medium text-primary hover:underline" to={`/modifier-groups/${pickedModifierGroup.id}`}>
              Открыть
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <Link className="text-sm font-medium text-primary hover:underline" to="/modifier-groups/new">
          Создать новую группу в справочнике
        </Link>
      </div>
    </div>
  );
}
