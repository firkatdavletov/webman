import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatLegalDocumentUpdatedAt,
  getLegalDocuments,
  getLegalDocumentTypeLabel,
  type LegalDocument,
} from '@/entities/legal-document';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPage,
  AdminPageHeader,
  AdminPageStatus,
  AdminSectionCard,
  Button,
} from '@/shared/ui';

export function LegalDocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const loadDocuments = async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showInitialLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');

    const result = await getLegalDocuments();

    if (requestId !== requestIdRef.current) {
      return;
    }

    setDocuments(result.documents);
    setErrorMessage(result.error ?? '');
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadDocuments({ showInitialLoader: true });
  }, []);

  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Контент"
        title="Юридические документы"
        description="Публичная оферта, согласие на обработку персональных данных и политика конфиденциальности."
        actions={
          <>
            <AdminPageStatus>
              {isLoading ? 'Загрузка...' : `Документов: ${documents.length}`}
            </AdminPageStatus>
            <Button
              variant="outline"
              onClick={() => void loadDocuments()}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? 'Обновление...' : 'Обновить'}
            </Button>
          </>
        }
      />

      <AdminSectionCard eyebrow="Список" title="Редактируемые документы">
        {errorMessage ? (
          <AdminNotice tone="destructive" role="alert">{errorMessage}</AdminNotice>
        ) : null}

        {isLoading ? (
          <AdminEmptyState description="Загрузка списка документов..." />
        ) : documents.length ? (
          <ul className="divide-y divide-border/60">
            {documents.map((document) => (
              <li key={document.type}>
                <Link
                  to={`/legal-documents/${document.type}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-foreground first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {getLegalDocumentTypeLabel(document.type)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {document.title}
                      {' · '}
                      Обновлён: {formatLegalDocumentUpdatedAt(document.updatedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">Редактировать →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState description="Документы не найдены." />
        )}
      </AdminSectionCard>
    </AdminPage>
  );
}
