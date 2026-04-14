import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  formatModifierApplicationScopeLabel,
  formatModifierConstraints,
  getModifierGroupById,
  getModifierGroupOptionById,
  saveModifierGroupOption,
  type ModifierApplicationScope,
  type ModifierGroup,
  type ModifierOption,
  type ModifierPriceType,
} from '@/entities/modifier-group';
import { cn } from '@/shared/lib/cn';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import {
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminSectionCard,
  Button,
  FormField,
  Input,
  buttonVariants,
} from '@/shared/ui';

type ModifierOptionEditorValues = {
  code: string;
  name: string;
  description: string;
  priceType: ModifierPriceType;
  price: string;
  applicationScope: ModifierApplicationScope;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_MODIFIER_OPTION_EDITOR_VALUES: ModifierOptionEditorValues = {
  code: '',
  name: '',
  description: '',
  priceType: 'FREE',
  price: '',
  applicationScope: 'PER_ITEM',
  isDefault: false,
  isActive: true,
  sortOrder: '0',
};

const MODIFIER_PRICE_TYPE_OPTIONS: Array<{ value: ModifierPriceType; label: string }> = [
  { value: 'FREE', label: 'Бесплатно' },
  { value: 'FIXED', label: 'Платно' },
];

const MODIFIER_APPLICATION_SCOPE_OPTIONS: Array<{ value: ModifierApplicationScope; label: string }> = [
  { value: 'PER_ITEM', label: 'За единицу товара' },
  { value: 'PER_LINE', label: 'За всю позицию' },
];

function parseInteger(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue;
}

function parseModifierPrice(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

function formatEditablePrice(price: number): string {
  const rawValue = (price / 100).toFixed(2);

  return rawValue.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function buildModifierOptionEditorValues(option: ModifierOption): ModifierOptionEditorValues {
  return {
    code: option.code,
    name: option.name,
    description: option.description ?? '',
    priceType: option.priceType,
    price: option.priceType === 'FREE' ? '' : formatEditablePrice(option.price),
    applicationScope: option.applicationScope,
    isDefault: option.isDefault,
    isActive: option.isActive,
    sortOrder: String(option.sortOrder),
  };
}

function mapModifierOptionEditorValuesToOption(
  values: ModifierOptionEditorValues,
  optionId = '',
): ModifierOption {
  return {
    id: optionId,
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description.trim() || null,
    priceType: values.priceType,
    price: values.priceType === 'FREE' ? 0 : parseModifierPrice(values.price) ?? 0,
    applicationScope: values.applicationScope,
    isDefault: values.isDefault,
    isActive: values.isActive,
    sortOrder: parseInteger(values.sortOrder) ?? 0,
  };
}

function validateModifierOptionEditorValues(values: ModifierOptionEditorValues): string | null {
  const normalizedCode = values.code.trim();
  const normalizedName = values.name.trim();
  const parsedSortOrder = parseInteger(values.sortOrder);

  if (!normalizedCode) {
    return 'Укажите code опции.';
  }

  if (!normalizedName) {
    return 'Укажите название опции.';
  }

  if (parsedSortOrder === null) {
    return 'Sort order опции должен быть целым неотрицательным числом.';
  }

  if (values.priceType === 'FIXED' && parseModifierPrice(values.price) === null) {
    return 'Укажите корректную цену для платной опции.';
  }

  if (values.isDefault && !values.isActive) {
    return 'Опция по умолчанию не может быть выключена.';
  }

  return null;
}

export function ModifierOptionDetailsPage() {
  const navigate = useNavigate();
  const { modifierGroupId, optionId } = useParams();
  const [modifierGroup, setModifierGroup] = useState<ModifierGroup | null>(null);
  const [option, setOption] = useState<ModifierOption | null>(null);
  const [formValues, setFormValues] = useState<ModifierOptionEditorValues>(EMPTY_MODIFIER_OPTION_EDITOR_VALUES);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const normalizedModifierGroupId = useMemo(() => (modifierGroupId ?? '').trim(), [modifierGroupId]);
  const normalizedOptionId = useMemo(() => (optionId ?? '').trim(), [optionId]);
  const isCreateMode = normalizedOptionId.length === 0;

  useEffect(() => {
    const loadData = async () => {
      if (!isUuid(normalizedModifierGroupId)) {
        setModifierGroup(null);
        setOption(null);
        setErrorMessage('Некорректный идентификатор группы модификаторов.');
        setIsLoading(false);
        return;
      }

      if (!isCreateMode && !isUuid(normalizedOptionId)) {
        setModifierGroup(null);
        setOption(null);
        setErrorMessage('Некорректный идентификатор опции модификатора.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const groupResult = await getModifierGroupById(normalizedModifierGroupId);

      if (!groupResult.modifierGroup) {
        setModifierGroup(null);
        setOption(null);
        setErrorMessage(groupResult.error ?? 'Группа модификаторов не найдена.');
        setIsLoading(false);
        return;
      }

      setModifierGroup(groupResult.modifierGroup);

      if (isCreateMode) {
        setOption(null);
        setFormValues(EMPTY_MODIFIER_OPTION_EDITOR_VALUES);
        setIsLoading(false);
        return;
      }

      const optionResult = await getModifierGroupOptionById(normalizedModifierGroupId, normalizedOptionId);

      if (!optionResult.option) {
        setOption(null);
        setErrorMessage(optionResult.error ?? 'Опция модификатора не найдена.');
        setIsLoading(false);
        return;
      }

      setOption(optionResult.option);
      setFormValues(buildModifierOptionEditorValues(optionResult.option));
      setIsLoading(false);
    };

    void loadData();
  }, [isCreateMode, normalizedModifierGroupId, normalizedOptionId]);

  const handleFieldChange = (field: keyof ModifierOptionEditorValues, value: string | boolean) => {
    setFormValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [field]: value,
      } as ModifierOptionEditorValues;

      if (field === 'priceType' && value === 'FREE') {
        nextValues.price = '';
      }

      return nextValues;
    });

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleSave = async () => {
    if (!modifierGroup) {
      return;
    }

    const validationError = validateModifierOptionEditorValues(formValues);

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveModifierGroupOption(
      modifierGroup.id,
      mapModifierOptionEditorValuesToOption(formValues, isCreateMode ? '' : normalizedOptionId),
    );

    if (!result.option) {
      setSaveError(result.error ?? 'Не удалось сохранить опцию модификатора.');
      setIsSaving(false);
      return;
    }

    setOption(result.option);
    setFormValues(buildModifierOptionEditorValues(result.option));

    if (isCreateMode) {
      navigate(`/modifier-groups/${modifierGroup.id}/options/${result.option.id}`, { replace: true });
      return;
    }

    setSaveSuccess('Изменения сохранены.');
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Опция модификатора"
          description="Загружаем данные группы и опции модификатора."
        />
        <AdminNotice>Загрузка...</AdminNotice>
      </AdminPage>
    );
  }

  if (!modifierGroup) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title="Опция модификатора"
          actions={
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')} to="/modifier-groups">
              К списку групп
            </Link>
          }
        />
        <AdminNotice tone="destructive" role="alert">
          {errorMessage || 'Группа модификаторов не найдена.'}
        </AdminNotice>
      </AdminPage>
    );
  }

  if (!isCreateMode && !option) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Каталог"
          title={`Группа: ${modifierGroup.name}`}
          actions={
            <Link
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')}
              to={`/modifier-groups/${modifierGroup.id}`}
            >
              К деталям группы
            </Link>
          }
        />
        <AdminNotice tone="destructive" role="alert">
          {errorMessage || 'Опция модификатора не найдена.'}
        </AdminNotice>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title={isCreateMode ? `Новая опция: ${modifierGroup.name}` : `Опция: ${formValues.name || option?.name || 'Без названия'}`}
        description="Опция хранится отдельно от группы и управляется собственным API эндпоинтом."
        actions={
          <Link
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl')}
            to={`/modifier-groups/${modifierGroup.id}`}
          >
            К деталям группы
          </Link>
        }
      />

      {errorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {errorMessage}
        </AdminNotice>
      ) : null}

      <AdminSectionCard
        aria-label="Контекст группы модификаторов"
        eyebrow="Группа"
        title={modifierGroup.name}
        description="Проверьте ограничения группы перед изменением опции."
      >
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase">Code</p>
            <p className="mt-1 font-mono text-xs">{modifierGroup.code}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase">Ограничения</p>
            <p className="mt-1">{formatModifierConstraints(modifierGroup)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase">Применение</p>
            <p className="mt-1">{formatModifierApplicationScopeLabel(formValues.applicationScope)}</p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        aria-label="Редактирование опции модификатора"
        eyebrow={isCreateMode ? 'Создание' : 'Редактирование'}
        title={isCreateMode ? 'Новая опция модификатора' : 'Параметры опции'}
        description="Изменения сохраняются сразу в API опций модификаторов текущей группы."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField htmlFor="modifier-option-code" label="Code">
            <Input
              id="modifier-option-code"
              value={formValues.code}
              onChange={(event) => handleFieldChange('code', event.target.value)}
              disabled={isSaving}
            />
          </FormField>

          <FormField htmlFor="modifier-option-name" label="Название" className="md:col-span-2">
            <Input
              id="modifier-option-name"
              value={formValues.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <FormField htmlFor="modifier-option-description" label="Описание">
          <textarea
            id="modifier-option-description"
            className="min-h-24 w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={formValues.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            disabled={isSaving}
            placeholder="Необязательно"
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField htmlFor="modifier-option-price-type" label="Тип цены">
            <select
              id="modifier-option-price-type"
              className="h-9 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={formValues.priceType}
              onChange={(event) => handleFieldChange('priceType', event.target.value as ModifierPriceType)}
              disabled={isSaving}
            >
              {MODIFIER_PRICE_TYPE_OPTIONS.map((priceTypeOption) => (
                <option key={priceTypeOption.value} value={priceTypeOption.value}>
                  {priceTypeOption.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="modifier-option-price" label="Доплата, ₽">
            <Input
              id="modifier-option-price"
              inputMode="decimal"
              value={formValues.price}
              onChange={(event) => handleFieldChange('price', event.target.value)}
              disabled={isSaving || formValues.priceType === 'FREE'}
              placeholder={formValues.priceType === 'FREE' ? 'Бесплатно' : '0'}
            />
          </FormField>

          <FormField htmlFor="modifier-option-sort-order" label="Sort order">
            <Input
              id="modifier-option-sort-order"
              inputMode="numeric"
              value={formValues.sortOrder}
              onChange={(event) => handleFieldChange('sortOrder', event.target.value)}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <FormField htmlFor="modifier-option-application-scope" label="Область применения">
          <select
            id="modifier-option-application-scope"
            className="h-9 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={formValues.applicationScope}
            onChange={(event) => handleFieldChange('applicationScope', event.target.value as ModifierApplicationScope)}
            disabled={isSaving}
          >
            {MODIFIER_APPLICATION_SCOPE_OPTIONS.map((applicationScopeOption) => (
              <option key={applicationScopeOption.value} value={applicationScopeOption.value}>
                {applicationScopeOption.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={formValues.isDefault}
              onChange={(event) => handleFieldChange('isDefault', event.target.checked)}
              disabled={isSaving}
            />
            <span>Выбрана по умолчанию</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={formValues.isActive}
              onChange={(event) => handleFieldChange('isActive', event.target.checked)}
              disabled={isSaving}
            />
            <span>Опция активна</span>
          </label>
        </div>

        {saveError ? (
          <AdminNotice tone="destructive" role="alert">
            {saveError}
          </AdminNotice>
        ) : null}

        {saveSuccess ? <AdminNotice role="status">{saveSuccess}</AdminNotice> : null}

        <div className="flex justify-end">
          <Button type="button" size="lg" className="rounded-xl" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : isCreateMode ? 'Создать опцию' : 'Сохранить опцию'}
          </Button>
        </div>
      </AdminSectionCard>
    </AdminPage>
  );
}
