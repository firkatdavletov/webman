import { Link } from 'react-router-dom';
import type { CategoryTreeItem } from '@/entities/category';

type CategoryListProps = {
  items: CategoryTreeItem[];
  focusedCategoryId: string | null;
};

export function CategoryList({ items, focusedCategoryId }: CategoryListProps) {
  return (
    <ul className="category-tree">
      {items.map((item) => {
        const metaParts: string[] = [];

        if (item.category.sku) {
          metaParts.push(`SKU ${item.category.sku}`);
        }

        if (item.parentTitle) {
          metaParts.push(`Родитель: ${item.parentTitle}`);
        }

        return (
          <li key={item.category.id} className="category-branch-item">
            <Link
              className="category-node-link-wrapper"
              to={`/categories/${item.category.id}`}
              style={{ marginLeft: `${Math.min(item.depth, 4) * 18}px` }}
            >
              <article className={`category-node${focusedCategoryId === item.category.id ? ' category-node-focused' : ''}`}>
                <div className="category-node-header">
                  <div className="category-node-copy">
                    <h4 className="category-node-title">{item.category.title}</h4>
                    {metaParts.length ? <p className="category-node-meta">{metaParts.join(' • ')}</p> : null}
                  </div>
                </div>

                {item.category.children.length ? (
                  <p className="category-node-meta">Дочерних категорий: {item.category.children.length}</p>
                ) : null}
              </article>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
