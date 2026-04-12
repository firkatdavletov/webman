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
    <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/categories">
            Каталог
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" to="/modifier-groups">
            Модификаторы
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Новая группа</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Новая группа модификаторов</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/modifier-groups">
              К списку групп
            </Link>
          </div>
        </header>

        <section className="catalog-card product-detail-card" aria-label="Создание группы модификаторов">
          <div className="product-detail-grid">
            <div className="detail-block">
              <h4 className="detail-title">Идентификатор</h4>
              <p className="detail-copy">ID будет назначен после сохранения.</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Опции</h4>
              <p className="detail-copy">В форме можно задать платные и бесплатные опции, флаги default и сортировку.</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">Связи с товарами</h4>
              <p className="detail-copy">После сохранения группу можно привязать к карточкам товаров.</p>
            </div>

            <div className="detail-block">
              <h4 className="detail-title">API</h4>
              <p className="detail-copy">POST /api/v1/admin/catalog/modifier-groups</p>
            </div>
          </div>

          <ModifierGroupEditor
            idPrefix="modifier-group-create"
            ariaLabel="Форма создания группы модификаторов"
            eyebrow="Создание"
            title="Новая группа"
            description="Заполните справочник опций и параметры выбора, чтобы затем подключать группу к товарам."
            formValues={formValues}
            isSaving={isSaving}
            saveError={saveError}
            submitLabel="Создать группу"
            savingLabel="Создание..."
            onValuesChange={handleValuesChange}
            onSubmit={() => void handleSave()}
          />
        </section>
    </main>
  );
}
