import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createPromoCode,
  deletePromoCode,
  formatPromoCodeDateTime,
  formatPromoCodeDiscountValue,
  getPromoCodeById,
  getPromoCodeDiscountTypeLabel,
  updatePromoCode,
  type PromoCode,
} from '@/entities/promo-code';
import { isUuid } from '@/shared/lib/uuid/isUuid';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
  FormField,
  Input,
  PriceInput,
  Select,
  buttonVariants,
} from '@/shared/ui';
import {
  buildPromoCodeFormValues,
  buildPromoCodePayload,
  EMPTY_PROMO_CODE_FORM_VALUES,
  PROMO_CODE_DISCOUNT_TYPE_OPTIONS,
  type PromoCodeFormValues,
} from '@/pages/promo-codes/model/promoCodePage';

type LocationState = {
  flashMessage?: string;
} | null;

const CHECKBOX_CLASSNAME = 'mt-0.5 size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/40';

export function PromoCodeDetailsPage() {
  const { promoCodeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState) ?? null;
  const normalizedPromoCodeId = (promoCodeId ?? '').trim();
  const isCreateFlow = !normalizedPromoCodeId;
  const requestIdRef = useRef(0);

  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [sourceFormValues, setSourceFormValues] = useState<PromoCodeFormValues>(EMPTY_PROMO_CODE_FORM_VALUES);
  const [formValues, setFormValues] = useState<PromoCodeFormValues>(EMPTY_PROMO_CODE_FORM_VALUES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    const flashMessage = locationState?.flashMessage;

    if (!flashMessage) {
      return;
    }

    setSaveSuccess(flashMessage);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, locationState?.flashMessage, navigate]);

  useEffect(() => {
    const loadPromoCode = async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setErrorMessage('');
      setSaveError('');
      setSaveSuccess('');
      setIsSaving(false);
      setIsDeleting(false);

      if (isCreateFlow) {
        setPromoCode(null);
        setSourceFormValues(EMPTY_PROMO_CODE_FORM_VALUES);
        setFormValues(EMPTY_PROMO_CODE_FORM_VALUES);
        setIsLoading(false);
        return;
      }

      if (!isUuid(normalizedPromoCodeId)) {
        setPromoCode(null);
        setSourceFormValues(EMPTY_PROMO_CODE_FORM_VALUES);
        setFormValues(EMPTY_PROMO_CODE_FORM_VALUES);
        setErrorMessage('Некорректный идентификатор промокода.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const result = await getPromoCodeById(normalizedPromoCodeId);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.promoCode) {
        setPromoCode(null);
        setSourceFormValues(EMPTY_PROMO_CODE_FORM_VALUES);
        setFormValues(EMPTY_PROMO_CODE_FORM_VALUES);
        setErrorMessage(result.error ?? 'Промокод не найден.');
        setIsLoading(false);
        return;
      }

      const nextFormValues = buildPromoCodeFormValues(result.promoCode);
      setPromoCode(result.promoCode);
      setSourceFormValues(nextFormValues);
      setFormValues(nextFormValues);
      setErrorMessage(result.error ?? '');
      setIsLoading(false);
    };

    void loadPromoCode();
  }, [isCreateFlow, normalizedPromoCodeId]);

  const isDirty = useMemo(() => JSON.stringify(formValues) !== JSON.stringify(sourceFormValues), [formValues, sourceFormValues]);

  const handleFieldChange = <TField extends keyof PromoCodeFormValues>(field: TField, value: PromoCodeFormValues[TField]) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const handleSave = async () => {
    const payloadResult = buildPromoCodePayload(formValues);

    if (!payloadResult.payload || payloadResult.error) {
      setSaveError(payloadResult.error ?? 'Не удалось подготовить данные промокода.');
      setSaveSuccess('');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = isCreateFlow
      ? await createPromoCode(payloadResult.payload)
      : await updatePromoCode(normalizedPromoCodeId, payloadResult.payload);

    setIsSaving(false);

    if (!result.promoCode || result.error) {
      setSaveError(result.error ?? 'Не удалось сохранить промокод.');
      return;
    }

    const nextFormValues = buildPromoCodeFormValues(result.promoCode);
    setPromoCode(result.promoCode);
    setSourceFormValues(nextFormValues);
    setFormValues(nextFormValues);
    setSaveSuccess('Промокод сохранен.');

    if (isCreateFlow) {
      navigate(`/promo-codes/${result.promoCode.id}`, {
        replace: true,
        state: {
          flashMessage: 'Промокод создан.',
        } satisfies LocationState,
      });
    }
  };

  const handleDelete = async () => {
    if (isCreateFlow || !promoCode) {
      return;
    }

    if (!window.confirm(`Удалить промокод ${promoCode.code}?`)) {
      return;
    }

    setIsDeleting(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await deletePromoCode(promoCode.id);

    setIsDeleting(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    navigate('/promo-codes', {
      replace: true,
    });
  };

  return (
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/promo-codes">
          Операции
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/promo-codes">
          Промокоды
        </Link>
        <span>/</span>
        <span className="text-foreground">{isCreateFlow ? 'Новый промокод' : formValues.code || 'Карточка промокода'}</span>
      </nav>

      <AdminPageHeader
        kicker="Операции"
        title={isLoading ? 'Загрузка промокода...' : isCreateFlow ? 'Новый промокод' : formValues.code || 'Карточка промокода'}
        description="Настройте тип скидки, лимиты и период действия промокода."
        actions={
          <>
            <AdminPageStatus>
              {isLoading
                ? 'Загрузка...'
                : isCreateFlow
                  ? isDirty
                    ? 'Новый промокод изменен'
                    : 'Новый промокод'
                  : isDirty
                    ? 'Есть несохраненные изменения'
                    : 'Синхронизировано'}
            </AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/promo-codes">
              К списку промокодов
            </Link>
          </>
        }
      />

      {isLoading ? (
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Получаем карточку промокода и подготавливаем форму." />
        </AdminSectionCard>
      ) : errorMessage ? (
        <AdminSectionCard>
          <AdminEmptyState tone="destructive" title="Ошибка загрузки" description={errorMessage} />
        </AdminSectionCard>
      ) : (
        <>
          {promoCode ? (
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
                <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Тип скидки</p>
                <p className="mt-1 text-sm font-medium text-foreground">{getPromoCodeDiscountTypeLabel(promoCode.discountType)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatPromoCodeDiscountValue(promoCode.discountType, promoCode.discountValue, promoCode.currency)}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
                <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Использований</p>
                <p className="mt-1 text-sm font-medium text-foreground">{promoCode.usedCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Активность: {promoCode.active ? 'активен' : 'неактивен'}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
                <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Обновления</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatPromoCodeDateTime(promoCode.updatedAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Создан: {formatPromoCodeDateTime(promoCode.createdAt)}</p>
              </div>
            </section>
          ) : null}

          <AdminSectionCard eyebrow="Форма" title="Параметры промокода">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField htmlFor="promo-code-code" label="Код">
                <Input
                  id="promo-code-code"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.code}
                  disabled={isSaving || isDeleting}
                  placeholder="WELCOME10"
                  onChange={(event) => handleFieldChange('code', event.target.value.toUpperCase())}
                />
              </FormField>

              <FormField htmlFor="promo-code-discount-type" label="Тип скидки">
                <Select
                  id="promo-code-discount-type"
                  value={formValues.discountType}
                  disabled={isSaving || isDeleting}
                  onChange={(event) => handleFieldChange('discountType', event.target.value as PromoCodeFormValues['discountType'])}
                >
                  {PROMO_CODE_DISCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                htmlFor="promo-code-discount-value"
                label={formValues.discountType === 'FIXED' ? 'Размер скидки (цена)' : 'Размер скидки (%)'}
              >
                {formValues.discountType === 'FIXED' ? (
                  <PriceInput
                    id="promo-code-discount-value"
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={formValues.discountValue}
                    disabled={isSaving || isDeleting}
                    onValueChange={(value) => handleFieldChange('discountValue', value)}
                  />
                ) : (
                  <Input
                    id="promo-code-discount-value"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    className="h-11 rounded-xl bg-background/80 shadow-sm"
                    value={formValues.discountValue}
                    disabled={isSaving || isDeleting}
                    placeholder="10"
                    onChange={(event) => handleFieldChange('discountValue', event.target.value)}
                  />
                )}
              </FormField>

              <FormField htmlFor="promo-code-currency" label="Валюта">
                <Input
                  id="promo-code-currency"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.currency}
                  disabled={isSaving || isDeleting}
                  placeholder="RUB"
                  onChange={(event) => handleFieldChange('currency', event.target.value.toUpperCase())}
                />
              </FormField>

              <FormField htmlFor="promo-code-min-order" label="Минимальная сумма заказа">
                <PriceInput
                  id="promo-code-min-order"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.minOrderAmountMinor}
                  disabled={isSaving || isDeleting}
                  onValueChange={(value) => handleFieldChange('minOrderAmountMinor', value)}
                />
              </FormField>

              <FormField htmlFor="promo-code-max-discount" label="Максимальная сумма скидки">
                <PriceInput
                  id="promo-code-max-discount"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.maxDiscountMinor}
                  disabled={isSaving || isDeleting}
                  onValueChange={(value) => handleFieldChange('maxDiscountMinor', value)}
                />
              </FormField>

              <FormField htmlFor="promo-code-starts-at" label="Начало действия">
                <Input
                  id="promo-code-starts-at"
                  type="datetime-local"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.startsAt}
                  disabled={isSaving || isDeleting}
                  onChange={(event) => handleFieldChange('startsAt', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="promo-code-ends-at" label="Окончание действия">
                <Input
                  id="promo-code-ends-at"
                  type="datetime-local"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.endsAt}
                  disabled={isSaving || isDeleting}
                  onChange={(event) => handleFieldChange('endsAt', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="promo-code-usage-total" label="Лимит использований (всего)">
                <Input
                  id="promo-code-usage-total"
                  type="number"
                  min={1}
                  step={1}
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.usageLimitTotal}
                  disabled={isSaving || isDeleting}
                  placeholder="например, 500"
                  onChange={(event) => handleFieldChange('usageLimitTotal', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="promo-code-usage-per-user" label="Лимит на пользователя">
                <Input
                  id="promo-code-usage-per-user"
                  type="number"
                  min={1}
                  step={1}
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  value={formValues.usageLimitPerUser}
                  disabled={isSaving || isDeleting}
                  placeholder="например, 1"
                  onChange={(event) => handleFieldChange('usageLimitPerUser', event.target.value)}
                />
              </FormField>
            </div>

            <label
              htmlFor="promo-code-active"
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3 transition-colors hover:bg-muted/30"
            >
              <input
                id="promo-code-active"
                type="checkbox"
                className={CHECKBOX_CLASSNAME}
                checked={formValues.active}
                disabled={isSaving || isDeleting}
                onChange={(event) => handleFieldChange('active', event.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">Активен</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Если выключить, промокод перестанет применяться, но останется в истории.
                </span>
              </span>
            </label>
          </AdminSectionCard>

          <AdminSectionCard>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => void handleSave()} disabled={isSaving || isDeleting || !isDirty}>
                {isSaving ? 'Сохранение...' : isCreateFlow ? 'Создать промокод' : 'Сохранить изменения'}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isSaving || isDeleting || !isDirty}
                onClick={() => {
                  setFormValues(sourceFormValues);
                  setSaveError('');
                  setSaveSuccess('');
                }}
              >
                Сбросить изменения
              </Button>

              {!isCreateFlow ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto"
                  disabled={isSaving || isDeleting}
                  onClick={() => void handleDelete()}
                >
                  {isDeleting ? 'Удаление...' : 'Удалить промокод'}
                </Button>
              ) : null}
            </div>

            {saveError ? (
              <AdminNotice tone="destructive" role="alert">
                {saveError}
              </AdminNotice>
            ) : null}

            {saveSuccess ? <AdminNotice>{saveSuccess}</AdminNotice> : null}
          </AdminSectionCard>
        </>
      )}
    </AdminPage>
  );
}
