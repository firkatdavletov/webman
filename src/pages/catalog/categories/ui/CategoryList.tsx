import { Link } from 'react-router-dom';
import type { CategoryTreeItem } from '@/entities/category';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui';

type CategoryListProps = {
  items: CategoryTreeItem[];
  focusedCategoryId: string | null;
};

export function CategoryList({ items, focusedCategoryId }: CategoryListProps) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => {
        const metaParts: string[] = [];
        const isFocused = focusedCategoryId === item.category.id;
        const childCount = item.category.children.length;

        if (item.parentTitle) {
          metaParts.push(`Родитель: ${item.parentTitle}`);
        }

        return (
          <li key={item.category.id} style={{ paddingLeft: `${Math.min(item.depth, 4) * 18}px` }}>
            <Link
              to={`/categories/${item.category.id}`}
              className={cn(
                'group block rounded-[1.5rem] border border-border/70 bg-background/70 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
                isFocused && 'border-primary/45 bg-primary/5 shadow-md ring-2 ring-primary/15',
              )}
            >
              <article className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {item.category.title}
                    </h3>
                    {isFocused ? (
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[0.72rem]">
                        В фокусе
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">Уровень вложенности: {item.depth + 1}</p>
                  {metaParts.length ? <p className="text-sm leading-6 text-muted-foreground">{metaParts.join(' • ')}</p> : null}
                </div>

                <Badge
                  variant={childCount ? 'outline' : 'secondary'}
                  className="h-auto self-start rounded-full px-3 py-1.5 text-[0.72rem] font-medium"
                >
                  {childCount ? `Дочерних категорий: ${childCount}` : 'Листовая категория'}
                </Badge>
              </article>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
