import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatModifierConstraints,
  getModifierGroupById,
  saveModifierGroup,
  type ModifierGroup,
} from '@/entities/modifier-group';
import {
  buildModifierGroupEditorValues,
  mapModifierGroupEditorValuesToModifierGroup,
  ModifierGroupEditor,
  type ModifierGroupEditorValues,
  validateModifierGroupEditorValues,
} from '@/features/modifier-group-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { NavBar } from '@/shared/ui/NavBar';

export function ModifierGroupDetailsPage() {
  const { modifierGroupId } = useParams();
  const [modifierGroup, setModifierGroup] = useState<ModifierGroup | null>(null);
  const [formValues, setFormValues] = useState<ModifierGroupEditorValues | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const normalizedModifierGroupId = useMemo(() => (modifierGroupId ?? '').trim(), [modifierGroupId]);

  useEffect(() => {
    const loadModifierGroup = async () => {
      if (!isUuid(normalizedModifierGroupId)) {
        setModifierGroup(null);
        setFormValues(null);
        setErrorMessage('Некорректный идентификатор группы модификаторов.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const result = await getModifierGroupById(normalizedModifierGroupId);

      setModifierGroup(result.modifierGroup);
      setFormValues(result.modifierGroup ? buildModifierGroupEditorValues(result.modifierGroup) : null);
      setErrorMessage(result.error ?? '');
      setSaveError('');
      setSaveSuccess('');
      setIsLoading(false);
    };

    void loadModifierGroup();
  }, [normalizedModifierGroupId]);

  const handleValuesChange = (updater: (currentValues: ModifierGroupEditorValues) => ModifierGroupEditorValues) => {
    setFormValues((currentValues) => (currentValues ? updater(currentValues) : currentValues));

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleSave = async () => {
    if (!modifierGroup || !formValues) {
      return;
    }

    const validationError = validateModifierGroupEditorValues(formValues);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveModifierGroup(mapModifierGroupEditorValuesToModifierGroup(formValues, modifierGroup.id));

    if (result.modifierGroup) {
      setModifierGroup(result.modifierGroup);
      setFormValues(buildModifierGroupEditorValues(result.modifierGroup));
      setSaveSuccess('Изменения сохранены.');
    } else {
      setSaveError(result.error ?? 'Не удалось сохранить изменения группы модификаторов.');
    }

    setIsSaving(false);
  };

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/categories">
            Каталог
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" to="/modifier-groups">
            Модификаторы
          </Link>
          {modifierGroup ? (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{modifierGroup.name}</span>
            </>
          ) : null}
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Группа модификаторов</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/modifier-groups">
              К списку групп
            </Link>
          </div>
        </header>

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка группы модификаторов...</p>
          </section>
        ) : modifierGroup && formValues ? (
          <section className="catalog-card product-detail-card" aria-label="Информация о группе модификаторов">
            <div className="catalog-card-copy product-detail-summary">
              <p className="placeholder-eyebrow">Модификатор</p>
              <h3 className="product-detail-title">{modifierGroup.name}</h3>
              <p className="product-detail-price">{modifierGroup.options.length} опций</p>
            </div>

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="product-detail-grid">
              <div className="detail-block">
                <h4 className="detail-title">Идентификаторы</h4>
                <p className="detail-copy">ID: {modifierGroup.id}</p>
                <p className="detail-copy">Code: {modifierGroup.code}</p>
              </div>

              <div className="detail-block">
                <h4 className="detail-title">Правила выбора</h4>
                <p className="detail-copy">{formatModifierConstraints(modifierGroup)}</p>
                <p className="detail-copy">Sort order: {modifierGroup.sortOrder}</p>
              </div>

              <div className="detail-block">
                <h4 className="detail-title">Состав группы</h4>
                <p className="detail-copy">Опций: {modifierGroup.options.length}</p>
                <p className="detail-copy">Статус: {modifierGroup.isActive ? 'Активна' : 'Выключена'}</p>
              </div>

              <div className="detail-block">
                <h4 className="detail-title">API</h4>
                <p className="detail-copy">POST /api/v1/admin/catalog/modifier-groups</p>
              </div>
            </div>

            <ModifierGroupEditor
              idPrefix="modifier-group-edit"
              ariaLabel="Редактирование группы модификаторов"
              eyebrow="Редактирование"
              title="Изменить группу"
              description="Изменения сохраняются через upsert и сразу становятся доступны в карточках товаров."
              formValues={formValues}
              isSaving={isSaving}
              saveError={saveError}
              saveSuccess={saveSuccess}
              submitLabel="Сохранить изменения"
              savingLabel="Сохранение..."
              onValuesChange={handleValuesChange}
              onSubmit={() => void handleSave()}
            />
          </section>
        ) : (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              {errorMessage || 'Группа модификаторов не найдена.'}
            </p>
            <Link className="secondary-link" to="/modifier-groups">
              Вернуться к списку групп
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
