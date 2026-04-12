import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createOrderStatusTransition,
  deactivateOrderStatusDefinition,
  deleteOrderStatusTransition,
  getOrderStatuses,
  getOrderStatusTransitions,
  saveOrderStatus,
  type OrderStateType,
  type OrderStatusDefinition,
  type OrderStatusTransition,
  type UserRole,
} from '@/entities/order-status';
import {
  getOrderStateTypeLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  getUserRoleLabel,
} from '@/entities/order';

const ORDER_STATE_TYPE_OPTIONS: OrderStateType[] = [
  'CREATED',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELED',
  'ON_HOLD',
];

const USER_ROLE_OPTIONS: UserRole[] = ['CUSTOMER', 'WHOLESALE', 'MANAGER', 'ADMIN'];

type OrderStatusFormValues = {
  id: string;
  code: string;
  name: string;
  description: string;
  stateType: OrderStateType;
  color: string;
  icon: string;
  isInitial: boolean;
  isFinal: boolean;
  isCancellable: boolean;
  isActive: boolean;
  visibleToCustomer: boolean;
  notifyCustomer: boolean;
  notifyStaff: boolean;
  sortOrder: string;
};

type TransitionFormValues = {
  toStatusId: string;
  requiredRole: '' | UserRole;
  guardCode: string;
  isAutomatic: boolean;
  isActive: boolean;
};

function createEmptyOrderStatusForm(): OrderStatusFormValues {
  return {
    id: '',
    code: '',
    name: '',
    description: '',
    stateType: 'CREATED',
    color: '',
    icon: '',
    isInitial: false,
    isFinal: false,
    isCancellable: false,
    isActive: true,
    visibleToCustomer: true,
    notifyCustomer: false,
    notifyStaff: true,
    sortOrder: '0',
  };
}

function buildOrderStatusForm(status: OrderStatusDefinition): OrderStatusFormValues {
  return {
    id: status.id,
    code: status.code,
    name: status.name,
    description: status.description ?? '',
    stateType: status.stateType,
    color: status.color ?? '',
    icon: status.icon ?? '',
    isInitial: status.isInitial,
    isFinal: status.isFinal,
    isCancellable: status.isCancellable,
    isActive: status.isActive,
    visibleToCustomer: status.visibleToCustomer,
    notifyCustomer: status.notifyCustomer,
    notifyStaff: status.notifyStaff,
    sortOrder: String(status.sortOrder),
  };
}

function createEmptyTransitionForm(): TransitionFormValues {
  return {
    toStatusId: '',
    requiredRole: '',
    guardCode: '',
    isAutomatic: false,
    isActive: true,
  };
}

function sortStatuses(statuses: OrderStatusDefinition[]): OrderStatusDefinition[] {
  return [...statuses].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name, 'ru') ||
      left.code.localeCompare(right.code, 'ru'),
  );
}

function sortTransitions(transitions: OrderStatusTransition[]): OrderStatusTransition[] {
  return [...transitions].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      Number(left.isAutomatic) - Number(right.isAutomatic) ||
      left.toStatus.name.localeCompare(right.toStatus.name, 'ru'),
  );
}

function normalizeNullableText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function parseOptionalInteger(value: string, label: string): { value: number | undefined; error: string | null } {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      value: undefined,
      error: null,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue)) {
    return {
      value: undefined,
      error: `Поле «${label}» должно быть целым числом.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}

export function OrderStatusesPage() {
  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<OrderStatusFormValues>(() => createEmptyOrderStatusForm());
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [transitions, setTransitions] = useState<OrderStatusTransition[]>([]);
  const [isTransitionsLoading, setIsTransitionsLoading] = useState(false);
  const [transitionsErrorMessage, setTransitionsErrorMessage] = useState('');
  const [transitionFormValues, setTransitionFormValues] = useState<TransitionFormValues>(() => createEmptyTransitionForm());
  const [transitionErrorMessage, setTransitionErrorMessage] = useState('');
  const [transitionSuccessMessage, setTransitionSuccessMessage] = useState('');
  const [isSavingTransition, setIsSavingTransition] = useState(false);
  const [deletingTransitionId, setDeletingTransitionId] = useState<string | null>(null);

  const statusesRequestIdRef = useRef(0);
  const transitionsRequestIdRef = useRef(0);

  const selectedStatus = useMemo(
    () => (selectedStatusId ? statuses.find((status) => status.id === selectedStatusId) ?? null : null),
    [selectedStatusId, statuses],
  );

  const activeStatuses = useMemo(() => statuses.filter((status) => status.isActive), [statuses]);

  const availableTransitionTargets = useMemo(
    () =>
      activeStatuses
        .filter((status) => status.id !== selectedStatusId)
        .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    [activeStatuses, selectedStatusId],
  );

  const activeCount = statuses.filter((status) => status.isActive).length;
  const inactiveCount = statuses.length - activeCount;

  const loadStatusesData = async (showInitialLoader = false) => {
    const requestId = statusesRequestIdRef.current + 1;
    statusesRequestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getOrderStatuses({
      includeInactive,
    });

    if (requestId !== statusesRequestIdRef.current) {
      return;
    }

    setStatuses(sortStatuses(result.statuses));
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  const loadTransitionsData = async (statusId: string) => {
    const requestId = transitionsRequestIdRef.current + 1;
    transitionsRequestIdRef.current = requestId;

    setIsTransitionsLoading(true);
    setTransitionsErrorMessage('');

    const result = await getOrderStatusTransitions({
      statusId,
    });

    if (requestId !== transitionsRequestIdRef.current) {
      return;
    }

    setTransitions(sortTransitions(result.transitions.filter((transition) => transition.fromStatus.id === statusId)));
    setTransitionsErrorMessage(result.error ?? '');
    setIsTransitionsLoading(false);
  };

  useEffect(() => {
    void loadStatusesData(true);
  }, [includeInactive]);

  useEffect(() => {
    if (isCreateMode) {
      return;
    }

    const nextSelectedStatus = selectedStatusId
      ? statuses.find((status) => status.id === selectedStatusId) ?? null
      : statuses[0] ?? null;

    if (!nextSelectedStatus) {
      setSelectedStatusId(null);
      setFormValues(createEmptyOrderStatusForm());
      return;
    }

    if (nextSelectedStatus.id !== selectedStatusId) {
      setSelectedStatusId(nextSelectedStatus.id);
    }

    setFormValues(buildOrderStatusForm(nextSelectedStatus));
  }, [isCreateMode, selectedStatusId, statuses]);

  useEffect(() => {
    if (isCreateMode || !selectedStatusId) {
      transitionsRequestIdRef.current += 1;
      setIsTransitionsLoading(false);
      setTransitions([]);
      setTransitionsErrorMessage('');
      return;
    }

    void loadTransitionsData(selectedStatusId);
  }, [isCreateMode, selectedStatusId]);

  const resetFormStatus = () => {
    setFormErrorMessage('');
    setFormSuccessMessage('');
  };

  const resetTransitionStatus = () => {
    setTransitionErrorMessage('');
    setTransitionSuccessMessage('');
  };

  const handleStartCreate = () => {
    setIsCreateMode(true);
    setSelectedStatusId(null);
    setFormValues(createEmptyOrderStatusForm());
    resetFormStatus();
    setTransitions([]);
    setTransitionFormValues(createEmptyTransitionForm());
    resetTransitionStatus();
  };

  const handleSelectStatus = (status: OrderStatusDefinition) => {
    setIsCreateMode(false);
    setSelectedStatusId(status.id);
    setFormValues(buildOrderStatusForm(status));
    resetFormStatus();
    resetTransitionStatus();
  };

  const handleSaveStatus = async () => {
    const normalizedCode = formValues.code.trim();
    const normalizedName = formValues.name.trim();

    if (!normalizedCode) {
      setFormErrorMessage('Укажите код статуса.');
      return;
    }

    if (!normalizedName) {
      setFormErrorMessage('Укажите название статуса.');
      return;
    }

    const parsedSortOrder = parseOptionalInteger(formValues.sortOrder, 'Порядок сортировки');

    if (parsedSortOrder.error) {
      setFormErrorMessage(parsedSortOrder.error);
      return;
    }

    setIsSaving(true);
    resetFormStatus();

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
      setFormErrorMessage(result.error ?? 'Не удалось сохранить статус заказа.');
      setIsSaving(false);
      return;
    }

    setIsCreateMode(false);
    setSelectedStatusId(result.status.id);
    setFormValues(buildOrderStatusForm(result.status));
    setFormSuccessMessage(isCreateMode ? 'Статус заказа создан.' : 'Статус заказа обновлен.');
    setIsSaving(false);

    await loadStatusesData();
    await loadTransitionsData(result.status.id);
  };

  const handleDeactivateStatus = async () => {
    if (!selectedStatus) {
      return;
    }

    setIsSaving(true);
    resetFormStatus();

    const result = await deactivateOrderStatusDefinition(selectedStatus.id);

    if (!result.status) {
      setFormErrorMessage(result.error ?? 'Не удалось деактивировать статус заказа.');
      setIsSaving(false);
      return;
    }

    setFormSuccessMessage('Статус заказа деактивирован.');
    setIsSaving(false);

    await loadStatusesData();
  };

  const handleCreateTransition = async () => {
    if (!selectedStatusId) {
      setTransitionErrorMessage('Сначала выберите статус, для которого создается переход.');
      return;
    }

    if (!transitionFormValues.toStatusId) {
      setTransitionErrorMessage('Укажите целевой статус перехода.');
      return;
    }

    setIsSavingTransition(true);
    resetTransitionStatus();

    const result = await createOrderStatusTransition({
      fromStatusId: selectedStatusId,
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
    setTransitionSuccessMessage('Переход статуса создан.');
    setIsSavingTransition(false);

    await loadTransitionsData(selectedStatusId);
  };

  const handleDeleteTransition = async (transitionId: string) => {
    if (!selectedStatusId) {
      return;
    }

    setDeletingTransitionId(transitionId);
    resetTransitionStatus();

    const result = await deleteOrderStatusTransition(transitionId);

    if (result.error) {
      setTransitionErrorMessage(result.error);
      setDeletingTransitionId(null);
      return;
    }

    setTransitionSuccessMessage('Переход статуса удален.');
    setDeletingTransitionId(null);

    await loadTransitionsData(selectedStatusId);
  };

  return (
    <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Справочники</p>
            <h2 className="page-title">Статусы заказов</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">
              {isLoading ? 'Загрузка статусов...' : `Активных: ${activeCount} • Неактивных: ${inactiveCount}`}
            </span>
            <button type="button" className="secondary-button" onClick={handleStartCreate}>
              Новый статус
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadStatusesData()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <div className="order-statuses-layout">
          <section className="catalog-card catalog-data-card" aria-label="Список статусов заказов">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Directory</p>
              <h3 className="catalog-card-title">Справочник статусов</h3>
            </div>

            <div className="order-statuses-toolbar">
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                <span className="field-label">Показывать неактивные статусы</span>
              </label>
            </div>

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {isLoading ? (
              <p className="catalog-empty-state">Загрузка статусов заказов...</p>
            ) : statuses.length ? (
              <div className="order-status-list">
                {statuses.map((status) => {
                  const isSelected = !isCreateMode && selectedStatusId === status.id;

                  return (
                    <button
                      key={status.id}
                      type="button"
                      className={`order-status-list-item${isSelected ? ' order-status-list-item-active' : ''}`}
                      onClick={() => handleSelectStatus(status)}
                    >
                      <div className="order-status-list-item-head">
                        <span className={`order-pill order-pill-${getOrderStatusTone(status)}`}>{getOrderStatusLabel(status)}</span>
                        {!status.isActive ? <span className="order-pill order-pill-neutral">Неактивен</span> : null}
                      </div>

                      <p className="orders-cell-title">{status.code}</p>
                      <p className="orders-cell-meta">{getOrderStateTypeLabel(status.stateType)}</p>

                      {status.description?.trim() ? (
                        <p className="orders-cell-meta">{status.description.trim()}</p>
                      ) : (
                        <p className="orders-cell-meta">Описание не задано.</p>
                      )}

                      <p className="orders-cell-meta">
                        sort: {status.sortOrder}
                        {status.isInitial ? ' • начальный' : ''}
                        {status.isFinal ? ' • финальный' : ''}
                        {status.isCancellable ? ' • отменяемый' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="catalog-empty-state">Справочник статусов пока пуст.</p>
            )}
          </section>

          <section className="catalog-card catalog-data-card" aria-label="Редактор статуса заказа">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">{isCreateMode ? 'Create' : 'Edit'}</p>
              <h3 className="catalog-card-title">{isCreateMode ? 'Новый статус заказа' : 'Редактирование статуса'}</h3>
            </div>

            <div className="order-status-form-grid">
              <div className="field">
                <label className="field-label" htmlFor="order-status-code">
                  Код
                </label>
                <input
                  id="order-status-code"
                  className="field-input"
                  value={formValues.code}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      code: event.target.value,
                    }));
                    resetFormStatus();
                  }}
                  placeholder="pending_confirmation"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="order-status-name">
                  Название
                </label>
                <input
                  id="order-status-name"
                  className="field-input"
                  value={formValues.name}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      name: event.target.value,
                    }));
                    resetFormStatus();
                  }}
                  placeholder="Ожидает подтверждения"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="order-status-state-type">
                  Состояние
                </label>
                <select
                  id="order-status-state-type"
                  className="field-input"
                  value={formValues.stateType}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      stateType: event.target.value as OrderStateType,
                    }));
                    resetFormStatus();
                  }}
                >
                  {ORDER_STATE_TYPE_OPTIONS.map((stateType) => (
                    <option key={stateType} value={stateType}>
                      {getOrderStateTypeLabel(stateType)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="order-status-sort-order">
                  Порядок сортировки
                </label>
                <input
                  id="order-status-sort-order"
                  className="field-input"
                  value={formValues.sortOrder}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      sortOrder: event.target.value,
                    }));
                    resetFormStatus();
                  }}
                  inputMode="numeric"
                  placeholder="0"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="order-status-color">
                  Цвет
                </label>
                <input
                  id="order-status-color"
                  className="field-input"
                  value={formValues.color}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      color: event.target.value,
                    }));
                    resetFormStatus();
                  }}
                  placeholder="#11756c"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="order-status-icon">
                  Иконка
                </label>
                <input
                  id="order-status-icon"
                  className="field-input"
                  value={formValues.icon}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      icon: event.target.value,
                    }));
                    resetFormStatus();
                  }}
                  placeholder="clock"
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="order-status-description">
                Описание
              </label>
              <textarea
                id="order-status-description"
                className="field-input field-textarea"
                value={formValues.description}
                onChange={(event) => {
                  setFormValues((currentValues) => ({
                    ...currentValues,
                    description: event.target.value,
                  }));
                  resetFormStatus();
                }}
                placeholder="Краткое описание сценария использования статуса"
              />
            </div>

            <div className="order-status-flags">
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.isInitial}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      isInitial: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Начальный статус</span>
              </label>

              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.isFinal}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      isFinal: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Финальный статус</span>
              </label>

              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.isCancellable}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      isCancellable: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Разрешает отмену заказа</span>
              </label>

              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.isActive}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      isActive: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Статус активен</span>
              </label>

              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.visibleToCustomer}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      visibleToCustomer: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Показывать клиенту</span>
              </label>

              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.notifyCustomer}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      notifyCustomer: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Уведомлять клиента</span>
              </label>

              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={formValues.notifyStaff}
                  onChange={(event) => {
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      notifyStaff: event.target.checked,
                    }));
                    resetFormStatus();
                  }}
                />
                <span className="field-label">Уведомлять сотрудников</span>
              </label>
            </div>

            {formErrorMessage ? (
              <p className="form-error" role="alert">
                {formErrorMessage}
              </p>
            ) : null}

            {formSuccessMessage ? (
              <p className="form-success" role="status">
                {formSuccessMessage}
              </p>
            ) : null}

            <div className="order-status-form-actions">
              <button type="button" className="submit-button" onClick={() => void handleSaveStatus()} disabled={isSaving}>
                {isSaving ? 'Сохранение...' : isCreateMode ? 'Создать статус' : 'Сохранить изменения'}
              </button>

              {!isCreateMode && selectedStatus?.isActive ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDeactivateStatus()}
                  disabled={isSaving}
                >
                  Деактивировать
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <section className="catalog-card catalog-data-card" aria-label="Переходы статусов заказов">
          <div className="catalog-card-copy">
            <p className="placeholder-eyebrow">Transitions</p>
            <h3 className="catalog-card-title">Переходы статусов</h3>
          </div>

          {isCreateMode || !selectedStatus ? (
            <p className="catalog-empty-state">Сохраните или выберите статус, чтобы настроить его переходы.</p>
          ) : (
            <>
              <div className="order-status-form-grid">
                <div className="field">
                  <label className="field-label" htmlFor="order-status-transition-target">
                    Целевой статус
                  </label>
                  <select
                    id="order-status-transition-target"
                    className="field-input"
                    value={transitionFormValues.toStatusId}
                    onChange={(event) => {
                      setTransitionFormValues((currentValues) => ({
                        ...currentValues,
                        toStatusId: event.target.value,
                      }));
                      resetTransitionStatus();
                    }}
                  >
                    <option value="">Выберите статус</option>
                    {availableTransitionTargets.map((status) => (
                      <option key={status.id} value={status.id}>
                        {getOrderStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="order-status-transition-role">
                    Ограничение по роли
                  </label>
                  <select
                    id="order-status-transition-role"
                    className="field-input"
                    value={transitionFormValues.requiredRole}
                    onChange={(event) => {
                      setTransitionFormValues((currentValues) => ({
                        ...currentValues,
                        requiredRole: event.target.value as '' | UserRole,
                      }));
                      resetTransitionStatus();
                    }}
                  >
                    <option value="">Без ограничения</option>
                    {USER_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {getUserRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="order-status-transition-guard">
                    Guard code
                  </label>
                  <input
                    id="order-status-transition-guard"
                    className="field-input"
                    value={transitionFormValues.guardCode}
                    onChange={(event) => {
                      setTransitionFormValues((currentValues) => ({
                        ...currentValues,
                        guardCode: event.target.value,
                      }));
                      resetTransitionStatus();
                    }}
                    placeholder="Например: payment_received"
                  />
                </div>
              </div>

              <div className="order-status-flags">
                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={transitionFormValues.isAutomatic}
                    onChange={(event) => {
                      setTransitionFormValues((currentValues) => ({
                        ...currentValues,
                        isAutomatic: event.target.checked,
                      }));
                      resetTransitionStatus();
                    }}
                  />
                  <span className="field-label">Автоматический переход</span>
                </label>

                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={transitionFormValues.isActive}
                    onChange={(event) => {
                      setTransitionFormValues((currentValues) => ({
                        ...currentValues,
                        isActive: event.target.checked,
                      }));
                      resetTransitionStatus();
                    }}
                  />
                  <span className="field-label">Переход активен</span>
                </label>
              </div>

              {transitionsErrorMessage ? (
                <p className="form-error" role="alert">
                  {transitionsErrorMessage}
                </p>
              ) : null}

              {transitionErrorMessage ? (
                <p className="form-error" role="alert">
                  {transitionErrorMessage}
                </p>
              ) : null}

              {transitionSuccessMessage ? (
                <p className="form-success" role="status">
                  {transitionSuccessMessage}
                </p>
              ) : null}

              <div className="order-status-form-actions">
                <button
                  type="button"
                  className="submit-button"
                  onClick={() => void handleCreateTransition()}
                  disabled={isSavingTransition}
                >
                  {isSavingTransition ? 'Сохранение...' : 'Добавить переход'}
                </button>
              </div>

              {isTransitionsLoading ? (
                <p className="catalog-empty-state">Загрузка переходов статусов...</p>
              ) : transitions.length ? (
                <ul className="order-status-transition-list">
                  {transitions.map((transition) => (
                    <li key={transition.id} className="order-status-transition-item">
                      <div className="order-status-transition-copy">
                        <div className="order-status-list-item-head">
                          <span className={`order-pill order-pill-${getOrderStatusTone(transition.toStatus)}`}>
                            {getOrderStatusLabel(transition.toStatus)}
                          </span>
                          {!transition.isActive ? <span className="order-pill order-pill-neutral">Неактивен</span> : null}
                        </div>

                        <p className="orders-cell-meta">
                          {transition.requiredRole ? getUserRoleLabel(transition.requiredRole) : 'Без ограничения по роли'}
                          {transition.isAutomatic ? ' • автоматический' : ' • ручной'}
                        </p>
                        <p className="orders-cell-meta">
                          {transition.guardCode?.trim() ? `guard: ${transition.guardCode.trim()}` : 'guard не задан'}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleDeleteTransition(transition.id)}
                        disabled={deletingTransitionId === transition.id}
                      >
                        {deletingTransitionId === transition.id ? 'Удаление...' : 'Удалить'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="catalog-empty-state">Для выбранного статуса пока нет переходов.</p>
              )}
            </>
          )}
        </section>
    </main>
  );
}
