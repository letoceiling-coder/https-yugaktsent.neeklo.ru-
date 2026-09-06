import { useState, useRef, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Building2, Home, TreePine, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { btnClass } from '@/redesign/lib/button-styles';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import CatalogSearchHintsDropdown from '@/redesign/components/CatalogSearchHintsDropdown';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import type { CatalogHints } from '@/redesign/lib/catalog-hints-types';
import { catalogFiltersIntoSearchParams } from '@/redesign/lib/catalog-url-sync';
import {
  LISTING_KIND_BY_OBJECT_TYPE,
} from '@/redesign/lib/catalog-api-params';
import type { CatalogFilters, ObjectType } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';
import RegionSelector from '@/redesign/components/RegionSelector';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import {
  getCatalogFilterVisibility,
  heroDeadlineFromFilters,
  heroLabelFromRoomCategories,
  HERO_DEADLINE_LABELS,
  HERO_ROOM_TYPE_LABELS,
  filtersFromHeroDeadline,
  isMoscowRegion,
  OBJECT_TYPE_TABS,
  resetFiltersForObjectType,
  roomCategoriesFromHeroLabel,
} from '@/redesign/lib/catalog-filter-config';
import { heroDigitsToRubles } from '@/redesign/lib/catalog-url-sync';

const objectTabIcons: Record<ObjectType, typeof Building2> = {
  apartments: Building2,
  rooms: Building2,
  houses: Home,
  land: TreePine,
  dachas: Home,
  commercial: Store,
};

function useDebouncedCatalogFilters(filters: CatalogFilters, ms: number): CatalogFilters {
  const [debounced, setDebounced] = useState(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), ms);
    return () => clearTimeout(t);
  }, [filters, ms]);
  return debounced;
}

const HeroSearch = () => {
  const { shortName } = useSiteBrand();
  const [filters, setFilters] = useState<CatalogFilters>(() => ({ ...defaultFilters }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [priceFromStr, setPriceFromStr] = useState('');
  const [priceToStr, setPriceToStr] = useState('');

  const navigate = useNavigate();
  const { data: regionId, rows: regionRows, setStoredRegionId } = useDefaultRegionId();
  const debouncedFilters = useDebouncedCatalogFilters(filters, 450);
  const deferredSearch = useDeferredValue(filters.search.trim());

  const visibility = getCatalogFilterVisibility(filters.objectType, {
    marketType: filters.marketType,
    hasBlocks: true,
  });

  const isMoscow = isMoscowRegion(regionRows, regionId);
  const listingKind = LISTING_KIND_BY_OBJECT_TYPE[debouncedFilters.objectType];
  const isApartmentMode = debouncedFilters.objectType === 'apartments';
  const useSecondaryMarket = isApartmentMode && debouncedFilters.marketType === 'secondary';

  const hintsEnabled =
    searchFocused && deferredSearch.length >= 2 && regionId != null;

  const { data: catalogHints, isFetching: hintsLoading } = useQuery({
    queryKey: ['search', 'catalog-hints', regionId, deferredSearch],
    queryFn: () =>
      apiGet<CatalogHints>(
        `/search/catalog-hints?region_id=${regionId}&q=${encodeURIComponent(deferredSearch)}&limit=30`,
      ),
    enabled: hintsEnabled,
    staleTime: 20_000,
  });

  const districtsQuery = useQuery({
    queryKey: ['districts', regionId, listingKind],
    queryFn: () => apiGet<{ name: string }[]>(`/districts?region_id=${regionId}&kind=${listingKind}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const subwaysQuery = useQuery({
    queryKey: ['subways', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/subways?region_id=${regionId}`),
    enabled: regionId != null && isMoscow,
    select: (r) => r.map((x) => x.name),
  });

  const buildersQuery = useQuery({
    queryKey: ['builders', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/builders?region_id=${regionId}`),
    enabled: regionId != null && isApartmentMode,
    select: (r) => r.map((x) => x.name),
  });

  const deadlinesQuery = useQuery({
    queryKey: ['blocks', 'deadlines', regionId],
    queryFn: () => apiGet<string[]>(`/blocks/deadlines?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId) && isApartmentMode,
    staleTime: 5 * 60 * 1000,
  });

  const switchObjectType = useCallback((nextType: ObjectType) => {
    setFilters((prev) => resetFiltersForObjectType(prev, nextType));
    setPriceFromStr('');
    setPriceToStr('');
    setPtOpen(false);
    setDlOpen(false);
  }, []);

  const syncPriceToFilters = useCallback((from: string, to: string) => {
    setFilters((prev) => ({
      ...prev,
      priceMin: heroDigitsToRubles(from),
      priceMax: heroDigitsToRubles(to),
    }));
  }, []);

  const searchRef = useRef<HTMLDivElement>(null);
  const ptRef = useRef<HTMLDivElement>(null);
  const dlRef = useRef<HTMLDivElement>(null);

  const doSearch = () => {
    const params = catalogFiltersIntoSearchParams(new URLSearchParams(), debouncedFilters);
    if (regionId != null) params.set('region_id', String(regionId));
    navigate(`/catalog?${params.toString()}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (ptRef.current && !ptRef.current.contains(e.target as Node)) setPtOpen(false);
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roomLabel = heroLabelFromRoomCategories(filters.rooms);
  const deadlineLabel = heroDeadlineFromFilters(filters.deadline);

  const showHintsPanel = hintsEnabled && filters.search.trim().length >= 2;
  const filterOverlayOpen = showHintsPanel || ptOpen || dlOpen || filtersOpen;

  const heroSubtitle = useMemo(() => {
    switch (filters.objectType) {
      case 'apartments':
        return 'Новостройки и вторичка';
      case 'rooms':
        return 'Комнаты';
      case 'houses':
        return 'Дома и коттеджи';
      case 'dachas':
        return 'Дачи';
      case 'land':
        return 'Земельные участки';
      case 'commercial':
        return 'Коммерческая недвижимость';
      default:
        return 'Поиск недвижимости';
    }
  }, [filters.objectType]);

  const searchPlaceholder = useMemo(() => {
    if (isApartmentMode) return 'Метро, район, ЖК, улица, застройщик';
    if (filters.objectType === 'rooms') return 'Район, адрес, комната';
    if (filters.objectType === 'land') return 'Район, адрес, кадастровый номер';
    if (filters.objectType === 'dachas') return 'Район, адрес, дача';
    return 'Район, адрес, название объекта';
  }, [isApartmentMode, filters.objectType]);

  return (
    <section
      className={cn(
        'relative bg-background overflow-visible',
        filterOverlayOpen && 'z-40 isolate',
      )}
    >
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-6 sm:pt-10 sm:pb-8">
        <div className="flex flex-col items-center gap-3 sm:gap-4 mb-5 sm:mb-6 max-w-3xl mx-auto">
          <RegionSelector
            regions={regionRows}
            selectedRegionId={regionId}
            onSelect={setStoredRegionId}
            className="w-full"
          />
          <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] font-bold leading-tight text-center tracking-tight">
            <span className="text-primary">{shortName}.</span>{' '}
            <span className="text-foreground">{heroSubtitle}</span>
          </h1>
        </div>

        <div className="flex items-center sm:justify-center gap-2 mb-5 sm:mb-6 max-w-full overflow-x-auto pb-0.5 scrollbar-hide">
          {OBJECT_TYPE_TABS.map((tab) => {
            const Icon = objectTabIcons[tab.type];
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => switchObjectType(tab.type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border shrink-0',
                  filters.objectType === tab.type
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border hover:bg-secondary hover:border-primary/30',
                )}
              >
                <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          ref={searchRef}
          className="w-full max-w-[900px] mx-auto bg-card rounded-2xl border border-border/60 shadow-[0_8px_32px_rgba(15,23,42,0.06)] px-4 sm:px-6 py-4 sm:py-5 relative overflow-visible"
        >
          <div className="relative z-20 overflow-visible">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 lg:h-[52px]">
              <div className="relative flex-1 lg:min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="w-full h-[52px] pl-9 pr-3 bg-transparent border-none outline-none text-[15px] placeholder:text-[#94a3b8]"
                  value={filters.search}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doSearch();
                  }}
                />
              </div>

              <div className="hidden lg:flex items-center">
                <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                {visibility.rooms && (
                  <>
                    <div ref={ptRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setPtOpen(!ptOpen)}
                        className={cn(
                          'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                          roomLabel !== 'Тип квартиры' ? 'text-primary font-medium' : 'text-foreground',
                        )}
                      >
                        {roomLabel === 'Тип квартиры' ? 'Тип' : roomLabel}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', ptOpen && 'rotate-180')} />
                      </button>
                      {ptOpen && (
                        <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-[60] min-w-[180px]">
                          {HERO_ROOM_TYPE_LABELS.map((t) => (
                            <li key={t}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    rooms: roomCategoriesFromHeroLabel(t),
                                  }));
                                  setPtOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                                  roomLabel === t && 'text-primary font-medium',
                                )}
                              >
                                {t}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                  </>
                )}
                <div className="flex items-center h-[52px]">
                  <input
                    type="text"
                    placeholder="Цена от"
                    className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none"
                    value={priceFromStr}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setPriceFromStr(v);
                      syncPriceToFilters(v, priceToStr);
                    }}
                  />
                  <span className="text-muted-foreground text-sm">—</span>
                  <input
                    type="text"
                    placeholder="до, ₽"
                    className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none"
                    value={priceToStr}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setPriceToStr(v);
                      syncPriceToFilters(priceFromStr, v);
                    }}
                  />
                </div>

                {visibility.deadline && (
                  <>
                    <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                    <div ref={dlRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setDlOpen(!dlOpen)}
                        className={cn(
                          'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                          deadlineLabel !== 'Срок сдачи' ? 'text-primary font-medium' : 'text-foreground',
                        )}
                      >
                        {deadlineLabel}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', dlOpen && 'rotate-180')} />
                      </button>
                      {dlOpen && (
                        <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-[60] min-w-[140px]">
                          {HERO_DEADLINE_LABELS.map((d) => (
                            <li key={d}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    deadline: filtersFromHeroDeadline(d),
                                  }));
                                  setDlOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                                  deadlineLabel === d && 'text-primary font-medium',
                                )}
                              >
                                {d}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}

                {visibility.marketType && (
                  <>
                    <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                    <label className="sr-only" htmlFor="hero-apt-market">
                      Тип рынка
                    </label>
                    <select
                      id="hero-apt-market"
                      className={cn(
                        'h-9 max-w-[148px] lg:max-w-[160px] rounded-lg border border-[#e2e8f0] bg-white px-2 text-sm outline-none focus:border-primary/50',
                        filters.marketType !== 'all' ? 'font-medium text-primary' : 'text-foreground',
                      )}
                      value={filters.marketType}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          marketType: e.target.value as CatalogFilters['marketType'],
                        }))
                      }
                    >
                      <option value="all">Все</option>
                      <option value="new">Новостройки</option>
                      <option value="secondary">Вторичка</option>
                    </select>
                  </>
                )}

                <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                <button
                  type="button"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Фильтры
                </button>
              </div>
            </div>

            {showHintsPanel && (
              <CatalogSearchHintsDropdown
                hints={catalogHints}
                isLoading={hintsLoading}
                objectType={filters.objectType}
                className="absolute left-0 right-0 top-full mt-2 z-[100] max-h-[min(70vh,520px)] overflow-y-auto"
                onPick={() => {
                  setSearchFocused(false);
                  setFilters((prev) => ({ ...prev, search: '' }));
                }}
              />
            )}
          </div>

          <div className="flex lg:hidden gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {visibility.rooms && (
              <button
                type="button"
                onClick={() => setPtOpen(!ptOpen)}
                className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {roomLabel === 'Тип квартиры' ? 'Тип' : roomLabel}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Фильтры
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-3 pt-3 border-t border-[#e2e8f0] animate-in slide-in-from-top-1 duration-200 max-h-[min(70vh,520px)] overflow-y-auto">
              <FilterSidebar
                filters={filters}
                onChange={setFilters}
                totalCount={0}
                showMetro={isMoscow}
                showObjectTypeSwitcher={false}
                hasBlocks={isApartmentMode}
                districtOptions={districtsQuery.data}
                subwayOptions={subwaysQuery.data}
                builderOptions={buildersQuery.data}
                deadlineOptions={deadlinesQuery.data}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3.5 gap-2">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className={cn(btnClass('secondary'), 'hidden sm:inline-flex gap-2')}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              На карте
            </button>
            <button
              type="button"
              onClick={doSearch}
              className={cn(btnClass('primary'), 'flex-1 sm:flex-none w-full sm:w-auto shadow-sm')}
            >
              Найти
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
