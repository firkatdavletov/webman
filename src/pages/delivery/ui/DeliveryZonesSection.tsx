import { Link } from 'react-router-dom';
import type { DeliveryZone } from '@/entities/delivery';
import {
  getDeliveryZoneGeometrySummary,
  getDeliveryZoneTypeLabel,
  mapDeliveryZoneGeometryDtoToDraft,
} from '@/features/delivery-zone-editor';

type DeliveryZonesSectionProps = {
  zones: DeliveryZone[];
  isLoading: boolean;
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

export function DeliveryZonesSection({ zones, isLoading }: DeliveryZonesSectionProps) {
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
          <table className="delivery-table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Название</th>
                <th>Тип</th>
                <th>Матчинг</th>
                <th>Приоритет</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td>{zone.code}</td>
                  <td>{zone.name}</td>
                  <td>{getDeliveryZoneTypeLabel(zone.type)}</td>
                  <td>{getZoneTargetLabel(zone)}</td>
                  <td>{zone.priority}</td>
                  <td>{zone.isActive ? 'Активна' : 'Отключена'}</td>
                  <td className="delivery-table-actions">
                    <div className="delivery-table-link-group">
                      <Link className="secondary-link" to={`/delivery/zones/${zone.id}`}>
                        Изменить
                      </Link>

                      {zone.type === 'POLYGON' ? (
                        <Link className="secondary-link" to={`/delivery/zones/${zone.id}/map`}>
                          Карта
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="catalog-empty-state">Список зон доставки пуст.</p>
        )}
      </div>
    </section>
  );
}
