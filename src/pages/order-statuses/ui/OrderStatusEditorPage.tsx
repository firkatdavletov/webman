import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, RefreshCcwIcon } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createOrderStatusTransition,
  deactivateOrderStatusDefinition,
  deleteOrderStatusTransition,
  getOrderStatus,
  getOrderStatuses,
  getOrderStatusTransitions,
  saveOrderStatus,
  type OrderStatusDefinition,
  type OrderStatusTransition,
} from '@/entities/order-status';
import { getOrderStateTypeLabel, getUserRoleLabel } from '@/entities/order';
import { cn } from '@/shared/lib/cn';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  buttonVariants,
} from '@/shared/ui';
import {
  buildOrderStatusForm,
  createEmptyOrderStatusForm,
  createEmptyTransitionForm,
  normalizeNullableText,
  ORDER_STATE_TYPE_OPTIONS,
  parseOptionalInteger,
  sortStatuses,
  sortTransitions,
  TransitionFormValues,
  type OrderStatusFormValues,
  USER_ROLE_OPTIONS,
} from '@/pages/order-statuses/model/orderStatusPage';
import { OrderStatusTransitionsTable } from '@/pages/order-statuses/ui/OrderStatusTransitionsTable';

const SELECT_CLASSNAME =
  'h-11 w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-sm shadow-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA_CLASSNAME = cn(SELECT_CLASSNAME, 'min-h-28 resize-y py-3');
const CHECKBOX_CLASSNAME = 'mt-0.5 size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/40';

type LocationFlashState = {
  flashMessage?: string;
  initialStatus?: OrderStatusDefinition;
  initialStatuses?: OrderStatusDefinition[];
} | null;

type SummaryCardProps = {
  label: string;
  value: string;
  hint?: string;
};

type SettingsCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

type ToggleFieldProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <Card className="rounded-[1.25rem] bg-muted/15 py-0 shadow-none ring-border/70">
      <CardContent className="space-y-2 px-4 py-4">
        <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
        <p className="break-all text-sm font-medium text-foreground">{value}</p>
        {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Card className="rounded-[1.5rem] bg-muted/10 py-0 shadow-none ring-border/70">
      <CardHeader className="gap-1 border-b border-border/70 py-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-sm leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 py-4">{children}</CardContent>
    </Card>
  );
}

function ToggleField({ id, label, description, checked, disabled = false, onChange }: ToggleFieldProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3 transition-colors hover:bg-muted/30',
        disabled && 'opacity-70',
      )}
    >
      <input
        id={id}
        type="checkbox"
        className={CHECKBOX_CLASSNAME}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function OrderStatusEditorPage() {
  const { statusId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationFlashState) ?? null;
  const normalizedStatusId = useMemo(() => (statusId ?? '').trim(), [statusId]);
  const isCreateMode = !normalizedStatusId;
  const initialStatusFromNavigation =
    !isCreateMode && locationState?.initialStatus?.id === normalizedStatusId ? locationState.initialStatus : null;
  const initialStatusesFromNavigation = useMemo(
    () => (Array.isArray(locationState?.initialStatuses) ? sortStatuses(locationState.initialStatuses) : []),
    [locationState?.initialStatuses],
  );

  const [allStatuses, setAllStatuses] = useState<OrderStatusDefinition[]>(() => initialStatusesFromNavigation);
  const [currentStatus, setCurrentStatus] = useState<OrderStatusDefinition | null>(() => initialStatusFromNavigation);
  const [formValues, setFormValues] = useState<OrderStatusFormValues>(() =>
    initialStatusFromNavigation ? buildOrderStatusForm(initialStatusFromNavigation) : createEmptyOrderStatusForm(),
  );
  const [transitions, setTransitions] = useState<OrderStatusTransition[]>([]);
  const [transitionFormValues, setTransitionFormValues] = useState<TransitionFormValues>(() => createEmptyTransitionForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [transitionsErrorMessage, setTransitionsErrorMessage] = useState('');
  const [transitionErrorMessage, setTransitionErrorMessage] = useState('');
  const [transitionSuccessMessage, setTransitionSuccessMessage] = useState('');
  const [isSavingTransition, setIsSavingTransition] = useState(false);
  const [deletingTransitionId, setDeletingTransitionId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadEditorData = useCallback(async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setPageErrorMessage('');
    setTransitionsErrorMessage('');

    if (isCreateMode) {
      const statusesResult = await getOrderStatuses({
        includeInactive: true,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setAllStatuses(sortStatuses(statusesResult.statuses));
      setPageErrorMessage(statusesResult.error ?? '');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const [statusResult, statusesResult, transitionsResult] = await Promise.all([
      getOrderStatus(normalizedStatusId),
      getOrderStatuses({
        includeInactive: true,
      }),
      getOrderStatusTransitions({
        statusId: normalizedStatusId,
      }),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    const sortedStatuses = sortStatuses(statusesResult.statuses);
    const fallbackStatus = sortedStatuses.find((status) => status.id === normalizedStatusId) ?? null;
    const resolvedStatus = statusResult.status ?? fallbackStatus;

    setAllStatuses(sortedStatuses);
    setCurrentStatus(resolvedStatus);
    setFormValues(resolvedStatus ? buildOrderStatusForm(resolvedStatus) : createEmptyOrderStatusForm());
    setTransitions(sortTransitions(transitionsResult.transitions.filter((transition) => transition.fromStatus.id === normalizedStatusId)));
    setPageErrorMessage(
      [
        !resolvedStatus ? statusResult.error ?? 'Статус заказа не найден.' : '',
        statusesResult.error,
      ]
        .filter(Boolean)
        .join(' '),
    );
    setTransitionsErrorMessage(transitionsResult.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  }, [isCreateMode, normalizedStatusId]);

  useEffect(() => {
    const flashMessage = ((location.state as LocationFlashState) ?? null)?.flashMessage;

    if (!flashMessage) {
      return;
    }

    setSaveSuccess(flashMessage);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useLayoutEffect(() => {
    setAllStatuses(initialStatusesFromNavigation);
    setCurrentStatus(initialStatusFromNavigation);
    setFormValues(initialStatusFromNavigation ? buildOrderStatusForm(initialStatusFromNavigation) : createEmptyOrderStatusForm());
    setTransitions([]);
    setTransitionFormValues(createEmptyTransitionForm());
    setPageErrorMessage('');
    setSaveError('');
    setSaveSuccess('');
    setTransitionsErrorMessage('');
    setTransitionErrorMessage('');
    setTransitionSuccessMessage('');
    setDeletingTransitionId(null);
    setIsLoading(true);
    setIsRefreshing(false);
    setIsSaving(false);
    setIsSavingTransition(false);

    void loadEditorData({
      showInitialLoader: true,
    });
  }, [initialStatusFromNavigation, initialStatusesFromNavigation, isCreateMode, loadEditorData, normalizedStatusId]);

  const selectedStatusId = currentStatus?.id ?? normalizedStatusId;
  const availableTransitionTargets = useMemo(() => {
    const existingTargetIds = new Set(transitions.map((transition) => transition.toStatus.id));

    return sortStatuses(
      allStatuses.filter((status) => status.isActive && status.id !== selectedStatusId && !existingTargetIds.has(status.id)),
    );
  }, [allStatuses, selectedStatusId, transitions]);

  useEffect(() => {
    if (!transitionFormValues.toStatusId) {
      return;
    }

    const hasSelectedTarget = availableTransitionTargets.some((status) => status.id === transitionFormValues.toStatusId);

    if (hasSelectedTarget) {
      return;
    }

    setTransitionFormValues((currentValues) => ({
      ...currentValues,
      toStatusId: '',
    }));
  }, [availableTransitionTargets, transitionFormValues.toStatusId]);

  const resetSaveFeedback = () => {
    if (saveError) {
      setSaveError('');
    }

    if (saveSuccess) {
      setSaveSuccess('');
    }
  };

  const resetTransitionFeedback = () => {
    if (transitionErrorMessage) {
      setTransitionErrorMessage('');
    }

    if (transitionSuccessMessage) {
      setTransitionSuccessMessage('');
    }
  };

  const updateFormValue = <K extends keyof OrderStatusFormValues>(field: K, value: OrderStatusFormValues[K]) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    resetSaveFeedback();
  };

  const updateTransitionFormValue = <K extends keyof TransitionFormValues>(field: K, value: TransitionFormValues[K]) => {
    setTransitionFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    resetTransitionFeedback();
  };

  const handleSave = async () => {
    const normalizedCode = formValues.code.trim();
    const normalizedName = formValues.name.trim();

    if (!normalizedCode) {
      setSaveError('Укажите код статуса.');
      return;
    }

    if (!normalizedName) {
      setSaveError('Укажите название статуса.');
      return;
    }

    const parsedSortOrder = parseOptionalInteger(formValues.sortOrder, 'Порядок сортировки');

    if (parsedSortOrder.error) {
      setSaveError(parsedSortOrder.error);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await saveOrderStatus({
      id: isCreateMode ? undefined : formValues.id || undefined,
      code: normalizedCode,
      name: normalizedName,
      description: normalizeNullableText(formValues.description),
      stateType: formValues.stateType,
      color: normalizeNullableText(formValues.color),
      icon: normalizeNullableText(formValues.icon),
      isInitial: formValues.isInitial,
      isFinal: formValues.isFinal,
      isCancellable: formValues.isCancellable,
      isActive: formValues.isActive,
      visibleToCustomer: formValues.visibleToCustomer,
      notifyCustomer: formValues.notifyCustomer,
      notifyStaff: formValues.notifyStaff,
      sortOrder: parsedSortOrder.value,
    });

    if (!result.status) {
      setSaveError(result.error ?? 'Не удалось сохранить статус заказа.');
      setIsSaving(false);
      return;
    }

    setIsSaving(false);

    if (isCreateMode) {
      navigate(`/order-statuses/${result.status.id}`, {
        replace: true,
        state: {
          flashMessage: 'Статус заказа создан. Теперь можно настроить переходы.',
        },
      });
      return;
    }

    setCurrentStatus(result.status);
    setFormValues(buildOrderStatusForm(result.status));
    setSaveSuccess('Изменения сохранены.');
    await loadEditorData();
  };

  const handleDeactivate = async () => {
    if (!currentStatus) {
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await deactivateOrderStatusDefinition(currentStatus.id);

    if (!result.status) {
      setSaveError(result.error ?? 'Не удалось деактивировать статус заказа.');
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setSaveSuccess('Статус деактивирован.');
    await loadEditorData();
  };

  const handleCreateTransition = async () => {
    if (!currentStatus) {
      setTransitionErrorMessage('Сначала сохраните статус, чтобы добавить переход.');
      return;
    }

    if (!transitionFormValues.toStatusId) {
      setTransitionErrorMessage('Укажите целевой статус перехода.');
      return;
    }

    setIsSavingTransition(true);
    setTransitionErrorMessage('');
    setTransitionSuccessMessage('');

    const result = await createOrderStatusTransition({
      fromStatusId: currentStatus.id,
      toStatusId: transitionFormValues.toStatusId,
      requiredRole: transitionFormValues.requiredRole || undefined,
      guardCode: normalizeNullableText(transitionFormValues.guardCode),
      isAutomatic: transitionFormValues.isAutomatic,
      isActive: transitionFormValues.isActive,
    });

    if (!result.transition) {
      setTransitionErrorMessage(result.error ?? 'Не удалось создать переход статуса.');
      setIsSavingTransition(false);
      return;
    }

    setTransitionFormValues(createEmptyTransitionForm());
    setTransitionSuccessMessage('Переход добавлен.');
    setIsSavingTransition(false);
    await loadEditorData();
  };

  const handleDeleteTransition = async (transitionId: string) => {
    setDeletingTransitionId(transitionId);
    setTransitionErrorMessage('');
    setTransitionSuccessMessage('');

    const result = await deleteOrderStatusTransition(transitionId);

    if (result.error) {
      setTransitionErrorMessage(result.error);
      setDeletingTransitionId(null);
      return;
    }

    setTransitionSuccessMessage('Переход удалён.');
    setDeletingTransitionId(null);
    await loadEditorData();
  };

  const title = isCreateMode ? 'Новый статус заказа' : currentStatus?.name.trim() || 'Статус заказа';
  const headerDescription = isCreateMode
    ? 'Создайте новый статус, а затем на том же экране настройте разрешённые переходы.'
    : 'Редактируйте параметры статуса и управляйте переходами, доступными из него.';
  const headerStatusText = isLoading
    ? 'Загрузка...'
    : isCreateMode
      ? `Создание нового статуса • доступно ${allStatuses.length} записей`
      : currentStatus
        ? `${currentStatus.isActive ? 'Активен' : 'Неактивен'} • переходов ${transitions.length}`
        : 'Статус не найден';

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Справочники"
        title={title}
        description={headerDescription}
        actions={
          <>
            <AdminPageStatus>{headerStatusText}</AdminPageStatus>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/order-statuses">
              <ArrowLeftIcon className="size-4" />
              К списку статусов
            </Link>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-xl bg-card/80 shadow-sm"
              onClick={() => void loadEditorData()}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCcwIcon className={cn('size-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
            {!isCreateMode && currentStatus?.isActive ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="rounded-xl"
                onClick={() => void handleDeactivate()}
                disabled={isSaving}
              >
                {isSaving ? 'Деактивация...' : 'Деактивировать'}
              </Button>
            ) : null}
          </>
        }
      />

      <AdminSectionCard
        aria-label="Параметры статуса заказа"
        eyebrow={isCreateMode ? 'Create' : 'Edit'}
        title="Параметры статуса"
        description="Редактируйте атрибуты статуса как отдельную карточку, без отвлекающей таблицы на том же экране."
      >
        {pageErrorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {pageErrorMessage}
          </AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState title="Загрузка статуса" description="Получаем статус заказа, справочник и связанные переходы." />
        ) : !isCreateMode && !currentStatus ? (
          <AdminEmptyState
            tone="destructive"
            title="Статус не открыт"
            description="Проверьте идентификатор в URL или вернитесь к списку статусов и откройте запись заново."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Идентификатор"
                value={isCreateMode ? 'Будет назначен после сохранения' : currentStatus?.id ?? 'Не найден'}
                hint={isCreateMode ? 'UUID присвоит backend после создания.' : 'Используется в API и настройке переходов.'}
              />
              <SummaryCard
                label="API"
                value={isCreateMode ? 'POST /api/v1/admin/order-statuses' : `PUT /api/v1/admin/order-statuses/${currentStatus?.id ?? '{statusId}'}`}
                hint="Удаление выполняется отдельным endpoint деактивации."
              />
              <SummaryCard
                label="Состояние"
                value={getOrderStateTypeLabel(formValues.stateType)}
                hint="Именно оно влияет на общий tone статуса в интерфейсах заказа."
              />
              <SummaryCard
                label="Переходы"
                value={isCreateMode ? 'Будут доступны после создания' : `${transitions.length} настроено`}
                hint={isCreateMode ? 'Сначала сохраните карточку статуса.' : 'Переходы редактируются в следующей секции.'}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                htmlFor="order-status-code"
                label="Код"
                description="Используется в API, логах и внутренних правилах переходов."
              >
                <Input
                  id="order-status-code"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  placeholder="pending_confirmation"
                  value={formValues.code}
                  onChange={(event) => updateFormValue('code', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="order-status-name" label="Название" description="Человекочитаемая подпись для менеджеров и клиентов.">
                <Input
                  id="order-status-name"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  placeholder="Ожидает подтверждения"
                  value={formValues.name}
                  onChange={(event) => updateFormValue('name', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="order-status-state-type" label="Тип состояния" description="Определяет общий бизнес-сценарий статуса.">
                <select
                  id="order-status-state-type"
                  className={SELECT_CLASSNAME}
                  value={formValues.stateType}
                  onChange={(event) => updateFormValue('stateType', event.target.value as OrderStatusDefinition['stateType'])}
                >
                  {ORDER_STATE_TYPE_OPTIONS.map((stateType) => (
                    <option key={stateType} value={stateType}>
                      {getOrderStateTypeLabel(stateType)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField htmlFor="order-status-sort-order" label="Порядок сортировки" description="Чем меньше число, тем выше запись в списках.">
                <Input
                  id="order-status-sort-order"
                  inputMode="numeric"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  placeholder="0"
                  value={formValues.sortOrder}
                  onChange={(event) => updateFormValue('sortOrder', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="order-status-color" label="Цвет" description="Служебное поле для цветового токена или HEX, если backend это использует.">
                <Input
                  id="order-status-color"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  placeholder="#11756c"
                  value={formValues.color}
                  onChange={(event) => updateFormValue('color', event.target.value)}
                />
              </FormField>

              <FormField htmlFor="order-status-icon" label="Иконка" description="Идентификатор иконки, если он обрабатывается на стороне клиента или backend.">
                <Input
                  id="order-status-icon"
                  className="h-11 rounded-xl bg-background/80 shadow-sm"
                  placeholder="clock"
                  value={formValues.icon}
                  onChange={(event) => updateFormValue('icon', event.target.value)}
                />
              </FormField>
            </div>

            <FormField
              htmlFor="order-status-description"
              label="Описание"
              description="Короткое пояснение, когда этот статус должен использоваться и чем он отличается от соседних."
            >
              <textarea
                id="order-status-description"
                className={TEXTAREA_CLASSNAME}
                placeholder="Например: заказ принят, но менеджер ещё не подтвердил наличие и время доставки."
                value={formValues.description}
                onChange={(event) => updateFormValue('description', event.target.value)}
              />
            </FormField>

            <div className="grid gap-4 xl:grid-cols-3">
              <SettingsCard
                title="Поведение"
                description="Как статус участвует в общей логике жизненного цикла заказа."
              >
                <ToggleField
                  id="order-status-is-active"
                  label="Статус активен"
                  description="Неактивный статус останется в истории и списках, но не должен использоваться в новых сценариях."
                  checked={formValues.isActive}
                  onChange={(checked) => updateFormValue('isActive', checked)}
                />
                <ToggleField
                  id="order-status-is-initial"
                  label="Начальный статус"
                  description="Используйте для записи, которая назначается заказу сразу после создания."
                  checked={formValues.isInitial}
                  onChange={(checked) => updateFormValue('isInitial', checked)}
                />
                <ToggleField
                  id="order-status-is-final"
                  label="Финальный статус"
                  description="Показывает, что после этого статуса жизненный цикл заказа обычно завершается."
                  checked={formValues.isFinal}
                  onChange={(checked) => updateFormValue('isFinal', checked)}
                />
                <ToggleField
                  id="order-status-is-cancellable"
                  label="Разрешает отмену"
                  description="Помогает быстро понять, допустим ли отказ заказа на этом этапе."
                  checked={formValues.isCancellable}
                  onChange={(checked) => updateFormValue('isCancellable', checked)}
                />
              </SettingsCard>

              <SettingsCard
                title="Видимость"
                description="Что из этого статуса должно быть видно клиенту и внешним каналам."
              >
                <ToggleField
                  id="order-status-visible-to-customer"
                  label="Показывать клиенту"
                  description="Если выключить, статус останется внутренним и не должен уходить во внешние интерфейсы."
                  checked={formValues.visibleToCustomer}
                  onChange={(checked) => updateFormValue('visibleToCustomer', checked)}
                />
              </SettingsCard>

              <SettingsCard
                title="Уведомления"
                description="Кого нужно уведомлять при переходе заказа в этот статус."
              >
                <ToggleField
                  id="order-status-notify-customer"
                  label="Уведомлять клиента"
                  description="Используйте только для статусов, которые клиент действительно должен видеть и получать по каналам доставки уведомлений."
                  checked={formValues.notifyCustomer}
                  onChange={(checked) => updateFormValue('notifyCustomer', checked)}
                />
                <ToggleField
                  id="order-status-notify-staff"
                  label="Уведомлять сотрудников"
                  description="Оставьте включённым, если статус важен для операционной команды и мониторинга."
                  checked={formValues.notifyStaff}
                  onChange={(checked) => updateFormValue('notifyStaff', checked)}
                />
              </SettingsCard>
            </div>

            {saveError ? (
              <AdminNotice tone="destructive" role="alert">
                {saveError}
              </AdminNotice>
            ) : null}

            {saveSuccess ? <AdminNotice role="status">{saveSuccess}</AdminNotice> : null}

            <div className="flex flex-wrap gap-3">
              <Button type="button" size="lg" className="rounded-xl shadow-sm" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? 'Сохранение...' : isCreateMode ? 'Создать статус' : 'Сохранить изменения'}
              </Button>
              <Link className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-xl bg-card/80 shadow-sm')} to="/order-statuses">
                Отменить и вернуться к списку
              </Link>
            </div>
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        aria-label="Переходы статуса заказа"
        eyebrow="Transitions"
        title="Переходы статуса"
        description="Все разрешённые переходы из текущего статуса настраиваются здесь же, чтобы не прыгать между экранами."
        action={!isCreateMode && currentStatus ? <AdminPageStatus>{transitions.length} переходов</AdminPageStatus> : null}
      >
        {isLoading ? (
          <AdminEmptyState title="Загрузка переходов" description="Получаем связанные переходы статуса и доступные цели." />
        ) : isCreateMode ? (
          <AdminEmptyState
            title="Сначала сохраните статус"
            description="После создания карточки на этом же экране появится форма настройки переходов."
          />
        ) : !currentStatus ? (
          <AdminEmptyState
            tone="destructive"
            title="Переходы недоступны"
            description="Статус не открыт, поэтому настроить переходы сейчас невозможно."
          />
        ) : (
          <div className="space-y-6">
            {transitionsErrorMessage ? (
              <AdminNotice tone="destructive" role="alert">
                {transitionsErrorMessage}
              </AdminNotice>
            ) : null}

            <Card className="rounded-[1.5rem] bg-muted/10 py-0 shadow-none ring-border/70">
              <CardHeader className="gap-1 border-b border-border/70 py-4">
                <CardTitle className="text-base font-semibold">Добавить переход</CardTitle>
                <CardDescription className="text-sm leading-6">
                  Целевой статус и ограничения задаются прямо здесь. Уже существующие цели из списка исключены.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 py-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField
                    htmlFor="order-status-transition-target"
                    label="Целевой статус"
                    description={
                      availableTransitionTargets.length
                        ? 'Показываются только активные статусы, ещё не связанные переходом.'
                        : 'Свободных активных статусов для нового перехода не осталось.'
                    }
                  >
                    <select
                      id="order-status-transition-target"
                      className={SELECT_CLASSNAME}
                      value={transitionFormValues.toStatusId}
                      onChange={(event) => updateTransitionFormValue('toStatusId', event.target.value)}
                      disabled={!availableTransitionTargets.length}
                    >
                      <option value="">Выберите статус</option>
                      {availableTransitionTargets.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name} • {status.code}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    htmlFor="order-status-transition-role"
                    label="Ограничение по роли"
                    description="Если не указано, переход доступен без дополнительной role-based проверки."
                  >
                    <select
                      id="order-status-transition-role"
                      className={SELECT_CLASSNAME}
                      value={transitionFormValues.requiredRole}
                      onChange={(event) =>
                        updateTransitionFormValue('requiredRole', event.target.value as TransitionFormValues['requiredRole'])
                      }
                    >
                      <option value="">Без ограничения</option>
                      {USER_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {getUserRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    htmlFor="order-status-transition-guard"
                    label="Guard code"
                    description="Служебный код дополнительной проверки, если он используется логикой backend."
                  >
                    <Input
                      id="order-status-transition-guard"
                      className="h-11 rounded-xl bg-background/80 shadow-sm"
                      placeholder="payment_received"
                      value={transitionFormValues.guardCode}
                      onChange={(event) => updateTransitionFormValue('guardCode', event.target.value)}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleField
                    id="order-status-transition-is-automatic"
                    label="Автоматический переход"
                    description="Используйте для системных переходов, которые не должны зависеть от ручного действия менеджера."
                    checked={transitionFormValues.isAutomatic}
                    onChange={(checked) => updateTransitionFormValue('isAutomatic', checked)}
                  />
                  <ToggleField
                    id="order-status-transition-is-active"
                    label="Переход активен"
                    description="Позволяет временно выключить переход без удаления записи, если backend это поддерживает."
                    checked={transitionFormValues.isActive}
                    onChange={(checked) => updateTransitionFormValue('isActive', checked)}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    className="rounded-xl shadow-sm"
                    onClick={() => void handleCreateTransition()}
                    disabled={isSavingTransition || !availableTransitionTargets.length}
                  >
                    {isSavingTransition ? 'Сохранение...' : 'Добавить переход'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {transitionErrorMessage ? (
              <AdminNotice tone="destructive" role="alert">
                {transitionErrorMessage}
              </AdminNotice>
            ) : null}

            {transitionSuccessMessage ? <AdminNotice role="status">{transitionSuccessMessage}</AdminNotice> : null}

            {transitions.length ? (
              <OrderStatusTransitionsTable
                transitions={transitions}
                deletingTransitionId={deletingTransitionId}
                onDeleteTransition={(transitionId) => void handleDeleteTransition(transitionId)}
              />
            ) : (
              <AdminEmptyState
                title="Переходы ещё не настроены"
                description="Добавьте хотя бы один разрешённый переход, чтобы статус можно было использовать в рабочем процессе."
              />
            )}
          </div>
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
