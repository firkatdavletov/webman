import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '@/entities/session';

const navItems = [
  {
    label: 'Категории',
    to: '/categories',
    badge: 'Активно',
  },
  {
    label: 'Продукты',
    to: '/products',
    badge: 'Активно',
  },
  {
    label: 'Заказы',
    to: '/orders',
    badge: 'Активно',
  },
  {
    label: 'Контент',
    badge: 'Скоро',
  },
] as const;

export function NavBar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <span className="brand-kicker">Webman CMS</span>
        <h1 className="brand-title">Панель управления</h1>
        <p className="brand-copy">Основа для управления каталогом, заказами и контентом.</p>
      </div>

      <nav className="nav-list" aria-label="Основная навигация">
        {navItems.map((item) =>
          'to' in item ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `nav-item nav-link${isActive ? ' nav-link-active' : ''}`}
            >
              {item.label}
              <span className={`nav-badge${item.badge === 'Активно' ? ' nav-badge-live' : ''}`}>{item.badge}</span>
            </NavLink>
          ) : (
            <button key={item.label} type="button" className="nav-item nav-link-disabled" disabled>
              {item.label}
              <span className="nav-badge">{item.badge}</span>
            </button>
          ),
        )}
      </nav>

      <button type="button" className="logout-button" onClick={handleLogout}>
        Выйти
      </button>
    </aside>
  );
}
