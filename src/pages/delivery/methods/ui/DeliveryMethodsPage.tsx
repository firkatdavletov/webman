import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getCheckoutPaymentRules,
  getDeliveryMethodSettings,
  type CheckoutPaymentRule,
  type DeliveryMethodSetting,
} from '@/entities/delivery';
import {
  getDeliveryMethodKindLabel,
  getPaymentRuleSummary,
  sortCheckoutPaymentRules,
  sortDeliveryMethodSettings,
} from '@/pages/delivery/model/deliveryAdmin';
import { DeliveryListItemLink, DeliveryStatusBadge } from '@/pages/delivery/ui/deliveryShared';
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
  SegmentedControl,
} from '@/shared/ui';
import { SearchIcon } from 'lucide-react';

export function DeliveryMethodsPage() {
  const [methods, setMethods] = useState<DeliveryMethodSetting[]>([]);
  const [paymentRules, setPaymentRules] = useState<CheckoutPaymentRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadMethods = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const [methodsResult, paymentRulesResult] = await Promise.all([getDeliveryMethodSettings(), getCheckoutPaymentRules()]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    setMethods(sortDeliveryMethodSettings(methodsResult.settings));
    setPaymentRules(sortCheckoutPaymentRules(paymentRulesResult.rules));
    setErrorMessage([methodsResult.error, paymentRulesResult.error].filter(Boolean).join(' '));
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadMethods({
      showInitialLoader: true,
    });
  }, []);

  const activeCount = useMemo(() => methods.filter((method) => method.isActive).length, [methods]);
  const visibleMethods = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return methods.filter((method) => {
      if (!includeInactive && !method.isActive) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchFields = [
        method.title,
        method.description ?? '',
        method.method,
        getDeliveryMethodKindLabel(method),
      ]
        .join(' ')
        .toLowerCase();

      return searchFields.includes(normalizedQuery);
    });
  }, [includeInactive, methods, searchQuery]);

  const statusText = isLoading
    ? 'Загрузка способов доставки...'
    : `${visibleMethods.length} из ${methods.length} способов • активных ${activeCount}`;

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Доставка"
        title="Способы доставки"
        description="Утилитарный список способов доставки. Клик по элементу открывает детальную карточку с базовыми настройками и конфигурацией оплаты."
        actions={
          <>
            <AdminPageStatus>{statusText}</AdminPageStatus>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadMethods()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard
        eyebrow="Операционный список"
        title="Доступные способы"
        description="Список остаётся компактным: редактирование перенесено в detail-screen, чтобы не смешивать настройки нескольких способов на одной странице."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(18rem,22rem)] xl:items-end xl:justify-between">
            <SegmentedControl
              ariaLabel="Фильтр активности способов доставки"
              onValueChange={setIncludeInactive}
              options={[
                { label: 'Активные', value: false, hint: activeCount },
                { label: 'Все', value: true, hint: methods.length },
              ]}
              value={includeInactive}
            />

            <FormField htmlFor="delivery-methods-search" label="Поиск по способам">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="delivery-methods-search"
                  type="search"
                  className="h-11 rounded-xl bg-background/80 pl-10 shadow-sm"
                  placeholder="Название, описание, тип или сценарий"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </FormField>
          </div>

          {errorMessage ? (
            <AdminNotice tone="destructive" role="alert">
              {errorMessage}
            </AdminNotice>
          ) : null}

          {isLoading ? (
            <AdminEmptyState title="Загрузка способов" description="Получаем настройки delivery methods и актуальные правила оплаты." />
          ) : visibleMethods.length ? (
            <div className="space-y-4">
              {visibleMethods.map((method) => {
                const rule = paymentRules.find((item) => item.deliveryMethod === method.method);

                return (
                  <DeliveryListItemLink
                    key={method.method}
                    to={`/delivery/methods/${method.method}`}
                    eyebrow={method.method}
                    title={method.title}
                    description={method.description?.trim() || 'Описание не задано.'}
                    status={<DeliveryStatusBadge active={method.isActive} activeLabel="Активен" inactiveLabel="Отключен" />}
                    badges={
                      <>
                        <DeliveryStatusBadge
                          active={method.requiresAddress}
                          activeLabel="Нужен адрес"
                          inactiveLabel="Без адреса"
                        />
                        <DeliveryStatusBadge
                          active={method.requiresPickupPoint}
                          activeLabel="Нужен пункт"
                          inactiveLabel="Без пункта"
                        />
                      </>
                    }
                    meta={[
                      { label: 'Сценарий', value: getDeliveryMethodKindLabel(method) },
                      { label: 'Сортировка', value: method.sortOrder },
                      { label: 'Оплата', value: getPaymentRuleSummary(rule) },
                    ]}
                  />
                );
              })}
            </div>
          ) : (
            <AdminEmptyState
              title={methods.length ? 'Способы не найдены' : 'Справочник пуст'}
              description={
                methods.length
                  ? 'Сбросьте поисковый запрос или переключите фильтр активности.'
                  : 'Backend не вернул ни одного способа доставки.'
              }
            />
          )}
        </div>
      </AdminSectionCard>
    </AdminPage>
  );
}
