import type { PromoCodeDiscountType } from '@/entities/promo-code';
import { Input, Select } from '@/shared/ui';
import { PROMO_CODE_ACTIVITY_OPTIONS, PROMO_CODE_DISCOUNT_TYPE_OPTIONS, type PromoCodeActivityFilter } from '@/pages/promo-codes/model/promoCodePage';

type PromoCodeFiltersProps = {
  searchQuery: string;
  activityFilter: PromoCodeActivityFilter;
  discountTypeFilter: PromoCodeDiscountType | '';
  onSearchQueryChange: (value: string) => void;
  onActivityFilterChange: (value: PromoCodeActivityFilter) => void;
  onDiscountTypeFilterChange: (value: PromoCodeDiscountType | '') => void;
  onSubmit: () => void;
};

export function PromoCodeFilters({
  searchQuery,
  activityFilter,
  discountTypeFilter,
  onSearchQueryChange,
  onActivityFilterChange,
  onDiscountTypeFilterChange,
  onSubmit,
}: PromoCodeFiltersProps) {
  return (
    <form
      className="grid gap-3 lg:grid-cols-[minmax(16rem,24rem)_minmax(10rem,12rem)_minmax(12rem,15rem)]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Input
        id="promo-codes-search"
        type="search"
        className="h-10 rounded-xl bg-background/80"
        placeholder="Поиск по коду"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />

      <Select
        id="promo-codes-activity"
        value={activityFilter}
        className="h-10 rounded-xl bg-background/80"
        onChange={(event) => onActivityFilterChange(event.target.value as PromoCodeActivityFilter)}
      >
        {PROMO_CODE_ACTIVITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        id="promo-codes-discount-type"
        value={discountTypeFilter}
        className="h-10 rounded-xl bg-background/80"
        onChange={(event) => onDiscountTypeFilterChange(event.target.value as PromoCodeDiscountType | '')}
      >
        <option value="">Все типы скидки</option>
        {PROMO_CODE_DISCOUNT_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </form>
  );
}
