import type { Product } from '@/entities/product';
import {
  buildProductPublishingChecklist,
  getProductPublishingReadyCount,
} from '@/pages/catalog/product-workspace/model/productPublishingChecklist';
import { cn } from '@/shared/lib/cn';
import {
  AdminNotice,
  AdminSectionCard,
  Badge,
  Button,
} from '@/shared/ui';

type ProductPublishingSectionProps = {
  product: Product;
};

function getReadinessClassName(isReady: boolean): string {
  return isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700';
}

function getVisibilityClassName(isActive: boolean): string {
  return isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-border bg-muted/40 text-muted-foreground';
}

function PublishingMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
      <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ProductPublishingSection({ product }: ProductPublishingSectionProps) {
  const checklist = buildProductPublishingChecklist(product);
  const readyCount = getProductPublishingReadyCount(checklist);
  const isReadyForPublishing = readyCount === checklist.length;

  return (
    <AdminSectionCard
      eyebrow="Публикация"
      title="Готовность карточки"
      description="Проверки показывают, можно ли готовить товар к публикации. Видимость на витрине остается отдельным статусом."
      action={
        <Button type="button" disabled>
          {product.isActive ? 'Снять с публикации' : 'Опубликовать'}
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <PublishingMetric
          label="Проверки"
          value={`${readyCount}/${checklist.length}`}
          hint={isReadyForPublishing ? 'Все пункты готовы' : 'Есть пункты, требующие внимания'}
        />
        <PublishingMetric
          label="Конфигурация"
          value={product.isConfigured ? 'Готова' : 'Не готова'}
          hint="Значение приходит из снимка продукта"
        />
        <PublishingMetric
          label="Витрина"
          value={product.isActive ? 'Показывается' : 'Скрыт'}
          hint="Этот статус не заменяет проверки готовности"
        />
      </div>

      <AdminNotice>
        Отдельное действие публикации пока недоступно. Сейчас видимость товара меняется статусом активности в разделе «Основное».
      </AdminNotice>

      <div className="space-y-3">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </div>
            <Badge className={cn('border', getReadinessClassName(item.isReady))}>
              {item.isReady ? 'Готово' : 'Требует внимания'}
            </Badge>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Текущий статус витрины</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {product.isActive
                ? 'Товар активен на витрине, но это не означает, что все проверки готовности пройдены.'
                : 'Товар скрыт с витрины. Перед включением проверьте готовность карточки.'}
            </p>
          </div>
          <Badge className={cn('border', getVisibilityClassName(product.isActive))}>
            {product.isActive ? 'Активен' : 'Выключен'}
          </Badge>
        </div>
      </div>
    </AdminSectionCard>
  );
}
