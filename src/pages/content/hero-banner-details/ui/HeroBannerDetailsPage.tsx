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
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Badge,
  Button,
} from '@/shared/ui';

function getStatusBadgeClassName(status: BannerStatus): string {
  if (status === 'PUBLISHED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-border bg-muted/40 text-muted-foreground';
}

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
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/hero-banners">
          Контент
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/hero-banners">
          Hero-баннеры
        </Link>
        {banner ? (
          <>
            <span>/</span>
            <span className="text-foreground">{banner.code}</span>
          </>
        ) : null}
      </nav>

      <AdminPageHeader
        kicker="Контент"
        title="Карточка баннера"
        description="Редактирование и управление статусом hero-баннера."
        actions={
          <>
            {banner ? (
              <AdminPageStatus>
                <span className="font-medium">ID:</span> {banner.id}
              </AdminPageStatus>
            ) : null}
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/hero-banners"
            >
              К списку баннеров
            </Link>
          </>
        }
      />

      {isLoading ? (
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Загружаем карточку баннера." />
        </AdminSectionCard>
      ) : !banner ? (
        <AdminSectionCard>
          <AdminEmptyState
            tone="destructive"
            title="Ошибка загрузки"
            description={errorMessage || 'Баннер не найден.'}
          />
          <div>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/hero-banners"
            >
              Вернуться к списку баннеров
            </Link>
          </div>
        </AdminSectionCard>
      ) : (
        <>
          {/* Stats */}
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Статус</p>
              <div className="mt-1">
                <Badge className={`border ${getStatusBadgeClassName(banner.status)}`}>
                  {formatBannerStatus(banner.status)}
                </Badge>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Тема</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatBannerTheme(banner.themeVariant)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Текст</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatBannerTextAlignment(banner.textAlignment)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Порядок</p>
              <p className="mt-1 text-sm font-medium text-foreground">{banner.sortOrder}</p>
            </div>
          </section>

          {/* Preview */}
          {banner.desktopImageUrl ? (
            <AdminSectionCard eyebrow="Медиа" title="Изображения баннера">
              <div className="flex flex-wrap gap-4">
                <img
                  className="max-h-48 rounded-xl object-contain"
                  src={banner.desktopImageUrl}
                  alt={banner.code}
                />
                {banner.mobileImageUrl ? (
                  <img
                    className="max-h-32 rounded-xl object-contain"
                    src={banner.mobileImageUrl}
                    alt={`${banner.code} (мобильная версия)`}
                  />
                ) : null}
              </div>
            </AdminSectionCard>
          ) : null}

          {/* Details */}
          <AdminSectionCard eyebrow="Сведения" title="Идентификаторы и расписание">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Идентификаторы</p>
                <dl className="space-y-1">
                  {[
                    { label: 'ID', value: banner.id },
                    { label: 'Код', value: banner.code },
                    { label: 'Витрина', value: banner.storefrontCode },
                    { label: 'Версия', value: banner.version },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-2 text-sm">
                      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
                      <dd className="min-w-0 truncate font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Расписание</p>
                <dl className="space-y-1">
                  {[
                    { label: 'Создан', value: formatBannerDate(banner.createdAt) },
                    { label: 'Обновлён', value: formatBannerDate(banner.updatedAt) },
                    { label: 'Опубликован', value: formatBannerDate(banner.publishedAt) },
                    { label: 'Начало', value: formatBannerDate(banner.startsAt) },
                    { label: 'Конец', value: formatBannerDate(banner.endsAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-2 text-sm">
                      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </AdminSectionCard>

          {errorMessage ? (
            <AdminNotice tone="destructive" role="alert">{errorMessage}</AdminNotice>
          ) : null}

          {/* Actions */}
          <AdminSectionCard eyebrow="Управление" title="Действия">
            <div className="flex flex-wrap items-center gap-2">
              {banner.status !== 'PUBLISHED' ? (
                <Button onClick={() => void handleStatusChange('PUBLISHED')} disabled={isSaving}>
                  Опубликовать
                </Button>
              ) : null}
              {banner.status !== 'ARCHIVED' ? (
                <Button variant="outline" onClick={() => void handleStatusChange('ARCHIVED')} disabled={isSaving}>
                  В архив
                </Button>
              ) : null}
              {banner.status !== 'DRAFT' ? (
                <Button variant="outline" onClick={() => void handleStatusChange('DRAFT')} disabled={isSaving}>
                  В черновик
                </Button>
              ) : null}
              <Button variant="destructive" onClick={() => void handleDelete()} disabled={isSaving}>
                Удалить
              </Button>
            </div>

            {statusActionError ? (
              <AdminNotice tone="destructive" role="alert">{statusActionError}</AdminNotice>
            ) : null}
          </AdminSectionCard>

          {/* Editor */}
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
        </>
      )}
    </AdminPage>
  );
}
