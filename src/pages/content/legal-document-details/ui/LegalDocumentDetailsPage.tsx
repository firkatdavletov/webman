import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatLegalDocumentUpdatedAt,
  getLegalDocument,
  getLegalDocumentTypeLabel,
  updateLegalDocument,
  type LegalDocument,
  type LegalDocumentType,
} from '@/entities/legal-document';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminSectionCard,
  Button,
  FormField,
  Input,
} from '@/shared/ui';

const VALID_TYPES = new Set<string>(['public-offer', 'personal-data-consent', 'personal-data-policy']);

type FormValues = {
  title: string;
  subtitle: string;
  text: string;
};

function buildFormValues(document: LegalDocument): FormValues {
  return {
    title: document.title,
    subtitle: document.subtitle ?? '',
    text: document.text,
  };
}

function hasUnsavedChanges(document: LegalDocument | null, formValues: FormValues | null): boolean {
  if (!document || !formValues) return false;
  return (
    document.title !== formValues.title ||
    (document.subtitle ?? '') !== formValues.subtitle ||
    document.text !== formValues.text
  );
}

export function LegalDocumentDetailsPage() {
  const { documentType } = useParams();
  const normalizedType = (documentType ?? '').trim() as LegalDocumentType;

  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const loadDocument = async () => {
      if (!VALID_TYPES.has(normalizedType)) {
        setDocument(null);
        setFormValues(null);
        setErrorMessage('Некорректный тип документа.');
        setIsLoading(false);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setIsLoading(true);
      setErrorMessage('');

      const result = await getLegalDocument(normalizedType);

      if (requestId !== requestIdRef.current) return;

      setDocument(result.document);
      setFormValues(result.document ? buildFormValues(result.document) : null);
      setErrorMessage(result.error ?? '');
      setSaveError('');
      setSaveSuccess('');
      setIsLoading(false);
    };

    void loadDocument();
  }, [normalizedType]);

  const handleFieldChange = (field: keyof FormValues, value: string) => {
    setFormValues((current) => (current ? { ...current, [field]: value } : current));
    if (saveError) setSaveError('');
    if (saveSuccess) setSaveSuccess('');
  };

  const handleReset = async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoading(true);
    setErrorMessage('');

    const result = await getLegalDocument(normalizedType);

    if (requestId !== requestIdRef.current) return;

    setDocument(result.document);
    setFormValues(result.document ? buildFormValues(result.document) : null);
    setErrorMessage(result.error ?? '');
    setSaveError('');
    setSaveSuccess('');
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formValues) return;

    if (!formValues.title.trim()) {
      setSaveError('Укажите заголовок документа.');
      return;
    }

    if (!formValues.text.trim()) {
      setSaveError('Заполните текст документа.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const result = await updateLegalDocument(normalizedType, {
      title: formValues.title.trim(),
      subtitle: formValues.subtitle.trim() || null,
      text: formValues.text,
    });

    if (result.document) {
      setDocument(result.document);
      setFormValues(buildFormValues(result.document));
      setSaveSuccess('Документ сохранён.');
    } else {
      setSaveError(result.error ?? 'Не удалось сохранить документ.');
    }

    setIsSaving(false);
  };

  const isDirty = hasUnsavedChanges(document, formValues);
  const pageTitle = VALID_TYPES.has(normalizedType) ? getLegalDocumentTypeLabel(normalizedType) : 'Документ';

  return (
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/legal-documents">
          Контент
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/legal-documents">
          Юридические документы
        </Link>
        <span>/</span>
        <span className="text-foreground">{pageTitle}</span>
      </nav>

      <AdminPageHeader
        kicker="Контент"
        title={pageTitle}
        description="Редактирование текста и заголовка юридического документа."
        actions={
          <Link
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            to="/legal-documents"
          >
            К списку документов
          </Link>
        }
      />

      {isLoading ? (
        <AdminSectionCard>
          <AdminEmptyState title="Загрузка" description="Загружаем содержимое документа." />
        </AdminSectionCard>
      ) : !document || !formValues ? (
        <AdminSectionCard>
          <AdminEmptyState
            tone="destructive"
            title="Ошибка загрузки"
            description={errorMessage || 'Документ не найден.'}
          />
        </AdminSectionCard>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Тип</p>
              <p className="mt-1 text-sm font-medium text-foreground">{getLegalDocumentTypeLabel(document.type)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Обновлён</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatLegalDocumentUpdatedAt(document.updatedAt)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Состояние</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {isDirty ? 'Есть несохранённые изменения' : 'Сохранено'}
              </p>
            </div>
          </section>

          {errorMessage ? (
            <AdminNotice tone="destructive" role="alert">{errorMessage}</AdminNotice>
          ) : null}

          <AdminSectionCard eyebrow="Редактор" title="Содержимое документа">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField htmlFor="doc-title" label="Заголовок">
                <Input
                  id="doc-title"
                  value={formValues.title}
                  disabled={isSaving}
                  placeholder="Например, Публичная оферта"
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                />
              </FormField>

              <FormField htmlFor="doc-subtitle" label="Подзаголовок">
                <Input
                  id="doc-subtitle"
                  value={formValues.subtitle}
                  disabled={isSaving}
                  placeholder="Опционально"
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                />
              </FormField>
            </div>

            <FormField htmlFor="doc-text" label="Текст документа">
              <textarea
                id="doc-text"
                value={formValues.text}
                disabled={isSaving}
                placeholder="Введите текст официального документа"
                rows={20}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                onChange={(e) => handleFieldChange('text', e.target.value)}
              />
            </FormField>
          </AdminSectionCard>

          <AdminSectionCard>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
                {isSaving ? 'Сохранение...' : 'Сохранить документ'}
              </Button>
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={() => void handleReset()}
              >
                Сбросить изменения
              </Button>
            </div>

            {saveError ? <AdminNotice tone="destructive" role="alert">{saveError}</AdminNotice> : null}
            {saveSuccess ? <AdminNotice>{saveSuccess}</AdminNotice> : null}
          </AdminSectionCard>
        </>
      )}
    </AdminPage>
  );
}
