import { Link } from 'react-router-dom';
import type { Product } from '@/entities/product';
import { formatPrice, formatUnitLabel } from '@/entities/product';

type ProductGridProps = {
  products: Product[];
  categoryLookup: Map<string, string>;
};

export function ProductGrid({ products, categoryLookup }: ProductGridProps) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <article key={product.id} className="product-card">
          <div className="product-card-header">
            <div className="product-card-copy">
              <h4 className="product-card-title">{product.title}</h4>
              <p className="product-card-meta">
                ID {product.id}
                {product.sku ? ` • SKU ${product.sku}` : ''}
              </p>
            </div>
            <span className="product-price">{formatPrice(product.price)}</span>
          </div>

          <p className="product-card-meta">Категория: {categoryLookup.get(product.categoryId) ?? `#${product.categoryId}`}</p>

          <div className="product-badges">
            <span className="product-badge">{formatUnitLabel(product.unit)}</span>
            <span className="product-badge">Шаг {product.countStep}</span>
            {product.displayWeight ? <span className="product-badge">{product.displayWeight}</span> : null}
          </div>

          {product.description ? (
            <p className="product-card-description">{product.description}</p>
          ) : (
            <p className="product-card-description product-card-description-muted">Без описания</p>
          )}

          <div className="product-card-actions">
            <Link className="secondary-link" to={`/products/${product.id}`}>
              Открыть карточку
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
