export type CatalogImportMode = 'products' | 'categories';
export type CatalogImportAction = 'insert' | 'update';

type CatalogImportRequest = {
  file: File;
  mode: CatalogImportMode;
  importMode: CatalogImportAction;
};

export type CatalogImportResult = {
  success: boolean;
  error: string | null;
  code: number | null;
};

export async function importCatalogFile({
  file,
  mode,
  importMode,
}: CatalogImportRequest): Promise<CatalogImportResult> {
  void file;
  void mode;
  void importMode;

  return {
    success: false,
    error: 'CSV-импорт отключен: endpoint для импорта отсутствует в текущем openapi.yaml.',
    code: null,
  };
}
