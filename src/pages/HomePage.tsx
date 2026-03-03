import { NavBar } from '../components/NavBar';

export function HomePage() {
  return (
    <div className="app-shell">
      <NavBar />

      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <p className="page-kicker">Панель</p>
            <h2 className="page-title">Панель управления</h2>
          </div>
          <span className="status-chip">Защищенный маршрут</span>
        </header>

        <section className="placeholder-card" aria-label="Заглушка roadmap">
          <p className="placeholder-eyebrow">Рабочая зона</p>
          <h3 className="placeholder-title">Скоро</h3>
          <p className="placeholder-copy">
            Здесь можно добавить инструменты для каталога, заказов и контента без изменения маршрутизации и базовой
            авторизации.
          </p>
        </section>
      </main>
    </div>
  );
}
