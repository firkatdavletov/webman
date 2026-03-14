import { Link } from 'react-router-dom';
import type { Product } from '@/entities/product';
import { formatPrice } from '@/entities/product';

type ProductTableProps = {
  products: Product[];
  categoryLookup: Map<string, string>;
};

export function ProductTable({ products, categoryLookup }: ProductTableProps) {
  return (
    <div className="products-table-wrap">
      <table className="products-table">
        <thead>
          <tr>
            <th scope="col">SKU</th>
            <th scope="col">Наименование</th>
            <th scope="col">Наименование категории</th>
            <th scope="col">Цена</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="products-cell-muted">{product.sku?.trim() || 'Не указан'}</td>
              <td>
                <Link className="product-table-title-link" to={`/products/${product.id}`}>
                  {product.title.trim() || 'Без названия'}
                </Link>
              </td>
              <td className="products-cell-muted">{categoryLookup.get(product.categoryId) ?? `#${product.categoryId}`}</td>
              <td className="products-cell-price">{formatPrice(product.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
