import { getAccessToken } from '../auth/authService';

export type CatalogImportMode = 'products' | 'categories';
export type CatalogImportAction = 'insert' | 'update';
export type CatalogProduct = {
  id: number;
  categoryId: number;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  unit: string;
  displayWeight: string | null;
  countStep: number;
  sku: string | null;
};

export type CatalogCategory = {
  id: number;
  parentCategory: number | null;
  title: string;
  imageUrl: string | null;
  products: CatalogProduct[];
  children: CatalogCategory[];
  sku: string | null;
};

type ImportFileResponseBody = {
  success: boolean;
  error: string | null;
  code: number | null;
};

type GetCategoriesResponseBody = {
  catalog: CatalogCategory[] | null;
  success: boolean;
  error: string | null;
  code: number | null;
};

type GetProductsResponseBody = {
  products: CatalogProduct[];
  success: boolean;
  error: string | null;
  code: number | null;
};

type CatalogImportRequest = {
  file: File;
  mode: CatalogImportMode;
  importMode: CatalogImportAction;
};

export type CatalogImportResult = {
  success: boolean;
  error: string | null;
  code: number | null;
};

export type CatalogCategoriesResult = {
  categories: CatalogCategory[];
  error: string | null;
};

export type CatalogProductsResult = {
  products: CatalogProduct[];
  error: string | null;
};

const CATALOG_IMPORT_ENDPOINT = '/admin/catalog/import';
const CATALOG_CATEGORIES_ENDPOINT = '/catalog/categories';
const CATALOG_PRODUCTS_ENDPOINT = '/catalog/products/all';

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function importCatalogFile({
  file,
  mode,
  importMode,
}: CatalogImportRequest): Promise<CatalogImportResult> {
  const formData = new FormData();
  const accessToken = getAccessToken();
  const headers = new Headers();

  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('importMode', importMode);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await window.fetch(CATALOG_IMPORT_ENDPOINT, {
      method: 'POST',
      headers,
      body: formData,
    });

    const body = await parseJson<ImportFileResponseBody>(response);

    if (!body) {
      return {
        success: false,
        error: 'Сервис импорта каталога вернул некорректный ответ.',
        code: null,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: body.error ?? 'Не удалось выполнить импорт каталога.',
        code: body.code,
      };
    }

    return {
      success: body.success,
      error: body.error,
      code: body.code,
    };
  } catch {
    return {
      success: false,
      error: 'Не удалось связаться с сервисом импорта каталога.',
      code: null,
    };
  }
}

export async function getCategories(): Promise<CatalogCategoriesResult> {
  try {
    const response = await window.fetch(CATALOG_CATEGORIES_ENDPOINT);
    const body = await parseJson<GetCategoriesResponseBody>(response);

    if (!body) {
      return {
        categories: [],
        error: 'Сервис категорий вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success) {
      return {
        categories: body.catalog ?? [],
        error: body.error ?? 'Не удалось загрузить категории.',
      };
    }

    return {
      categories: body.catalog ?? [],
      error: null,
    };
  } catch {
    return {
      categories: [],
      error: 'Не удалось связаться с сервисом категорий.',
    };
  }
}

export async function getAllProducts(): Promise<CatalogProductsResult> {
  try {
    const response = await window.fetch(CATALOG_PRODUCTS_ENDPOINT);
    const body = await parseJson<GetProductsResponseBody>(response);

    if (!body) {
      return {
        products: [],
        error: 'Сервис товаров вернул некорректный ответ.',
      };
    }

    if (!response.ok || !body.success) {
      return {
        products: body.products ?? [],
        error: body.error ?? 'Не удалось загрузить товары.',
      };
    }

    return {
      products: body.products ?? [],
      error: null,
    };
  } catch {
    return {
      products: [],
      error: 'Не удалось связаться с сервисом товаров.',
    };
  }
}
