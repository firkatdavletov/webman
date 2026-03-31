import { Link } from 'react-router-dom';
import { CatalogImportPanel } from '@/features/catalog-import';
import { NavBar } from '@/shared/ui/NavBar';

export function ModifierImportPage() {
  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link className="breadcrumb-link" to="/categories">
            Каталог
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" to="/modifier-groups">
            Модификаторы
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Импорт CSV</span>
        </nav>

        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Импорт модификаторов</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">Группы, опции и связи с товарами</span>
            <Link className="secondary-link" to="/modifier-groups">
              К списку групп
            </Link>
          </div>
        </header>

        <CatalogImportPanel
          title="Импорт CSV модификаторов"
          description="Загрузите CSV-файлы для групп модификаторов, опций и связей товар ↔ группа."
          initialImportType="MODIFIER_GROUP"
          allowedImportTypes={['MODIFIER_GROUP', 'MODIFIER_OPTION', 'PRODUCT_MODIFIER_GROUP_LINK']}
        />
      </main>
    </div>
  );
}
