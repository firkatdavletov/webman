import { CatalogImportPanel } from '@/features/catalog-import';
import { AdminPage, AdminPageHeader } from '@/shared/ui';

export function CatalogImportPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        kicker="Каталог"
        title="Импорт CSV"
        description="Импорт категорий, продуктов, модификаторов и связей из CSV-файлов."
      />
      <CatalogImportPanel />
    </AdminPage>
  );
}
