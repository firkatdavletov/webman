import { useRef } from 'react';
import type { BannerStatus, BannerTextAlignment, BannerThemeVariant } from '@/entities/hero-banner';
import type {
  HeroBannerEditorValues,
  HeroBannerTranslationValues,
} from '@/features/hero-banner-editor/model/heroBannerEditor';
import {
  AdminNotice,
  AdminSectionCard,
  Button,
  FormField,
  Input,
} from '@/shared/ui';

const SUPPORTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

type HeroBannerEditorProps = {
  idPrefix: string;
  ariaLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  formValues: HeroBannerEditorValues;
  isSaving: boolean;
  isImageUploading?: boolean;
  saveError?: string;
  saveSuccess?: string;
  submitLabel: string;
  savingLabel: string;
  onFieldChange: (field: string, value: string) => void;
  onTranslationChange: (index: number, field: keyof HeroBannerTranslationValues, value: string) => void;
  onAddTranslation: () => void;
  onRemoveTranslation: (index: number) => void;
  onSubmit: () => void;
  onDesktopImageUpload?: (file: File) => void;
  onMobileImageUpload?: (file: File) => void;
};

const STATUS_OPTIONS: { value: BannerStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'PUBLISHED', label: 'Опубликован' },
  { value: 'ARCHIVED', label: 'В архиве' },
];

const THEME_OPTIONS: { value: BannerThemeVariant; label: string }[] = [
  { value: 'LIGHT', label: 'Светлая' },
  { value: 'DARK', label: 'Тёмная' },
  { value: 'ACCENT', label: 'Акцент' },
];

const ALIGNMENT_OPTIONS: { value: BannerTextAlignment; label: string }[] = [
  { value: 'LEFT', label: 'Слева' },
  { value: 'CENTER', label: 'По центру' },
  { value: 'RIGHT', label: 'Справа' },
];

const SELECT_CLASSNAME =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

const SUBSECTION_LABEL_CLASSNAME =
  'text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase';

export function HeroBannerEditor({
  idPrefix,
  ariaLabel,
  eyebrow,
  title,
  description,
  formValues,
  isSaving,
  isImageUploading,
  saveError,
  saveSuccess,
  submitLabel,
  savingLabel,
  onFieldChange,
  onTranslationChange,
  onAddTranslation,
  onRemoveTranslation,
  onSubmit,
  onDesktopImageUpload,
  onMobileImageUpload,
}: HeroBannerEditorProps) {
  const desktopImageInputRef = useRef<HTMLInputElement>(null);
  const mobileImageInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <AdminSectionCard eyebrow={eyebrow} title={title} description={description} aria-label={ariaLabel}>
        <div className="space-y-6">
          {/* Основные поля */}
          <div className="space-y-4">
            <p className={SUBSECTION_LABEL_CLASSNAME}>Основные</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField htmlFor={`${idPrefix}-code`} label="Код баннера">
                <Input
                  id={`${idPrefix}-code`}
                  value={formValues.code}
                  disabled={isSaving}
                  placeholder="home-promo-spring"
                  onChange={(e) => onFieldChange('code', e.target.value)}
                />
              </FormField>

              <FormField htmlFor={`${idPrefix}-storefront`} label="Код витрины">
                <Input
                  id={`${idPrefix}-storefront`}
                  value={formValues.storefrontCode}
                  disabled={isSaving}
                  placeholder="default"
                  onChange={(e) => onFieldChange('storefrontCode', e.target.value)}
                />
              </FormField>

              <FormField htmlFor={`${idPrefix}-status`} label="Статус">
                <select
                  id={`${idPrefix}-status`}
                  className={SELECT_CLASSNAME}
                  value={formValues.status}
                  disabled={isSaving}
                  onChange={(e) => onFieldChange('status', e.target.value)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField htmlFor={`${idPrefix}-sort-order`} label="Порядок сортировки">
                <Input
                  id={`${idPrefix}-sort-order`}
                  type="number"
                  value={formValues.sortOrder}
                  disabled={isSaving}
                  onChange={(e) => onFieldChange('sortOrder', e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Изображения */}
          <div className="space-y-4">
            <p className={SUBSECTION_LABEL_CLASSNAME}>Изображения</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {formValues.desktopImageUrl ? (
                  <img
                    className="max-h-40 w-full rounded-xl object-cover"
                    src={formValues.desktopImageUrl}
                    alt="Превью десктоп-баннера"
                  />
                ) : null}
                <FormField htmlFor={`${idPrefix}-desktop-image`} label="URL десктоп-изображения">
                  <div className="flex gap-2">
                    <Input
                      id={`${idPrefix}-desktop-image`}
                      value={formValues.desktopImageUrl}
                      disabled={isSaving}
                      placeholder="https://..."
                      onChange={(e) => onFieldChange('desktopImageUrl', e.target.value)}
                    />
                    {onDesktopImageUpload ? (
                      <>
                        <input
                          ref={desktopImageInputRef}
                          type="file"
                          accept={SUPPORTED_IMAGE_TYPES}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) onDesktopImageUpload(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSaving || isImageUploading}
                          onClick={() => desktopImageInputRef.current?.click()}
                        >
                          {isImageUploading ? 'Загрузка…' : 'Загрузить'}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </FormField>
              </div>

              <div className="space-y-2">
                {formValues.mobileImageUrl ? (
                  <img
                    className="max-h-40 w-full rounded-xl object-cover"
                    src={formValues.mobileImageUrl}
                    alt="Превью мобильного баннера"
                  />
                ) : null}
                <FormField htmlFor={`${idPrefix}-mobile-image`} label="URL мобильного изображения">
                  <div className="flex gap-2">
                    <Input
                      id={`${idPrefix}-mobile-image`}
                      value={formValues.mobileImageUrl}
                      disabled={isSaving}
                      placeholder="https://..."
                      onChange={(e) => onFieldChange('mobileImageUrl', e.target.value)}
                    />
                    {onMobileImageUpload ? (
                      <>
                        <input
                          ref={mobileImageInputRef}
                          type="file"
                          accept={SUPPORTED_IMAGE_TYPES}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) onMobileImageUpload(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSaving || isImageUploading}
                          onClick={() => mobileImageInputRef.current?.click()}
                        >
                          {isImageUploading ? 'Загрузка…' : 'Загрузить'}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </FormField>
              </div>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Ссылки */}
          <div className="space-y-4">
            <p className={SUBSECTION_LABEL_CLASSNAME}>Ссылки</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField htmlFor={`${idPrefix}-primary-action`} label="URL основного действия">
                <Input
                  id={`${idPrefix}-primary-action`}
                  value={formValues.primaryActionUrl}
                  disabled={isSaving}
                  placeholder="/catalog/sale"
                  onChange={(e) => onFieldChange('primaryActionUrl', e.target.value)}
                />
              </FormField>

              <FormField htmlFor={`${idPrefix}-secondary-action`} label="URL дополнительного действия">
                <Input
                  id={`${idPrefix}-secondary-action`}
                  value={formValues.secondaryActionUrl}
                  disabled={isSaving}
                  placeholder="/about"
                  onChange={(e) => onFieldChange('secondaryActionUrl', e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Оформление и расписание */}
          <div className="space-y-4">
            <p className={SUBSECTION_LABEL_CLASSNAME}>Оформление и расписание</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField htmlFor={`${idPrefix}-theme`} label="Тема">
                <select
                  id={`${idPrefix}-theme`}
                  className={SELECT_CLASSNAME}
                  value={formValues.themeVariant}
                  disabled={isSaving}
                  onChange={(e) => onFieldChange('themeVariant', e.target.value)}
                >
                  {THEME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField htmlFor={`${idPrefix}-alignment`} label="Выравнивание текста">
                <select
                  id={`${idPrefix}-alignment`}
                  className={SELECT_CLASSNAME}
                  value={formValues.textAlignment}
                  disabled={isSaving}
                  onChange={(e) => onFieldChange('textAlignment', e.target.value)}
                >
                  {ALIGNMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField htmlFor={`${idPrefix}-starts-at`} label="Начало показа">
                <Input
                  id={`${idPrefix}-starts-at`}
                  type="datetime-local"
                  value={formValues.startsAt}
                  disabled={isSaving}
                  onChange={(e) => onFieldChange('startsAt', e.target.value)}
                />
              </FormField>

              <FormField htmlFor={`${idPrefix}-ends-at`} label="Конец показа">
                <Input
                  id={`${idPrefix}-ends-at`}
                  type="datetime-local"
                  value={formValues.endsAt}
                  disabled={isSaving}
                  onChange={(e) => onFieldChange('endsAt', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Переводы"
        title="Локализации"
        action={
          <Button variant="outline" onClick={onAddTranslation} disabled={isSaving}>
            Добавить перевод
          </Button>
        }
      >
        <div className="space-y-4">
          {formValues.translations.map((translation, index) => (
            <div
              key={index}
              className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className={SUBSECTION_LABEL_CLASSNAME}>Перевод #{index + 1}</p>
                {formValues.translations.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTranslation(index)}
                    disabled={isSaving}
                  >
                    Удалить
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField htmlFor={`${idPrefix}-t${index}-locale`} label="Локаль">
                  <Input
                    id={`${idPrefix}-t${index}-locale`}
                    value={translation.locale}
                    disabled={isSaving}
                    placeholder="ru"
                    onChange={(e) => onTranslationChange(index, 'locale', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-title`} label="Заголовок">
                  <Input
                    id={`${idPrefix}-t${index}-title`}
                    value={translation.title}
                    disabled={isSaving}
                    onChange={(e) => onTranslationChange(index, 'title', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-subtitle`} label="Подзаголовок">
                  <Input
                    id={`${idPrefix}-t${index}-subtitle`}
                    value={translation.subtitle}
                    disabled={isSaving}
                    onChange={(e) => onTranslationChange(index, 'subtitle', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-description`} label="Описание">
                  <textarea
                    id={`${idPrefix}-t${index}-description`}
                    value={translation.description}
                    disabled={isSaving}
                    rows={2}
                    className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                    onChange={(e) => onTranslationChange(index, 'description', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-desktop-alt`} label="Alt десктоп-изображения">
                  <Input
                    id={`${idPrefix}-t${index}-desktop-alt`}
                    value={translation.desktopImageAlt}
                    disabled={isSaving}
                    onChange={(e) => onTranslationChange(index, 'desktopImageAlt', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-mobile-alt`} label="Alt мобильного изображения">
                  <Input
                    id={`${idPrefix}-t${index}-mobile-alt`}
                    value={translation.mobileImageAlt}
                    disabled={isSaving}
                    onChange={(e) => onTranslationChange(index, 'mobileImageAlt', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-primary-label`} label="Текст основной кнопки">
                  <Input
                    id={`${idPrefix}-t${index}-primary-label`}
                    value={translation.primaryActionLabel}
                    disabled={isSaving}
                    onChange={(e) => onTranslationChange(index, 'primaryActionLabel', e.target.value)}
                  />
                </FormField>

                <FormField htmlFor={`${idPrefix}-t${index}-secondary-label`} label="Текст дополнительной кнопки">
                  <Input
                    id={`${idPrefix}-t${index}-secondary-label`}
                    value={translation.secondaryActionLabel}
                    disabled={isSaving}
                    onChange={(e) => onTranslationChange(index, 'secondaryActionLabel', e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSubmit} disabled={isSaving}>
            {isSaving ? savingLabel : submitLabel}
          </Button>
        </div>

        {saveError ? (
          <AdminNotice tone="destructive" role="alert">{saveError}</AdminNotice>
        ) : null}

        {saveSuccess ? (
          <AdminNotice>{saveSuccess}</AdminNotice>
        ) : null}
      </AdminSectionCard>
    </>
  );
}
