import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import {
  CatalogImportAction,
  CatalogImportMode,
  importCatalogFile,
} from '../catalog/catalogService';

type CatalogImportPanelProps = {
  mode: CatalogImportMode;
  title: string;
  description: string;
  onImportSuccess?: () => Promise<void> | void;
  disabled?: boolean;
};

const importModeOptions: Array<{ value: CatalogImportAction; label: string; description: string }> = [
  {
    value: 'insert',
    label: 'Вставка',
    description: 'Создает новый набор данных и деактивирует предыдущие записи.',
  },
  {
    value: 'update',
    label: 'Обновление',
    description: 'Обновляет существующие записи по SKU и сохраняет текущую структуру каталога.',
  },
];

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function CatalogImportPanel({
  mode,
  title,
  description,
  onImportSuccess,
  disabled = false,
}: CatalogImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<CatalogImportAction>('insert');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<'idle' | 'success' | 'error'>('idle');

  const isBusy = disabled || isSubmitting;

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
      mode,
      importMode,
    });

    if (result.success) {
      setStatusKind('success');
      setStatusMessage('Импорт выполнен успешно.');
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await onImportSuccess?.();
    } else {
      setStatusKind('error');
      setStatusMessage(result.error ?? 'Не удалось выполнить импорт каталога.');
    }

    setIsSubmitting(false);
  };

  return (
    <form className="catalog-card catalog-form" onSubmit={handleSubmit} noValidate>
      <div className="catalog-card-copy">
        <p className="placeholder-eyebrow">Импорт</p>
        <h3 className="catalog-card-title">{title}</h3>
        <p className="catalog-card-text">{description}</p>
      </div>

      <div className="detail-block">
        <h4 className="detail-title">Набор данных</h4>
        <p className="detail-copy">{mode === 'categories' ? 'категории' : 'продукты'}</p>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`catalog-import-mode-${mode}`}>
          Режим импорта
        </label>
        <select
          id={`catalog-import-mode-${mode}`}
          name="importMode"
          className="field-input"
          value={importMode}
          onChange={(event) => setImportMode(event.target.value as CatalogImportAction)}
          disabled={isBusy}
        >
          {importModeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`catalog-file-${mode}`}>
          CSV-файл
        </label>
        <input
          ref={fileInputRef}
          id={`catalog-file-${mode}`}
          name="file"
          type="file"
          className="field-input file-input"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </div>

      {selectedFile ? (
        <div className="file-summary" aria-live="polite">
          <span className="file-summary-name">{selectedFile.name}</span>
          <span className="file-summary-size">{formatFileSize(selectedFile.size)}</span>
        </div>
      ) : (
        <p className="catalog-meta">Поддерживается формат UTF-8 CSV с заголовком в первой строке.</p>
      )}

      <div className="detail-block">
        <h4 className="detail-title">Доступные режимы</h4>
        {importModeOptions.map((option) => (
          <p key={option.value} className="detail-copy">
            {option.label}: {option.description}
          </p>
        ))}
      </div>

      {statusMessage ? (
        <p
          className={statusKind === 'success' ? 'form-success' : 'form-error'}
          role={statusKind === 'error' ? 'alert' : 'status'}
        >
          {statusMessage}
        </p>
      ) : null}

      <button type="submit" className="submit-button" disabled={isBusy}>
        {isSubmitting ? 'Импорт...' : 'Запустить импорт'}
      </button>
    </form>
  );
}
