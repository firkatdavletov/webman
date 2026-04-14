import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveModifierGroup } from '@/entities/modifier-group';
import {
  EMPTY_MODIFIER_GROUP_EDITOR_VALUES,
  mapModifierGroupEditorValuesToModifierGroup,
  ModifierGroupEditor,
  type ModifierGroupEditorValues,
  validateModifierGroupEditorValues,
} from '@/features/modifier-group-editor';
import {
  AdminPage,
  AdminPageHeader,
  AdminSectionCard,
  buttonVariants,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export function ModifierGroupCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<ModifierGroupEditorValues>(EMPTY_MODIFIER_GROUP_EDITOR_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleValuesChange = (updater: (currentValues: ModifierGroupEditorValues) => ModifierGroupEditorValues) => {
    setFormValues((currentValues) => updater(currentValues));

    if (saveError) {
      setSaveError('');
    }
  };

  const handleSave = async () => {
    const validationError = validateModifierGroupEditorValues(formValues);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError('');

    const result = await saveModifierGroup(mapModifierGroupEditorValuesToModifierGroup(formValues));

    if (result.modifierGroup) {
      navigate(`/modifier-groups/${result.modifierGroup.id}`, { replace: true });
      return;
    }

    setSaveError(result.error ?? 'Не удалось создать группу модификаторов.');
    setIsSaving(false);
  };

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title="Новая группа модификаторов"
        description="Создайте группу и задайте правила выбора. Опции можно добавить сразу после сохранения группы."
        actions={
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/modifier-groups">
            К списку групп
          </Link>
        }
      />

      <AdminSectionCard
        aria-label="Создание группы модификаторов"
        eyebrow="Создание"
        title="Параметры группы"
        description="Группа определяет ограничения выбора в карточках товаров."
      >
        <ModifierGroupEditor
          idPrefix="modifier-group-create"
          ariaLabel="Форма создания группы модификаторов"
          eyebrow="Форма"
          title="Новая группа"
          description="После сохранения откроется карточка группы, где можно добавить отдельные опции."
          formValues={formValues}
          isSaving={isSaving}
          saveError={saveError}
          submitLabel="Создать группу"
          savingLabel="Создание..."
          onValuesChange={handleValuesChange}
          onSubmit={() => void handleSave()}
        />
      </AdminSectionCard>
    </AdminPage>
  );
}
