import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  applyPickupPointCoordinateValues,
  getPickupPointAddressSummary,
  parsePickupPointCoordinateValues,
  PickupPointMapEditor,
  readPickupPointMapDraft,
  writePickupPointMapDraft,
} from '@/features/pickup-point-map-editor';
import type { YandexMapCoordinate } from '@/shared/lib/yandex-maps/api';

export function DeliveryPickupPointMapPage() {
  const navigate = useNavigate();
  const initialDraft = useMemo(() => readPickupPointMapDraft(), []);
  const [draftValues] = useState(initialDraft);
  const [coordinates, setCoordinates] = useState<YandexMapCoordinate | null>(() =>
    initialDraft ? parsePickupPointCoordinateValues(initialDraft) : null,
  );

  const handleApply = () => {
    if (!draftValues) {
      navigate('/delivery', { replace: true });
      return;
    }

    writePickupPointMapDraft(applyPickupPointCoordinateValues(draftValues, coordinates));
    navigate('/delivery', { replace: true });
  };

  return (
    <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/delivery">
            Доставка
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Пункт самовывоза на карте</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Доставка</p>
            <h2 className="page-title">Выбор координат пункта самовывоза</h2>
          </div>

          <div className="dashboard-actions">
            <Link className="secondary-link" to="/delivery">
              Вернуться к условиям доставки
            </Link>
          </div>
        </header>

        {!draftValues ? (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              Черновик пункта самовывоза не найден. Откройте карту из формы пункта на странице доставки.
            </p>
          </section>
        ) : (
          <section className="catalog-card product-detail-card delivery-zone-map-card">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Map editor</p>
              <h3 className="product-detail-title">{draftValues.name.trim() || draftValues.code.trim() || 'Пункт самовывоза'}</h3>
              <p className="catalog-card-text">
                Координаты сохраняются обратно в текущую форму пункта самовывоза на странице доставки. После возврата не забудьте
                сохранить сам пункт.
              </p>
            </div>

            <PickupPointMapEditor
              coordinates={coordinates}
              title={draftValues.name.trim() || draftValues.code.trim() || 'Пункт самовывоза'}
              addressSummary={getPickupPointAddressSummary(draftValues)}
              onCoordinatesChange={setCoordinates}
            />

            <div className="delivery-form-actions">
              <button type="button" className="submit-button" onClick={handleApply}>
                Применить координаты
              </button>

              <button type="button" className="secondary-button" onClick={() => navigate('/delivery', { replace: true })}>
                Отменить
              </button>
            </div>
          </section>
        )}
    </main>
  );
}
