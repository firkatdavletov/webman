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
  INVALID_ENUM: 'Недопустимое значение из справочника',
  DUPLICATE_KEY_IN_FILE: 'Дублирование ключа в файле',
  CATEGORY_NOT_FOUND: 'Категория не найдена',
  PARENT_CATEGORY_NOT_FOUND: 'Родительская категория не найдена',
  MODIFIER_GROUP_NOT_FOUND: 'Группа модификаторов не найдена',
  PRODUCT_NOT_FOUND: 'Товар не найден',
  ENTITY_ALREADY_EXISTS: 'Сущность уже существует',
  INVALID_MIN_MAX_RULE: 'Некорректные ограничения min/max',
  AMBIGUOUS_MATCH: 'Найдено несколько совпадений',
  INVALID_RELATION: 'Некорректная связь между сущностями',
  PERSISTENCE_ERROR: 'Ошибка сохранения в базе данных',
};

const catalogImportTypeLabels: Record<CatalogImportType, string> = {
  CATEGORY: 'Категории',
  PRODUCT: 'Продукты',
  MODIFIER_GROUP: 'Группы модификаторов',
  MODIFIER_OPTION: 'Опции модификаторов',
  PRODUCT_MODIFIER_GROUP_LINK: 'Связи товар ↔ модификатор',
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
  {
    value: 'MODIFIER_GROUP',
    label: catalogImportTypeLabels.MODIFIER_GROUP,
    description: 'Импортирует справочник групп модификаторов, правила выбора и статус активности.',
  },
  {
    value: 'MODIFIER_OPTION',
    label: catalogImportTypeLabels.MODIFIER_OPTION,
    description: 'Импортирует опции модификаторов внутри групп, цены и поведение по умолчанию.',
  },
  {
    value: 'PRODUCT_MODIFIER_GROUP_LINK',
    label: catalogImportTypeLabels.PRODUCT_MODIFIER_GROUP_LINK,
    description: 'Импортирует связи между товарами и группами модификаторов.',
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
