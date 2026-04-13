import type { LucideIcon } from 'lucide-react';
import {
  FileTextIcon,
  ImageIcon,
  LayoutGridIcon,
  ListChecksIcon,
  PackageIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  TruckIcon,
  UploadIcon,
} from 'lucide-react';

export type AppNavigationItem = {
  group: string;
  icon: LucideIcon;
  label: string;
  to: string;
};

export const appNavigationItems: AppNavigationItem[] = [
  { group: 'Каталог', icon: LayoutGridIcon, label: 'Категории', to: '/categories' },
  { group: 'Каталог', icon: PackageIcon, label: 'Продукты', to: '/products' },
  { group: 'Каталог', icon: SlidersHorizontalIcon, label: 'Модификаторы', to: '/modifier-groups' },
  { group: 'Каталог', icon: UploadIcon, label: 'Импорт CSV', to: '/catalog-import' },
  { group: 'Операции', icon: ShoppingCartIcon, label: 'Заказы', to: '/orders' },
  { group: 'Операции', icon: ListChecksIcon, label: 'Статусы заказов', to: '/order-statuses' },
  { group: 'Операции', icon: TruckIcon, label: 'Доставка', to: '/delivery' },
  { group: 'Контент', icon: ImageIcon, label: 'Баннеры', to: '/hero-banners' },
  { group: 'Контент', icon: FileTextIcon, label: 'Документы', to: '/legal-documents' },
];
