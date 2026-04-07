import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    label: 'Модификаторы',
    to: '/modifier-groups',
    badge: 'Активно',
  },
  {
    label: 'Импорт CSV',
    to: '/catalog-import',
    badge: 'Активно',
  },
  {
    label: 'Заказы',
    to: '/orders',
    badge: 'Активно',
  },
  {
    label: 'Статусы заказов',
    to: '/order-statuses',
    badge: 'Активно',
  },
  {
    label: 'Доставка',
    to: '/delivery',
    badge: 'Активно',
  },
  {
    label: 'Баннеры',
    to: '/hero-banners',
    badge: 'Активно',
  },
] as const;

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    handleClose();
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div className="nav-trigger-bar">
        <button type="button" className="nav-drawer-trigger" onClick={handleOpen}>
          Меню
        </button>
      </div>

      {isOpen ? (
        <div className="nav-drawer-root" role="presentation">
          <button type="button" className="nav-drawer-backdrop" aria-label="Закрыть меню" onClick={handleClose} />

          <aside className="sidebar sidebar-drawer" role="dialog" aria-modal="true" aria-label="Основная навигация">
            <div className="sidebar-header">
              <div className="brand-block">
                <span className="brand-kicker">Webman CMS</span>
                <h1 className="brand-title">Панель управления</h1>
                <p className="brand-copy">Основа для управления каталогом, заказами и контентом.</p>
              </div>

              <button type="button" className="secondary-button nav-drawer-close" onClick={handleClose}>
                Закрыть
              </button>
            </div>

            <nav className="nav-list" aria-label="Основная навигация">
              {navItems.map((item) =>
                'to' in item ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) => `nav-item nav-link${isActive ? ' nav-link-active' : ''}`}
                    onClick={handleClose}
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
        </div>
      ) : null}
    </>
  );
}
