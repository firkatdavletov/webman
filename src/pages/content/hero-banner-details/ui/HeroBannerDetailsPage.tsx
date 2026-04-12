import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { BannerStatus, HeroBanner } from '@/entities/hero-banner';
import {
  changeHeroBannerStatus,
  deleteHeroBanner,
  formatBannerDate,
  formatBannerStatus,
  formatBannerTextAlignment,
  formatBannerTheme,
  getHeroBannerById,
  updateHeroBanner,
} from '@/entities/hero-banner';
import {
  buildHeroBannerEditorValues,
  buildHeroBannerFromEditorValues,
  EMPTY_TRANSLATION_VALUES,
  HeroBannerEditor,
  type HeroBannerEditorValues,
  type HeroBannerTranslationValues,
} from '@/features/hero-banner-editor';
import { isUuid } from '@/shared/lib/uuid/isUuid';

export function HeroBannerDetailsPage() {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<HeroBanner | null>(null);
  const [formValues, setFormValues] = useState<HeroBannerEditorValues | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [statusActionError, setStatusActionError] = useState('');

  const normalizedBannerId = useMemo(() => (bannerId ?? '').trim(), [bannerId]);

  useEffect(() => {
    const loadBannerDetails = async () => {
      if (!isUuid(normalizedBannerId)) {
        setBanner(null);
        setFormValues(null);
        setErrorMessage('Некорректный идентификатор баннера.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const result = await getHeroBannerById(normalizedBannerId);

      setBanner(result.banner);
      setFormValues(result.banner ? buildHeroBannerEditorValues(result.banner) : null);
      setErrorMessage(result.error ?? '');
      setSaveError('');
      setSaveSuccess('');
      setStatusActionError('');
      setIsLoading(false);
    };

    void loadBannerDetails();
  }, [normalizedBannerId]);

  const handleFieldChange = (field: string, value: string) => {
    setFormValues((current) => {
      if (!current) return current;

      return { ...current, [field]: value };
    });

    if (saveError) setSaveError('');
    if (saveSuccess) setSaveSuccess('');
  };

  const handleTranslationChange = (index: number, field: keyof HeroBannerTranslationValues, value: string) => {
    setFormValues((current) => {
      if (!current) return current;

      const translations = [...current.translations];
      translations[index] = { ...translations[index], [field]: value };

      return { ...current, translations };
    });

    if (saveError) setSaveError('');
    if (saveSuccess) setSaveSuccess('');
  };

  const handleAddTranslation = () => {
    setFormValues((current) => {
      if (!current) return current;

      return {
        ...current,
        translations: [...current.translations, { ...EMPTY_TRANSLATION_VALUES, locale: '' }],
      };
    });
  };

  const handleRemoveTranslation = (index: number) => {
    setFormValues((current) => {
      if (!current) return current;

      return {
        ...current,
        translations: current.translations.filter((_, i) => i !== index),
      };
    });
  };

  const handleSave = async () => {
    if (!banner || !formValues) return;

    if (!formValues.code.trim()) {
      setSaveError('Укажите код баннера.');
      return;
    }

    if (!formValues.desktopImageUrl.trim()) {
      setSaveError('Укажите URL десктоп-изображения.');
      return;
    }

    if (formValues.translations.some((t) => !t.title.trim() || !t.desktopImageAlt.trim())) {
      setSaveError('Заполните заголовок и alt-текст для каждого перевода.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const updatedBanner = buildHeroBannerFromEditorValues(formValues, banner);
    const result = await updateHeroBanner(updatedBanner);

    if (result.banner) {
      setBanner(result.banner);
      setFormValues(buildHeroBannerEditorValues(result.banner));
      setSaveSuccess('Изменения сохранены.');
    } else {
      setSaveError(result.error ?? 'Не удалось сохранить изменения.');
    }

    setIsSaving(false);
  };

  const handleStatusChange = async (newStatus: BannerStatus) => {
    if (!banner) return;

    setStatusActionError('');
    setIsSaving(true);

    const result = await changeHeroBannerStatus(banner.id, newStatus);

    if (result.banner) {
      setBanner(result.banner);
      setFormValues(buildHeroBannerEditorValues(result.banner));
      setSaveSuccess(`Статус изменён на «${formatBannerStatus(newStatus)}».`);
    } else {
      setStatusActionError(result.error ?? 'Не удалось изменить статус.');
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!banner) return;

    if (!window.confirm('Вы уверены, что хотите удалить этот баннер?')) return;

    setIsSaving(true);
    setStatusActionError('');

    const result = await deleteHeroBanner(banner.id);

    if (result.error) {
      setStatusActionError(result.error);
      setIsSaving(false);
    } else {
      navigate('/hero-banners', { replace: true });
    }
  };

  return (
    <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/hero-banners">
            Контент
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" to="/hero-banners">
            Hero-баннеры
          </Link>
          {banner ? (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{banner.code}</span>
            </>
          ) : null}
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Контент</p>
            <h2 className="page-title">Карточка баннера</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/hero-banners">
              К списку баннеров
            </Link>
          </div>
        </header>

        {isLoading ? (
          <section className="catalog-card product-detail-card">
            <p className="catalog-empty-state">Загрузка карточки баннера...</p>
          </section>
        ) : banner ? (
          <section className="catalog-card product-detail-card" aria-label="Информация о баннере">
            <div className="product-detail-hero">
              <div className="product-detail-media" aria-label="Изображение баннера">
                {banner.desktopImageUrl ? (
                  <div className="product-detail-image-list">
                    <img
                      className="product-detail-image"
                      src={banner.desktopImageUrl}
                      alt={banner.code}
                      style={{ maxHeight: '250px', objectFit: 'contain' }}
                    />
                    {banner.mobileImageUrl ? (
                      <img
                        className="product-detail-image"
                        src={banner.mobileImageUrl}
                        alt={`${banner.code} (мобильная версия)`}
                        style={{ maxHeight: '150px', objectFit: 'contain' }}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="product-image-placeholder">Изображение отсутствует</div>
                )}
              </div>

              <div className="catalog-card-copy product-detail-summary">
                <p className="placeholder-eyebrow">Hero-баннер</p>
                <h3 className="product-detail-title">{banner.code}</h3>
                <p className="catalog-meta">
                  Статус: {formatBannerStatus(banner.status)} · Тема: {formatBannerTheme(banner.themeVariant)} · Текст:{' '}
                  {formatBannerTextAlignment(banner.textAlignment)}
                </p>
              </div>
            </div>

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="product-detail-grid">
              <div className="detail-block">
                <h4 className="detail-title">Идентификаторы</h4>
                <p className="detail-copy">ID: {banner.id}</p>
                <p className="detail-copy">Код: {banner.code}</p>
                <p className="detail-copy">Витрина: {banner.storefrontCode}</p>
                <p className="detail-copy">Версия: {banner.version}</p>
              </div>

              <div className="detail-block">
                <h4 className="detail-title">Расписание</h4>
                <p className="detail-copy">Создан: {formatBannerDate(banner.createdAt)}</p>
                <p className="detail-copy">Обновлён: {formatBannerDate(banner.updatedAt)}</p>
                <p className="detail-copy">Опубликован: {formatBannerDate(banner.publishedAt)}</p>
                <p className="detail-copy">Начало: {formatBannerDate(banner.startsAt)}</p>
                <p className="detail-copy">Конец: {formatBannerDate(banner.endsAt)}</p>
              </div>
            </div>

            <div className="product-edit-section" aria-label="Действия со статусом">
              <div className="catalog-card-copy">
                <p className="placeholder-eyebrow">Управление</p>
                <h4 className="catalog-card-title">Действия</h4>
              </div>

              <div className="product-edit-actions" style={{ gap: '0.5rem' }}>
                {banner.status !== 'PUBLISHED' ? (
                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => void handleStatusChange('PUBLISHED')}
                    disabled={isSaving}
                  >
                    Опубликовать
                  </button>
                ) : null}

                {banner.status !== 'ARCHIVED' ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleStatusChange('ARCHIVED')}
                    disabled={isSaving}
                  >
                    В архив
                  </button>
                ) : null}

                {banner.status !== 'DRAFT' ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleStatusChange('DRAFT')}
                    disabled={isSaving}
                  >
                    В черновик
                  </button>
                ) : null}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDelete()}
                  disabled={isSaving}
                  style={{ color: 'var(--danger, #d32f2f)' }}
                >
                  Удалить
                </button>
              </div>

              {statusActionError ? (
                <p className="form-error" role="alert">
                  {statusActionError}
                </p>
              ) : null}
            </div>

            {formValues ? (
              <HeroBannerEditor
                idPrefix="banner-edit"
                ariaLabel="Редактирование баннера"
                eyebrow="Редактирование"
                title="Изменить баннер"
                formValues={formValues}
                isSaving={isSaving}
                saveError={saveError}
                saveSuccess={saveSuccess}
                submitLabel="Сохранить изменения"
                savingLabel="Сохранение..."
                onFieldChange={handleFieldChange}
                onTranslationChange={handleTranslationChange}
                onAddTranslation={handleAddTranslation}
                onRemoveTranslation={handleRemoveTranslation}
                onSubmit={() => void handleSave()}
              />
            ) : null}
          </section>
        ) : (
          <section className="catalog-card product-detail-card">
            <p className="form-error" role="alert">
              {errorMessage || 'Баннер не найден.'}
            </p>
            <Link className="secondary-link" to="/hero-banners">
              Вернуться к списку баннеров
            </Link>
          </section>
        )}
    </main>
  );
}
