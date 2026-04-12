import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import type { DeliveryZone } from '@/entities/delivery';
import {
  getDeliveryZoneGeometrySummary,
  getDeliveryZoneTypeLabel,
  mapDeliveryZoneGeometryDtoToDraft,
} from '@/features/delivery-zone-editor';
import { LazyDataTable } from '@/shared/ui/data-table';

type DeliveryZonesSectionProps = {
  zones: DeliveryZone[];
  isLoading: boolean;
  deletingZoneId?: string | null;
  actionError?: string;
  actionSuccess?: string;
  onDeleteZone?: (zone: DeliveryZone) => void;
};

function formatNullableValue(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  return normalizedValue || '—';
}

function getZoneTargetLabel(zone: DeliveryZone): string {
  if (zone.type === 'CITY') {
    return formatNullableValue(zone.city);
  }

  if (zone.type === 'POSTAL_CODE') {
    return formatNullableValue(zone.postalCode);
  }

  return getDeliveryZoneGeometrySummary(mapDeliveryZoneGeometryDtoToDraft(zone.geometry));
}

export function DeliveryZonesSection({
  zones,
  isLoading,
  deletingZoneId = null,
  actionError = '',
  actionSuccess = '',
  onDeleteZone,
}: DeliveryZonesSectionProps) {
  const columns: ColumnDef<DeliveryZone>[] = [
    {
      id: 'code',
      header: 'Код',
      cell: ({ row }) => row.original.code,
    },
    {
      id: 'name',
      header: 'Название',
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'type',
      header: 'Тип',
      cell: ({ row }) => getDeliveryZoneTypeLabel(row.original.type),
    },
    {
      id: 'target',
      header: 'Матчинг',
      cell: ({ row }) => getZoneTargetLabel(row.original),
    },
    {
      id: 'priority',
      header: 'Приоритет',
      cell: ({ row }) => row.original.priority,
    },
    {
      id: 'status',
      header: 'Статус',
      cell: ({ row }) => (row.original.isActive ? 'Активна' : 'Отключена'),
    },
    {
      id: 'actions',
      header: '',
      meta: {
        cellClassName: 'delivery-table-actions',
      },
      cell: ({ row }) => (
        <div className="delivery-table-link-group">
          <Link className="secondary-link" to={`/delivery/zones/${row.original.id}`}>
            Изменить
          </Link>

          {row.original.type === 'POLYGON' ? (
            <Link className="secondary-link" to={`/delivery/zones/${row.original.id}/map`}>
              Карта
            </Link>
          ) : null}

          {onDeleteZone ? (
            <button
              type="button"
              className="secondary-button secondary-button-danger"
              disabled={deletingZoneId === row.original.id}
              onClick={() => onDeleteZone(row.original)}
            >
              {deletingZoneId === row.original.id ? 'Удаление...' : 'Удалить'}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="catalog-card catalog-data-card" aria-label="Зоны доставки">
      <div className="catalog-section-header">
        <div className="catalog-card-copy">
          <p className="placeholder-eyebrow">Зоны</p>
          <h3 className="catalog-card-title">Зоны доставки</h3>
          <p className="catalog-card-text">
            Зоны редактируются на отдельном экране. Для `POLYGON`-зон доступен отдельный map editor на Yandex Maps.
          </p>
        </div>

        <Link className="secondary-link" to="/delivery/zones/new">
          Новая зона
        </Link>
      </div>

      <div className="delivery-table-wrap">
        {isLoading ? (
          <p className="catalog-empty-state">Загрузка зон доставки...</p>
        ) : zones.length ? (
          <LazyDataTable
            columns={columns}
            data={zones}
            fallback={
              <div className="delivery-table-wrap">
                <p className="catalog-empty-state">Загрузка таблицы зон доставки...</p>
              </div>
            }
            getRowId={(zone) => zone.id}
            wrapperClassName="delivery-table-wrap"
            tableClassName="delivery-table"
          />
        ) : (
          <p className="catalog-empty-state">Список зон доставки пуст.</p>
        )}
      </div>

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {actionSuccess ? (
        <p className="form-success" role="status">
          {actionSuccess}
        </p>
      ) : null}
    </section>
  );
}
