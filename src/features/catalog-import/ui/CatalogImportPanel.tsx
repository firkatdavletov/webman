import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  downloadCatalogImportExample,
  getCatalogImportExamples,
  importCatalogFile,
  type CatalogImportExample,
  type CatalogImportMode,
  type CatalogImportReport,
  type CatalogImportType,
} from '@/features/catalog-import/api/catalogImportApi';
import {
  catalogImportModeOptions,
  catalogImportTypeOptions,
  getCatalogImportErrorLabel,
  getCatalogImportModeLabel,
  getCatalogImportTypeLabel,
} from '@/features/catalog-import/model/catalogImport';

type StatusKind = 'idle' | 'success' | 'error';

type CatalogImportPanelProps = {
  title?: string;
  description?: string;
  initialImportType?: CatalogImportType;
  allowedImportTypes?: CatalogImportType[];
};

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildExampleKey(example: Pick<CatalogImportExample, 'importType' | 'importMode'>): string {
  return `${example.importType}:${example.importMode}`;
}

export function CatalogImportPanel({
  title = 'Импорт CSV каталога',
  description = 'Выберите тип данных, режим импорта и загрузите CSV-файл в кодировке UTF-8.',
  initialImportType = 'PRODUCT',
  allowedImportTypes,
}: CatalogImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<CatalogImportType>(initialImportType);
  const [importMode, setImportMode] = useState<CatalogImportMode>('UPSERT');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<StatusKind>('idle');

  const [importReport, setImportReport] = useState<CatalogImportReport | null>(null);

  const [examples, setExamples] = useState<CatalogImportExample[]>([]);
  const [isExamplesLoading, setIsExamplesLoading] = useState(true);
  const [examplesErrorMessage, setExamplesErrorMessage] = useState('');
  const [isDownloadingExampleKey, setIsDownloadingExampleKey] = useState<string | null>(null);
  const [downloadStatusMessage, setDownloadStatusMessage] = useState('');
  const [downloadStatusKind, setDownloadStatusKind] = useState<StatusKind>('idle');
  const visibleImportTypeOptions = useMemo(() => {
    if (!allowedImportTypes?.length) {
      return catalogImportTypeOptions;
    }

    const allowedImportTypeSet = new Set(allowedImportTypes);

    return catalogImportTypeOptions.filter((option) => allowedImportTypeSet.has(option.value));
  }, [allowedImportTypes]);

  useEffect(() => {
    if (!visibleImportTypeOptions.length) {
      return;
    }

    const hasSelectedImportType = visibleImportTypeOptions.some((option) => option.value === importType);

    if (!hasSelectedImportType) {
      setImportType(visibleImportTypeOptions[0].value);
    }
  }, [importType, visibleImportTypeOptions]);

  const selectedImportTypeOption = visibleImportTypeOptions.find((option) => option.value === importType) ?? null;
  const selectedImportModeOption = catalogImportModeOptions.find((option) => option.value === importMode) ?? null;

  const currentExample = useMemo(
    () => examples.find((example) => example.importType === importType && example.importMode === importMode) ?? null,
    [examples, importMode, importType],
  );
  const visibleRowErrors = useMemo(() => importReport?.rowErrors.slice(0, 8) ?? [], [importReport]);
  const hiddenRowErrorsCount = Math.max(0, (importReport?.rowErrors.length ?? 0) - visibleRowErrors.length);

  const loadExamples = async () => {
    setIsExamplesLoading(true);
    setExamplesErrorMessage('');

    const result = await getCatalogImportExamples();

    setExamples(result.examples);
    setExamplesErrorMessage(result.error ?? '');
    setIsExamplesLoading(false);
  };

  useEffect(() => {
    void loadExamples();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    setSelectedFile(nextFile);
    setStatusMessage('');
    setStatusKind('idle');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setStatusKind('error');
      setStatusMessage('Выберите CSV-файл перед запуском импорта.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');
    setStatusKind('idle');

    const result = await importCatalogFile({
      file: selectedFile,
      importType,
      importMode,
    });

    if (!result.report) {
      setStatusKind('error');
      setStatusMessage(result.error ?? 'Не удалось выполнить импорт каталога.');
      setImportReport(null);
      setIsSubmitting(false);
      return;
    }

    setImportReport(result.report);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (result.report.errorCount > 0) {
      setStatusKind('error');
      setStatusMessage(`Импорт завершен с ошибками: ${result.report.errorCount} строк(и) не прошли проверку.`);
    } else {
      setStatusKind('success');
      setStatusMessage('Импорт выполнен успешно.');
    }

    setIsSubmitting(false);
  };

  const handleDownloadExample = async (example: CatalogImportExample) => {
    const key = buildExampleKey(example);

    setIsDownloadingExampleKey(key);
    setDownloadStatusMessage('');
    setDownloadStatusKind('idle');

    const result = await downloadCatalogImportExample({
      importType: example.importType,
      importMode: example.importMode,
      fileName: example.fileName,
    });

    if (result.error) {
      setDownloadStatusKind('error');
      setDownloadStatusMessage(result.error);
    } else {
      setDownloadStatusKind('success');
      setDownloadStatusMessage(`Пример "${example.fileName}" успешно скачан.`);
    }

    setIsDownloadingExampleKey(null);
  };

  return (
    <form className="catalog-card catalog-form" onSubmit={handleSubmit} noValidate>
      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Импорт</p>
        <h3 className="catalog-card-title">{title}</h3>
        <p className="catalog-card-text">{description}</p>
      </div>

      <div className="catalog-import-control-grid">
        <div className="field">
          <label className="field-label" htmlFor="catalog-import-type">
            Тип данных
          </label>
          <select
            id="catalog-import-type"
            name="importType"
            className="field-input"
            value={importType}
            onChange={(event) => setImportType(event.target.value as CatalogImportType)}
            disabled={isSubmitting}
          >
            {visibleImportTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedImportTypeOption ? <p className="catalog-meta">{selectedImportTypeOption.description}</p> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="catalog-import-mode">
            Режим импорта
          </label>
          <select
            id="catalog-import-mode"
            name="importMode"
            className="field-input"
            value={importMode}
            onChange={(event) => setImportMode(event.target.value as CatalogImportMode)}
            disabled={isSubmitting}
          >
            {catalogImportModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedImportModeOption ? <p className="catalog-meta">{selectedImportModeOption.description}</p> : null}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="catalog-import-file">
          CSV-файл
        </label>
        <input
          ref={fileInputRef}
          id="catalog-import-file"
          name="file"
          type="file"
          className="field-input file-input"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isSubmitting}
        />
      </div>

      {selectedFile ? (
        <div className="file-summary" aria-live="polite">
          <span className="file-summary-name">{selectedFile.name}</span>
          <span className="file-summary-size">{formatFileSize(selectedFile.size)}</span>
        </div>
      ) : (
        <p className="catalog-meta">Поддерживается CSV с заголовком в первой строке.</p>
      )}

      <div className="catalog-import-actions">
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Импорт...' : 'Запустить импорт'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            if (currentExample) {
              void handleDownloadExample(currentExample);
            }
          }}
          disabled={isSubmitting || !currentExample || isDownloadingExampleKey !== null}
        >
          {isDownloadingExampleKey === (currentExample ? buildExampleKey(currentExample) : null)
            ? 'Скачивание...'
            : 'Скачать пример для выбора'}
        </button>
      </div>

      {statusMessage ? (
        <p className={statusKind === 'success' ? 'form-success' : 'form-error'} role={statusKind === 'error' ? 'alert' : 'status'}>
          {statusMessage}
        </p>
      ) : null}

      {importReport ? (
        <div className="detail-block">
          <h4 className="detail-title">Отчет импорта</h4>
          <p className="detail-copy">
            {getCatalogImportTypeLabel(importReport.importType)} - {getCatalogImportModeLabel(importReport.importMode)}
          </p>

          <div className="catalog-import-report-grid">
            <p className="catalog-import-report-item">Всего строк: {importReport.totalRows}</p>
            <p className="catalog-import-report-item">Успешно: {importReport.successCount}</p>
            <p className="catalog-import-report-item">Создано: {importReport.createdCount}</p>
            <p className="catalog-import-report-item">Обновлено: {importReport.updatedCount}</p>
            <p className="catalog-import-report-item">Пропущено: {importReport.skippedCount}</p>
            <p className="catalog-import-report-item">Ошибки: {importReport.errorCount}</p>
          </div>

          {visibleRowErrors.length ? (
            <ul className="catalog-import-error-list">
              {visibleRowErrors.map((errorItem) => (
                <li key={`${errorItem.rowNumber}-${errorItem.errorCode}-${errorItem.message}`} className="catalog-import-error-item">
                  Строка {errorItem.rowNumber}
                  {errorItem.rowKey ? ` (${errorItem.rowKey})` : ''}: {errorItem.message}. Код: {getCatalogImportErrorLabel(errorItem.errorCode)}.
                </li>
              ))}
            </ul>
          ) : (
            <p className="catalog-meta">Ошибок по строкам нет.</p>
          )}

          {hiddenRowErrorsCount > 0 ? (
            <p className="catalog-meta">Показаны первые {visibleRowErrors.length} ошибок из {importReport.rowErrors.length}.</p>
          ) : null}
        </div>
      ) : null}

      <div className="detail-block">
        <h4 className="detail-title">Доступные типы и режимы</h4>
        {catalogImportTypeOptions.map((typeOption) => (
          <p key={typeOption.value} className="detail-copy">
            {typeOption.label}: {typeOption.description}
          </p>
        ))}
        {catalogImportModeOptions.map((modeOption) => (
          <p key={modeOption.value} className="detail-copy">
            {modeOption.label}: {modeOption.description}
          </p>
        ))}
      </div>

      <div className="detail-block">
        <div className="catalog-import-examples-header">
          <h4 className="detail-title">Примеры CSV-файлов</h4>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadExamples()}
            disabled={isExamplesLoading || isSubmitting || isDownloadingExampleKey !== null}
          >
            {isExamplesLoading ? 'Загрузка...' : 'Обновить список'}
          </button>
        </div>

        {examplesErrorMessage ? (
          <p className="form-error" role="alert">
            {examplesErrorMessage}
          </p>
        ) : null}

        {isExamplesLoading ? (
          <p className="catalog-meta">Загрузка списка примеров...</p>
        ) : examples.length ? (
          <ul className="catalog-import-example-list">
            {examples.map((example) => {
              const exampleKey = buildExampleKey(example);
              const isDownloadingCurrent = isDownloadingExampleKey === exampleKey;

              return (
                <li key={exampleKey} className="catalog-import-example-item">
                  <div className="catalog-import-example-copy">
                    <p className="catalog-import-example-title">
                      {getCatalogImportTypeLabel(example.importType)} - {getCatalogImportModeLabel(example.importMode)}
                    </p>
                    <p className="catalog-import-example-meta">{example.fileName}</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleDownloadExample(example)}
                    disabled={isDownloadingCurrent || isSubmitting}
                  >
                    {isDownloadingCurrent ? 'Скачивание...' : 'Скачать'}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="catalog-meta">Бэкенд не вернул примеры файлов.</p>
        )}

        {downloadStatusMessage ? (
          <p
            className={downloadStatusKind === 'success' ? 'form-success' : 'form-error'}
            role={downloadStatusKind === 'error' ? 'alert' : 'status'}
          >
            {downloadStatusMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
