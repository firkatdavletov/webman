import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCheckoutPaymentRules,
  getDeliveryMethodSettings,
  replaceCheckoutPaymentRules,
  saveDeliveryMethodSetting,
  type CheckoutPaymentRule,
  type DeliveryMethod,
  type DeliveryMethodSetting,
  type PaymentMethodCode,
} from '@/entities/delivery';
import {
  createFallbackMethodSetting,
  DELIVERY_METHOD_ORDER,
  getDeliveryMethodKindLabel,
  getDeliveryMethodLabel,
  getPaymentMethodLabel,
  isDeliveryMethod,
  PAYMENT_METHOD_ORDER,
  sortCheckoutPaymentRules,
  sortDeliveryMethodSettings,
} from '@/pages/delivery/model/deliveryAdmin';
import {
  checkboxInputClassName,
  DeliveryDetailStat,
  DeliveryStatusBadge,
  DeliveryTextarea,
  nativeFieldClassName,
} from '@/pages/delivery/ui/deliveryShared';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  buttonVariants,
} from '@/shared/ui';

function clonePaymentRules(rules: CheckoutPaymentRule[]): CheckoutPaymentRule[] {
  return rules.map((rule) => ({
    ...rule,
    paymentMethods: [...rule.paymentMethods],
  }));
}

export function DeliveryMethodDetailsPage() {
  const { method } = useParams();
  const normalizedMethod = (method ?? '').trim();
  const isKnownMethod = isDeliveryMethod(normalizedMethod);
  const deliveryMethod = (isKnownMethod ? normalizedMethod : DELIVERY_METHOD_ORDER[0]) as DeliveryMethod;
  const requestIdRef = useRef(0);

  const [sourceSetting, setSourceSetting] = useState<DeliveryMethodSetting>(() => createFallbackMethodSetting(deliveryMethod));
  const [settingForm, setSettingForm] = useState<DeliveryMethodSetting>(() => createFallbackMethodSetting(deliveryMethod));
  const [sourcePaymentRules, setSourcePaymentRules] = useState<CheckoutPaymentRule[]>([]);
  const [paymentRules, setPaymentRules] = useState<CheckoutPaymentRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [paymentsSuccess, setPaymentsSuccess] = useState('');

  useEffect(() => {
    if (!isKnownMethod) {
      setErrorMessage('Неизвестный способ доставки.');
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setErrorMessage('');
    setSettingsError('');
    setSettingsSuccess('');
    setPaymentsError('');
    setPaymentsSuccess('');

    void Promise.all([getDeliveryMethodSettings(), getCheckoutPaymentRules()]).then(([settingsResult, paymentRulesResult]) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSettings = sortDeliveryMethodSettings(settingsResult.settings);
      const nextRules = sortCheckoutPaymentRules(paymentRulesResult.rules);
      const matchedSetting = nextSettings.find((item) => item.method === deliveryMethod) ?? createFallbackMethodSetting(deliveryMethod);

      setSourceSetting(matchedSetting);
      setSettingForm(matchedSetting);
      setSourcePaymentRules(clonePaymentRules(nextRules));
      setPaymentRules(clonePaymentRules(nextRules));
      setErrorMessage([settingsResult.error, paymentRulesResult.error].filter(Boolean).join(' '));
      setIsLoading(false);
    });
  }, [deliveryMethod, isKnownMethod]);

  const currentRule = useMemo(
    () =>
      paymentRules.find((rule) => rule.deliveryMethod === deliveryMethod) ?? {
        deliveryMethod,
        deliveryMethodName: settingForm.title || getDeliveryMethodLabel(deliveryMethod),
        paymentMethods: [] as PaymentMethodCode[],
        isDynamic: false,
      },
    [deliveryMethod, paymentRules, settingForm.title],
  );

  const isSettingsDirty = useMemo(() => JSON.stringify(settingForm) !== JSON.stringify(sourceSetting), [settingForm, sourceSetting]);
  const isPaymentsDirty = useMemo(() => JSON.stringify(paymentRules) !== JSON.stringify(sourcePaymentRules), [paymentRules, sourcePaymentRules]);
  const statusText = isLoading
    ? 'Загрузка карточки способа...'
    : `${getDeliveryMethodLabel(deliveryMethod)} • ${settingForm.isActive ? 'активен' : 'отключен'}`;

  const handlePaymentRuleToggle = (paymentMethod: PaymentMethodCode) => {
    setPaymentRules((currentRules) => {
      let matched = false;

      const nextRules = currentRules.map((rule) => {
        if (rule.deliveryMethod !== deliveryMethod) {
          return rule;
        }

        matched = true;

        if (rule.isDynamic) {
          return rule;
        }

        const hasMethod = rule.paymentMethods.includes(paymentMethod);
        const nextPaymentMethods = hasMethod
          ? rule.paymentMethods.filter((methodCode) => methodCode !== paymentMethod)
          : [...rule.paymentMethods, paymentMethod].sort(
              (left, right) => PAYMENT_METHOD_ORDER.indexOf(left) - PAYMENT_METHOD_ORDER.indexOf(right),
            );

        return {
          ...rule,
          paymentMethods: nextPaymentMethods,
        };
      });

      if (matched) {
        return nextRules;
      }

      return sortCheckoutPaymentRules([
        ...nextRules,
        {
          deliveryMethod,
          deliveryMethodName: settingForm.title || getDeliveryMethodLabel(deliveryMethod),
          isDynamic: false,
          paymentMethods: [paymentMethod],
        },
      ]);
    });
    setPaymentsError('');
    setPaymentsSuccess('');
  };

  const handleSettingsSave = async () => {
    const title = settingForm.title.trim();

    if (!title) {
      setSettingsError('Укажите название способа доставки.');
      setSettingsSuccess('');
      return;
    }

    setIsSavingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');

    const result = await saveDeliveryMethodSetting({
      method: deliveryMethod,
      title,
      description: settingForm.description?.trim() ? settingForm.description.trim() : null,
      isActive: settingForm.isActive,
      sortOrder: settingForm.sortOrder,
    });

    setIsSavingSettings(false);

    if (!result.setting || result.error) {
      setSettingsError(result.error ?? 'Не удалось сохранить способ доставки.');
      return;
    }

    const nextSetting = result.setting;
    setSourceSetting(nextSetting);
    setSettingForm(nextSetting);
    setSettingsSuccess(`Настройки «${nextSetting.title}» сохранены.`);
  };

  const handlePaymentsSave = async () => {
    if (currentRule.isDynamic) {
      return;
    }

    setIsSavingPayments(true);
    setPaymentsError('');
    setPaymentsSuccess('');

    const staticRules = paymentRules
      .filter((rule) => !rule.isDynamic)
      .map((rule) => ({
        deliveryMethod: rule.deliveryMethod,
        paymentMethods: rule.paymentMethods,
      }));

    if (!staticRules.some((rule) => rule.deliveryMethod === deliveryMethod)) {
      staticRules.push({
        deliveryMethod,
        paymentMethods: currentRule.paymentMethods,
      });
    }

    const result = await replaceCheckoutPaymentRules(staticRules);

    setIsSavingPayments(false);

    if (result.error) {
      setPaymentsError(result.error);
      return;
    }

    const nextRules = sortCheckoutPaymentRules(result.rules);
    setSourcePaymentRules(clonePaymentRules(nextRules));
    setPaymentRules(clonePaymentRules(nextRules));
    setPaymentsSuccess('Правила оплаты сохранены.');
  };

  if (!isKnownMethod) {
    return (
      <AdminPage>
        <AdminPageHeader
          kicker="Доставка"
          title="Способ доставки не найден"
          description="Проверьте ссылку или вернитесь в список способов доставки."
          actions={
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/delivery/methods">
              К списку способов
            </Link>
          }
        />
        <AdminEmptyState title="Неизвестный способ доставки" description="Маршрут не соответствует одному из зарегистрированных delivery methods." />
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title={isLoading ? 'Загрузка способа...' : settingForm.title}
        description="Редактируйте базовые поля способа отдельно от других сущностей. Правила оплаты вынесены в самостоятельный блок ниже."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/delivery/methods">
              К списку способов
            </Link>
          </>
        }
      />

      {errorMessage ? (
        <AdminNotice tone="destructive" role="alert">
          {errorMessage}
        </AdminNotice>
      ) : null}

      {isLoading ? (
        <AdminEmptyState title="Загрузка способа доставки" description="Получаем текущие настройки метода и связанные правила оплаты." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 py-0 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
            <CardHeader className="gap-2 border-b border-border/70 py-6">
              <CardTitle className="text-xl font-semibold tracking-tight">Базовые настройки</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Название, описание и порядок отображения хранятся отдельно для каждого способа доставки.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <DeliveryDetailStat label="Код метода" value={deliveryMethod} />
                <DeliveryDetailStat label="Сценарий" value={getDeliveryMethodKindLabel(settingForm)} />
                <DeliveryDetailStat
                  label="Адрес"
                  value={settingForm.requiresAddress ? 'Требуется адрес клиента' : 'Адрес не обязателен'}
                />
                <DeliveryDetailStat
                  label="Пункт выдачи"
                  value={settingForm.requiresPickupPoint ? 'Нужно выбрать пункт' : 'Пункт не требуется'}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField htmlFor="delivery-method-title" label="Название">
                  <input
                    id="delivery-method-title"
                    className={nativeFieldClassName}
                    value={settingForm.title}
                    disabled={isSavingSettings}
                    onChange={(event) => {
                      setSettingForm((currentValue) => ({
                        ...currentValue,
                        title: event.target.value,
                      }));
                      setSettingsError('');
                      setSettingsSuccess('');
                    }}
                  />
                </FormField>

                <FormField htmlFor="delivery-method-sort-order" label="Порядок">
                  <input
                    id="delivery-method-sort-order"
                    type="number"
                    className={nativeFieldClassName}
                    value={settingForm.sortOrder}
                    disabled={isSavingSettings}
                    onChange={(event) => {
                      const parsedValue = Number(event.target.value);

                      setSettingForm((currentValue) => ({
                        ...currentValue,
                        sortOrder: Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : 0,
                      }));
                      setSettingsError('');
                      setSettingsSuccess('');
                    }}
                  />
                </FormField>
              </div>

              <FormField htmlFor="delivery-method-description" label="Описание">
                <DeliveryTextarea
                  id="delivery-method-description"
                  value={settingForm.description ?? ''}
                  disabled={isSavingSettings}
                  onChange={(event) => {
                    setSettingForm((currentValue) => ({
                      ...currentValue,
                      description: event.target.value,
                    }));
                    setSettingsError('');
                    setSettingsSuccess('');
                  }}
                />
              </FormField>

              <label className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-4">
                <input
                  type="checkbox"
                  className={checkboxInputClassName}
                  checked={settingForm.isActive}
                  disabled={isSavingSettings}
                  onChange={(event) => {
                    setSettingForm((currentValue) => ({
                      ...currentValue,
                      isActive: event.target.checked,
                    }));
                    setSettingsError('');
                    setSettingsSuccess('');
                  }}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">Метод доступен клиентам</span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    Отключенный метод не должен появляться в клиентском checkout.
                  </span>
                </span>
              </label>

              {settingsError ? <p className="text-sm font-medium text-destructive">{settingsError}</p> : null}
              {settingsSuccess ? <p className="text-sm font-medium text-emerald-700">{settingsSuccess}</p> : null}

              <div className="flex flex-wrap gap-3">
                <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={() => void handleSettingsSave()} disabled={isSavingSettings}>
                  {isSavingSettings ? 'Сохранение...' : 'Сохранить настройки'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="rounded-xl bg-background/80 shadow-sm"
                  onClick={() => {
                    setSettingForm(sourceSetting);
                    setSettingsError('');
                    setSettingsSuccess('');
                  }}
                  disabled={isSavingSettings || !isSettingsDirty}
                >
                  Сбросить
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-border/70 bg-card/90 py-0 shadow-[0_24px_70px_rgba(12,35,39,0.08)]">
            <CardHeader className="gap-2 border-b border-border/70 py-6">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-xl font-semibold tracking-tight">Оплата для способа</CardTitle>
                <DeliveryStatusBadge
                  active={!currentRule.isDynamic}
                  activeLabel="Настраивается вручную"
                  inactiveLabel="Вычисляется динамически"
                />
              </div>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Для статических методов выберите допустимые способы оплаты. Если правило динамическое, список доступен только для чтения.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <DeliveryDetailStat label="Метод" value={getDeliveryMethodLabel(deliveryMethod)} />
                <DeliveryDetailStat
                  label="Источник правила"
                  value={currentRule.isDynamic ? 'Динамическая логика backend' : 'Ручная конфигурация'}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {PAYMENT_METHOD_ORDER.map((paymentMethod) => {
                  const isChecked = currentRule.paymentMethods.includes(paymentMethod);

                  return (
                    <label
                      key={paymentMethod}
                      className={cn(
                        'flex items-start gap-3 rounded-[1.25rem] border px-4 py-4',
                        isChecked ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-muted/20',
                        currentRule.isDynamic && 'opacity-70',
                      )}
                    >
                      <input
                        type="checkbox"
                        className={checkboxInputClassName}
                        checked={isChecked}
                        disabled={currentRule.isDynamic || isSavingPayments}
                        onChange={() => handlePaymentRuleToggle(paymentMethod)}
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-foreground">{getPaymentMethodLabel(paymentMethod)}</span>
                        <span className="block text-xs leading-5 text-muted-foreground">
                          {currentRule.isDynamic
                            ? 'Список управляется автоматически, без ручного редактирования на этой странице.'
                            : 'Выберите, если этот способ оплаты должен быть доступен для данного метода доставки.'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {paymentsError ? <p className="text-sm font-medium text-destructive">{paymentsError}</p> : null}
              {paymentsSuccess ? <p className="text-sm font-medium text-emerald-700">{paymentsSuccess}</p> : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="rounded-xl shadow-sm"
                  onClick={() => void handlePaymentsSave()}
                  disabled={currentRule.isDynamic || isSavingPayments}
                >
                  {isSavingPayments ? 'Сохранение...' : 'Сохранить оплату'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="rounded-xl bg-background/80 shadow-sm"
                  onClick={() => {
                    setPaymentRules(clonePaymentRules(sourcePaymentRules));
                    setPaymentsError('');
                    setPaymentsSuccess('');
                  }}
                  disabled={isSavingPayments || !isPaymentsDirty}
                >
                  Сбросить
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminPage>
  );
}
