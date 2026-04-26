import type { LucideIcon } from 'lucide-react';
import {
  FileTextIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  ListChecksIcon,
  PackageIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  StarIcon,
  TruckIcon,
  UploadIcon,
  UsersRoundIcon,
} from 'lucide-react';

export type AppNavigationItem = {
  group: string;
  icon: LucideIcon;
  label: string;
  requiredRole?: 'SUPERADMIN';
  to: string;
};

export const appNavigationItems: AppNavigationItem[] = [
  { group: 'Обзор', icon: LayoutDashboardIcon, label: 'Дашборд', to: '/dashboard' },
  { group: 'Операции', icon: ShoppingCartIcon, label: 'Заказы', to: '/orders' },
  { group: 'Операции', icon: ListChecksIcon, label: 'Статусы заказов', to: '/order-statuses' },
  { group: 'Операции', icon: TruckIcon, label: 'Доставка', to: '/delivery' },
  { group: 'Каталог', icon: LayoutGridIcon, label: 'Категории', to: '/categories' },
  { group: 'Каталог', icon: PackageIcon, label: 'Продукты', to: '/products' },
  { group: 'Каталог', icon: StarIcon, label: 'Популярное', to: '/popular-products' },
  { group: 'Каталог', icon: SlidersHorizontalIcon, label: 'Модификаторы', to: '/modifier-groups' },
  { group: 'Каталог', icon: UploadIcon, label: 'Импорт CSV', to: '/catalog-import' },
  { group: 'Контент', icon: ImageIcon, label: 'Баннеры', to: '/hero-banners' },
  { group: 'Контент', icon: FileTextIcon, label: 'Документы', to: '/legal-documents' },
  { group: 'Управление', icon: UsersRoundIcon, label: 'Сотрудники', requiredRole: 'SUPERADMIN', to: '/employees' },
];
