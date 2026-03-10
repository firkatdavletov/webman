import { Link } from 'react-router-dom';
import type { CategoryTreeItem } from '@/entities/category';

type CategoryListProps = {
  items: CategoryTreeItem[];
  focusedCategoryId: string | null;
};

export function CategoryList({ items, focusedCategoryId }: CategoryListProps) {
  return (
    <ul className="category-tree">
      {items.map((item) => (
        <li key={item.category.id} className="category-branch-item">
          <article
            className={`category-node${focusedCategoryId === item.category.id ? ' category-node-focused' : ''}`}
            style={{ marginLeft: `${Math.min(item.depth, 4) * 18}px` }}
          >
            <div className="category-node-header">
              <div className="category-node-copy">
                <h4 className="category-node-title">{item.category.title}</h4>
                <p className="category-node-meta">
                  ID {item.category.id}
                  {item.category.sku ? ` • SKU ${item.category.sku}` : ''}
                  {item.parentTitle ? ` • Родитель: ${item.parentTitle}` : ' • Корневая'}
                </p>
              </div>
              <span className="status-chip category-node-chip">{item.nestedProducts} шт.</span>
            </div>

            <p className="category-node-meta">
              Уровень {item.depth + 1}
              {item.category.children.length ? ` • Дочерних категорий: ${item.category.children.length}` : ' • Конечная'}
            </p>

            {item.category.imageUrl ? (
              <p className="category-node-meta category-node-link" title={item.category.imageUrl}>
                {item.category.imageUrl}
              </p>
            ) : null}

            <div className="product-card-actions">
              <Link className="secondary-link" to={`/categories/${item.category.id}`}>
                Открыть карточку
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
