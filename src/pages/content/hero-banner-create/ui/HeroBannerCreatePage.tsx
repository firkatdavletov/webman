import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createHeroBanner } from '@/entities/hero-banner';
import {
  buildHeroBannerFromEditorValues,
  EMPTY_HERO_BANNER_EDITOR_VALUES,
  EMPTY_TRANSLATION_VALUES,
  HeroBannerEditor,
  type HeroBannerEditorValues,
  type HeroBannerTranslationValues,
} from '@/features/hero-banner-editor';

export function HeroBannerCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<HeroBannerEditorValues>({
    ...EMPTY_HERO_BANNER_EDITOR_VALUES,
    translations: [{ ...EMPTY_TRANSLATION_VALUES }],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleFieldChange = (field: string, value: string) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));

    if (saveError) {
      setSaveError('');
    }
  };

  const handleTranslationChange = (index: number, field: keyof HeroBannerTranslationValues, value: string) => {
    setFormValues((current) => {
      const translations = [...current.translations];
      translations[index] = { ...translations[index], [field]: value };

      return { ...current, translations };
    });

    if (saveError) {
      setSaveError('');
    }
  };

  const handleAddTranslation = () => {
    setFormValues((current) => ({
      ...current,
      translations: [...current.translations, { ...EMPTY_TRANSLATION_VALUES, locale: '' }],
    }));
  };

  const handleRemoveTranslation = (index: number) => {
    setFormValues((current) => ({
      ...current,
      translations: current.translations.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
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

    const banner = buildHeroBannerFromEditorValues(formValues);
    const result = await createHeroBanner(banner);

    if (result.banner) {
      navigate(`/hero-banners/${result.banner.id}`, { replace: true });
      return;
    }

    setSaveError(result.error ?? 'Не удалось создать баннер.');
    setIsSaving(false);
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
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Новый баннер</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Контент</p>
            <h2 className="page-title">Новый hero-баннер</h2>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/hero-banners">
              К списку баннеров
            </Link>
          </div>
        </header>

        <section className="catalog-card product-detail-card" aria-label="Создание баннера">
          <div className="catalog-card-copy">
            <p className="placeholder-eyebrow">Создание</p>
            <h3 className="product-detail-title">Новый hero-баннер</h3>
            <p className="catalog-meta">Заполните поля и нажмите «Создать баннер». После создания можно будет изменить статус на «Опубликован».</p>
          </div>

          <HeroBannerEditor
            idPrefix="banner-create"
            ariaLabel="Форма создания баннера"
            eyebrow="Создание"
            title="Новый баннер"
            formValues={formValues}
            isSaving={isSaving}
            saveError={saveError}
            submitLabel="Создать баннер"
            savingLabel="Создание..."
            onFieldChange={handleFieldChange}
            onTranslationChange={handleTranslationChange}
            onAddTranslation={handleAddTranslation}
            onRemoveTranslation={handleRemoveTranslation}
            onSubmit={() => void handleSave()}
          />
        </section>
    </main>
  );
}
