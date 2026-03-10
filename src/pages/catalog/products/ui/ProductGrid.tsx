import { Link } from 'react-router-dom';
import type { Product } from '@/entities/product';
import { formatPrice } from '@/entities/product';

type ProductGridProps = {
  products: Product[];
  categoryLookup: Map<string, string>;
};

export function ProductGrid({ products, categoryLookup }: ProductGridProps) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <Link key={product.id} className="product-card-link-wrapper" to={`/products/${product.id}`}>
          <article className="product-card">
            <div className="product-card-header">
              <div className="product-card-copy">
                <h4 className="product-card-title">{product.title}</h4>
                <p className="product-card-meta">SKU {product.sku ?? 'Не указан'}</p>
              </div>
              <span className="product-price">{formatPrice(product.price)}</span>
            </div>

            <p className="product-card-meta">Категория: {categoryLookup.get(product.categoryId) ?? `#${product.categoryId}`}</p>
          </article>
        </Link>
      ))}
    </div>
  );
}
