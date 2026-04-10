import { useEffect, useRef, useState } from 'react';
import {
  formatLegalDocumentUpdatedAt,
  getLegalDocument,
  getLegalDocuments,
  getLegalDocumentTypeLabel,
  updateLegalDocument,
  type LegalDocument,
  type LegalDocumentType,
} from '@/entities/legal-document';
import { NavBar } from '@/shared/ui/NavBar';

type LegalDocumentFormValues = {
  title: string;
  subtitle: string;
  text: string;
};

function buildFormValues(document: LegalDocument): LegalDocumentFormValues {
  return {
    title: document.title,
    subtitle: document.subtitle ?? '',
    text: document.text,
  };
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function hasUnsavedChanges(document: LegalDocument | null, formValues: LegalDocumentFormValues | null): boolean {
  if (!document || !formValues) {
    return false;
  }

  return (
    document.title !== formValues.title ||
    (document.subtitle ?? '') !== formValues.subtitle ||
    document.text !== formValues.text
  );
}

export function LegalDocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [selectedType, setSelectedType] = useState<LegalDocumentType | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [formValues, setFormValues] = useState<LegalDocumentFormValues | null>(null);
  const [listErrorMessage, setListErrorMessage] = useState('');
  const [documentErrorMessage, setDocumentErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);
  const [isListRefreshing, setIsListRefreshing] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const listRequestIdRef = useRef(0);
  const documentRequestIdRef = useRef(0);

  const loadDocumentDetails = async (type: LegalDocumentType) => {
    const requestId = documentRequestIdRef.current + 1;
    documentRequestIdRef.current = requestId;

    setIsDocumentLoading(true);
    setDocumentErrorMessage('');

    const result = await getLegalDocument(type);

    if (requestId !== documentRequestIdRef.current) {
      return;
    }

    setSelectedDocument(result.document);
    setFormValues(result.document ? buildFormValues(result.document) : null);
    setDocumentErrorMessage(result.error ?? '');
    setSaveErrorMessage('');
    setSaveSuccessMessage('');
    setIsDocumentLoading(false);
  };

  const loadDocuments = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsListLoading(true);
    } else {
      setIsListRefreshing(true);
    }

    setListErrorMessage('');

    const result = await getLegalDocuments();

    if (requestId !== listRequestIdRef.current) {
      return;
    }

    setDocuments(result.documents);
    setListErrorMessage(result.error ?? '');
    setIsListLoading(false);
    setIsListRefreshing(false);

    if (!result.documents.length) {
      setSelectedType(null);
      setSelectedDocument(null);
      setFormValues(null);
      return;
    }

    const nextSelectedType =
      selectedType && result.documents.some((document) => document.type === selectedType) ? selectedType : result.documents[0]?.type ?? null;

    if (!nextSelectedType) {
      return;
    }

    setSelectedType(nextSelectedType);
    void loadDocumentDetails(nextSelectedType);
  };

  useEffect(() => {
    void loadDocuments({ showInitialLoader: true });
  }, []);

  const handleSelectDocument = (type: LegalDocumentType) => {
    if (type === selectedType || isDocumentLoading || isSaving) {
      return;
    }

    if (hasUnsavedChanges(selectedDocument, formValues) && !window.confirm('Несохранённые изменения будут потеряны. Продолжить?')) {
      return;
    }

    setSelectedType(type);
    void loadDocumentDetails(type);
  };

  const handleFieldChange = (field: keyof LegalDocumentFormValues, value: string) => {
    setFormValues((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });

    if (saveErrorMessage) {
      setSaveErrorMessage('');
    }

    if (saveSuccessMessage) {
      setSaveSuccessMessage('');
    }
  };

  const handleSave = async () => {
    if (!selectedType || !formValues) {
      return;
    }

    if (!formValues.title.trim()) {
      setSaveErrorMessage('Укажите заголовок документа.');
      return;
    }

    if (!formValues.text.trim()) {
      setSaveErrorMessage('Заполните текст документа.');
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage('');
    setSaveSuccessMessage('');

    const result = await updateLegalDocument(selectedType, {
      title: formValues.title.trim(),
      subtitle: normalizeOptionalText(formValues.subtitle),
      text: formValues.text,
    });

    if (result.document) {
      setSelectedDocument(result.document);
      setFormValues(buildFormValues(result.document));
      setDocuments((current) =>
        current.map((document) => (document.type === result.document?.type ? result.document : document)),
      );
      setSaveSuccessMessage('Документ сохранён.');
    } else {
      setSaveErrorMessage(result.error ?? 'Не удалось сохранить документ.');
    }

    setIsSaving(false);
  };

  const selectedDocumentLabel = selectedType ? getLegalDocumentTypeLabel(selectedType) : 'Юридические документы';
  const isDirty = hasUnsavedChanges(selectedDocument, formValues);

  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Контент</p>
            <h2 className="page-title">Юридические документы</h2>
          </div>

          <div className="dashboard-actions">
            <span className="status-chip">
              {isListLoading ? 'Загрузка документов...' : `Документов: ${documents.length}`}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadDocuments()}
              disabled={isListLoading || isListRefreshing || isDocumentLoading || isSaving}
            >
              {isListRefreshing ? 'Обновление...' : 'Обновить данные'}
            </button>
          </div>
        </header>

        <section className="legal-documents-layout" aria-label="Управление юридическими документами">
          <aside className="catalog-card catalog-data-card">
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Список</p>
              <h3 className="catalog-card-title">Редактируемые документы</h3>
              <p className="catalog-card-text">Публичная оферта, согласие на обработку персональных данных и политика конфиденциальности.</p>
            </div>

            {listErrorMessage ? (
              <p className="form-error" role="alert">
                {listErrorMessage}
              </p>
            ) : null}

            {isListLoading ? (
              <p className="catalog-empty-state">Загрузка списка документов...</p>
            ) : documents.length ? (
              <div className="legal-documents-list">
                {documents.map((document) => {
                  const isActive = document.type === selectedType;

                  return (
                    <button
                      key={document.type}
                      type="button"
                      className={`legal-document-list-button${isActive ? ' legal-document-list-button-active' : ''}`}
                      onClick={() => handleSelectDocument(document.type)}
                    >
                      <span className="legal-document-list-title">{getLegalDocumentTypeLabel(document.type)}</span>
                      <span className="legal-document-list-name">{document.title}</span>
                      <span className="legal-document-list-meta">
                        Обновлён: {formatLegalDocumentUpdatedAt(document.updatedAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="catalog-empty-state">Документы не найдены.</p>
            )}
          </aside>

          <section className="catalog-card product-detail-card" aria-label={selectedDocumentLabel}>
            <div className="catalog-card-copy">
              <p className="placeholder-eyebrow">Редактор</p>
              <h3 className="catalog-card-title">{selectedDocumentLabel}</h3>
              <p className="catalog-meta">
                {selectedDocument
                  ? `Последнее обновление: ${formatLegalDocumentUpdatedAt(selectedDocument.updatedAt)}`
                  : 'Выберите документ для редактирования.'}
              </p>
            </div>

            {documentErrorMessage ? (
              <p className="form-error" role="alert">
                {documentErrorMessage}
              </p>
            ) : null}

            {saveErrorMessage ? (
              <p className="form-error" role="alert">
                {saveErrorMessage}
              </p>
            ) : null}

            {saveSuccessMessage ? (
              <p className="form-success" role="status">
                {saveSuccessMessage}
              </p>
            ) : null}

            {isDocumentLoading ? (
              <p className="catalog-empty-state">Загрузка документа...</p>
            ) : formValues && selectedDocument ? (
              <>
                <div className="product-detail-grid">
                  <div className="detail-block">
                    <h4 className="detail-title">Тип документа</h4>
                    <p className="detail-copy">{getLegalDocumentTypeLabel(selectedDocument.type)}</p>
                  </div>

                  <div className="detail-block">
                    <h4 className="detail-title">Состояние</h4>
                    <p className="detail-copy">{isDirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}</p>
                  </div>
                </div>

                <div className="product-edit-section">
                  <div className="product-editor-subsection">
                    <div className="product-edit-grid">
                      <label className="field">
                        <span className="field-label">Заголовок</span>
                        <input
                          className="field-input"
                          type="text"
                          value={formValues.title}
                          onChange={(event) => handleFieldChange('title', event.target.value)}
                          placeholder="Например, Публичная оферта"
                        />
                      </label>

                      <label className="field">
                        <span className="field-label">Подзаголовок</span>
                        <input
                          className="field-input"
                          type="text"
                          value={formValues.subtitle}
                          onChange={(event) => handleFieldChange('subtitle', event.target.value)}
                          placeholder="Опционально"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="product-editor-subsection">
                    <label className="field">
                      <span className="field-label">Текст документа</span>
                      <textarea
                        className="field-input field-textarea legal-document-textarea"
                        value={formValues.text}
                        onChange={(event) => handleFieldChange('text', event.target.value)}
                        placeholder="Введите текст официального документа"
                      />
                    </label>
                  </div>
                </div>

                <div className="legal-document-editor-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => selectedType && void loadDocumentDetails(selectedType)}
                    disabled={isDocumentLoading || isSaving}
                  >
                    Сбросить изменения
                  </button>

                  <button type="button" className="submit-button" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
                    {isSaving ? 'Сохранение...' : 'Сохранить документ'}
                  </button>
                </div>
              </>
            ) : (
              <p className="catalog-empty-state">Выберите документ из списка слева.</p>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
