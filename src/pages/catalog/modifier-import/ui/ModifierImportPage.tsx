import { Link } from 'react-router-dom';
import { CatalogImportPanel } from '@/features/catalog-import';
import { AdminPage, AdminPageHeader, AdminPageStatus } from '@/shared/ui';

export function ModifierImportPage() {
  return (
    <AdminPage>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Хлебные крошки">
        <Link className="transition-colors hover:text-foreground" to="/categories">
          Каталог
        </Link>
        <span>/</span>
        <Link className="transition-colors hover:text-foreground" to="/modifier-groups">
          Модификаторы
        </Link>
        <span>/</span>
        <span className="text-foreground">Импорт CSV</span>
      </nav>

      <AdminPageHeader
        kicker="Каталог"
        title="Импорт модификаторов"
        actions={
          <>
            <AdminPageStatus>Группы, опции и связи с товарами</AdminPageStatus>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              to="/modifier-groups"
            >
              К списку групп
            </Link>
          </>
        }
      />

      <CatalogImportPanel
        title="Импорт CSV модификаторов"
        description="Загрузите CSV-файлы для групп модификаторов, опций и связей товар ↔ группа."
        initialImportType="MODIFIER_GROUP"
        allowedImportTypes={['MODIFIER_GROUP', 'MODIFIER_OPTION', 'PRODUCT_MODIFIER_GROUP_LINK']}
      />
    </AdminPage>
  );
}
