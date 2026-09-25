import HeroBanner from '@/redesign/components/hero/HeroBanner';
import FilterBar from '@/redesign/components/hero/FilterBar';

/**
 * Верх главной: баннер из админки и фильтр-бар.
 * Логика разнесена по hero/HeroBanner, hero/FilterBar и hero/RangeSlider.
 */
const HeroSearch = () => (
  <>
    <HeroBanner />
    <FilterBar />
  </>
);

export default HeroSearch;
