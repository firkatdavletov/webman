import { CatalogImportPanel } from '@/features/catalog-import';
import { NavBar } from '@/shared/ui/NavBar';

export function CatalogImportPage() {
  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Каталог</p>
            <h2 className="page-title">Импорт CSV</h2>
          </div>
          <div className="dashboard-actions">
            <span className="status-chip">Категории, продукты и модификаторы</span>
          </div>
        </header>

        <CatalogImportPanel
          title="Импорт CSV каталога"
          description="Выберите тип данных, режим импорта и загрузите CSV-файл в кодировке UTF-8."
        />
      </main>
    </div>
  );
}
