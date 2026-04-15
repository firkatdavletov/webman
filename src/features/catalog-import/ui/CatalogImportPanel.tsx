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
import {
  AdminEmptyState,
  AdminNotice,
  AdminSectionCard,
  Button,
  FormField,
} from '@/shared/ui';

type StatusKind = 'idle' | 'success' | 'error';

type CatalogImportPanelProps = {
  title?: string;
  description?: string;
  initialImportType?: CatalogImportType;
  allowedImportTypes?: CatalogImportType[];
};

const SELECT_CLASSNAME =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const [isDownloadingType, setIsDownloadingType] = useState<CatalogImportType | null>(null);
  const [downloadStatusMessage, setDownloadStatusMessage] = useState('');
  const [downloadStatusKind, setDownloadStatusKind] = useState<StatusKind>('idle');

  const visibleImportTypeOptions = useMemo(() => {
    if (!allowedImportTypes?.length) return catalogImportTypeOptions;
    const allowedSet = new Set(allowedImportTypes);
    return catalogImportTypeOptions.filter((o) => allowedSet.has(o.value));
  }, [allowedImportTypes]);

  useEffect(() => {
    if (!visibleImportTypeOptions.length) return;
    if (!visibleImportTypeOptions.some((o) => o.value === importType)) {
      setImportType(visibleImportTypeOptions[0].value);
    }
  }, [importType, visibleImportTypeOptions]);

  const selectedImportTypeOption = visibleImportTypeOptions.find((o) => o.value === importType) ?? null;
  const selectedImportModeOption = catalogImportModeOptions.find((o) => o.value === importMode) ?? null;

  // One example per import type — templates are identical across modes
  const typeExamples = useMemo(() => {
    const seen = new Set<CatalogImportType>();
    return examples.filter((ex) => {
      if (seen.has(ex.importType)) return false;
      seen.add(ex.importType);
      return true;
    });
  }, [examples]);

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
    setSelectedFile(event.target.files?.[0] ?? null);
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

    const result = await importCatalogFile({ file: selectedFile, importType, importMode });

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
      setStatusMessage(`Импорт завершён с ошибками: ${result.report.errorCount} строк(и) не прошли проверку.`);
    } else {
      setStatusKind('success');
      setStatusMessage('Импорт выполнен успешно.');
    }

    setIsSubmitting(false);
  };

  const handleDownloadExample = async (example: CatalogImportExample) => {
    setIsDownloadingType(example.importType);
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
      setDownloadStatusMessage(`Файл "${example.fileName}" скачан.`);
    }

    setIsDownloadingType(null);
  };

  return (
    <>
      <AdminSectionCard eyebrow="Импорт" title={title} description={description}>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              htmlFor="catalog-import-type"
              label="Тип данных"
              description={selectedImportTypeOption?.description}
            >
              <select
                id="catalog-import-type"
                name="importType"
                className={SELECT_CLASSNAME}
                value={importType}
                onChange={(e) => setImportType(e.target.value as CatalogImportType)}
                disabled={isSubmitting}
              >
                {visibleImportTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              htmlFor="catalog-import-mode"
              label="Режим импорта"
              description={selectedImportModeOption?.description}
            >
              <select
                id="catalog-import-mode"
                name="importMode"
                className={SELECT_CLASSNAME}
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as CatalogImportMode)}
                disabled={isSubmitting}
              >
                {catalogImportModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-2.5">
            <label className="text-sm font-medium text-foreground" htmlFor="catalog-import-file">
              CSV-файл
            </label>
            <input
              ref={fileInputRef}
              id="catalog-import-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              className="w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:opacity-50"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            {selectedFile ? (
              <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">
                {selectedFile.name} — {formatFileSize(selectedFile.size)}
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                CSV с заголовком в первой строке, кодировка UTF-8.
              </p>
            )}
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Импорт...' : 'Запустить импорт'}
            </Button>
          </div>

          {statusMessage ? (
            <AdminNotice
              tone={statusKind === 'success' ? 'default' : 'destructive'}
              role={statusKind === 'error' ? 'alert' : 'status'}
            >
              {statusMessage}
            </AdminNotice>
          ) : null}
        </form>
      </AdminSectionCard>

      {importReport ? (
        <AdminSectionCard eyebrow="Результат" title="Отчёт импорта">
          <p className="text-sm text-muted-foreground">
            {getCatalogImportTypeLabel(importReport.importType)} — {getCatalogImportModeLabel(importReport.importMode)}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Всего', value: importReport.totalRows },
              { label: 'Успешно', value: importReport.successCount },
              { label: 'Создано', value: importReport.createdCount },
              { label: 'Обновлено', value: importReport.updatedCount },
              { label: 'Пропущено', value: importReport.skippedCount },
              { label: 'Ошибки', value: importReport.errorCount },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {visibleRowErrors.length ? (
            <ul className="space-y-1.5">
              {visibleRowErrors.map((errorItem) => (
                <li
                  key={`${errorItem.rowNumber}-${errorItem.errorCode}-${errorItem.message}`}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  <span className="font-medium">
                    Строка {errorItem.rowNumber}
                    {errorItem.rowKey ? ` (${errorItem.rowKey})` : ''}:
                  </span>{' '}
                  {errorItem.message}. {getCatalogImportErrorLabel(errorItem.errorCode)}.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Ошибок по строкам нет.</p>
          )}

          {hiddenRowErrorsCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              Показаны первые {visibleRowErrors.length} из {importReport.rowErrors.length} ошибок.
            </p>
          ) : null}
        </AdminSectionCard>
      ) : null}

      <AdminSectionCard
        eyebrow="Шаблоны"
        title="CSV-шаблоны"
        description="Один шаблон на тип данных — подходит для всех режимов импорта."
        action={
          <Button
            variant="outline"
            onClick={() => void loadExamples()}
            disabled={isExamplesLoading || isSubmitting || isDownloadingType !== null}
          >
            {isExamplesLoading ? 'Загрузка...' : 'Обновить'}
          </Button>
        }
      >
        {examplesErrorMessage ? (
          <AdminNotice tone="destructive" role="alert">
            {examplesErrorMessage}
          </AdminNotice>
        ) : null}

        {isExamplesLoading ? (
          <AdminEmptyState description="Загружаем список шаблонов..." />
        ) : typeExamples.length ? (
          <ul className="divide-y divide-border/60">
            {typeExamples.map((example) => (
              <li
                key={example.importType}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {getCatalogImportTypeLabel(example.importType)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{example.fileName}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownloadExample(example)}
                  disabled={isDownloadingType === example.importType || isSubmitting}
                >
                  {isDownloadingType === example.importType ? 'Скачивание...' : 'Скачать'}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState description="Бэкенд не вернул шаблоны." />
        )}

        {downloadStatusMessage ? (
          <AdminNotice
            tone={downloadStatusKind === 'success' ? 'default' : 'destructive'}
            role={downloadStatusKind === 'error' ? 'alert' : 'status'}
          >
            {downloadStatusMessage}
          </AdminNotice>
        ) : null}
      </AdminSectionCard>
    </>
  );
}
