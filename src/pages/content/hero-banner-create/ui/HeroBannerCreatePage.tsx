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
import { AdminPage, AdminPageHeader } from '@/shared/ui';

export function HeroBannerCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<HeroBannerEditorValues>({
    ...EMPTY_HERO_BANNER_EDITOR_VALUES,
    translations: [{ ...EMPTY_TRANSLATION_VALUES }],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleFieldChange = (field: string, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    if (saveError) setSaveError('');
  };

  const handleTranslationChange = (index: number, field: keyof HeroBannerTranslationValues, value: string) => {
    setFormValues((current) => {
      const translations = [...current.translations];
      translations[index] = { ...translations[index], [field]: value };
      return { ...current, translations };
    });
    if (saveError) setSaveError('');
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
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/hero-banners">
          Контент
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/hero-banners">
          Hero-баннеры
        </Link>
        <span>/</span>
        <span className="text-foreground">Новый баннер</span>
      </nav>

      <AdminPageHeader
        kicker="Контент"
        title="Новый hero-баннер"
        actions={
          <Link
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            to="/hero-banners"
          >
            К списку баннеров
          </Link>
        }
      />

      <HeroBannerEditor
        idPrefix="banner-create"
        ariaLabel="Форма создания баннера"
        eyebrow="Создание"
        title="Новый баннер"
        description="Заполните поля и нажмите «Создать баннер». После создания можно изменить статус на «Опубликован»."
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
    </AdminPage>
  );
}
