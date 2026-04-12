export type AppNavigationItem = {
  label: string;
  to: string;
};

export const appNavigationItems: AppNavigationItem[] = [
  { label: 'Категории', to: '/categories' },
  { label: 'Продукты', to: '/products' },
  { label: 'Модификаторы', to: '/modifier-groups' },
  { label: 'Импорт CSV', to: '/catalog-import' },
  { label: 'Заказы', to: '/orders' },
  { label: 'Статусы заказов', to: '/order-statuses' },
  { label: 'Доставка', to: '/delivery' },
  { label: 'Баннеры', to: '/hero-banners' },
  { label: 'Документы', to: '/legal-documents' },
];
