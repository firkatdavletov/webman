import type {
  CatalogImportErrorCode,
  CatalogImportMode,
  CatalogImportType,
} from '@/features/catalog-import/api/catalogImportApi';

type CatalogImportTypeOption = {
  value: CatalogImportType;
  label: string;
  description: string;
};

type CatalogImportModeOption = {
  value: CatalogImportMode;
  label: string;
  description: string;
};

const catalogImportErrorLabels: Record<CatalogImportErrorCode, string> = {
  MISSING_REQUIRED_FIELD: 'Не заполнено обязательное поле',
  INVALID_BOOLEAN: 'Неверное булево значение',
  INVALID_NUMBER: 'Некорректное число',
  DUPLICATE_KEY_IN_FILE: 'Дублирование ключа в файле',
  CATEGORY_NOT_FOUND: 'Категория не найдена',
  PARENT_CATEGORY_NOT_FOUND: 'Родительская категория не найдена',
  AMBIGUOUS_MATCH: 'Найдено несколько совпадений',
  INVALID_RELATION: 'Некорректная связь между сущностями',
  PERSISTENCE_ERROR: 'Ошибка сохранения в базе данных',
};

const catalogImportTypeLabels: Record<CatalogImportType, string> = {
  CATEGORY: 'Категории',
  PRODUCT: 'Продукты',
};

const catalogImportModeLabels: Record<CatalogImportMode, string> = {
  VALIDATE_ONLY: 'Проверка',
  CREATE_ONLY: 'Только создание',
  UPSERT: 'Обновление и создание',
};

export const catalogImportTypeOptions: CatalogImportTypeOption[] = [
  {
    value: 'PRODUCT',
    label: catalogImportTypeLabels.PRODUCT,
    description: 'Импортирует карточки товаров и обновляет данные по SKU.',
  },
  {
    value: 'CATEGORY',
    label: catalogImportTypeLabels.CATEGORY,
    description: 'Импортирует дерево категорий и связи между родительскими узлами.',
  },
];

export const catalogImportModeOptions: CatalogImportModeOption[] = [
  {
    value: 'VALIDATE_ONLY',
    label: catalogImportModeLabels.VALIDATE_ONLY,
    description: 'Проверяет файл и возвращает ошибки без изменения каталога.',
  },
  {
    value: 'CREATE_ONLY',
    label: catalogImportModeLabels.CREATE_ONLY,
    description: 'Создает только новые записи и пропускает существующие.',
  },
  {
    value: 'UPSERT',
    label: catalogImportModeLabels.UPSERT,
    description: 'Создает новые записи и обновляет существующие.',
  },
];

export function getCatalogImportTypeLabel(importType: CatalogImportType): string {
  return catalogImportTypeLabels[importType];
}

export function getCatalogImportModeLabel(importMode: CatalogImportMode): string {
  return catalogImportModeLabels[importMode];
}

export function getCatalogImportErrorLabel(errorCode: CatalogImportErrorCode): string {
  return catalogImportErrorLabels[errorCode] ?? 'Ошибка импорта';
}
