import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { btnClass } from '@/redesign/lib/button-styles';
import RangeSlider from '@/redesign/components/hero/RangeSlider';
import CatalogSearchHintsDropdown from '@/redesign/components/CatalogSearchHintsDropdown';
import type { CatalogHints } from '@/redesign/lib/catalog-hints-types';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { catalogFiltersIntoSearchParams } from '@/redesign/lib/catalog-url-sync';
import { OBJECT_TYPE_TABS, ROOM_LABELS, resetFiltersForObjectType } from '@/redesign/lib/catalog-filter-config';
import type { CatalogFilters, MarketType, ObjectType } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';

/** Границы ползунка цены; поля ввода принимают и значения за пределами. */
const PRICE_MIN = 0;
const PRICE_MAX = 50_000_000;
const PRICE_STEP = 100_000;

const MARKET_TABS: { value: MarketType; label: string }[] = [
  { value: 'new', label: 'Новостройки' },
  { value: 'secondary', label: 'Вторичка' },
];

const ROOM_CHIPS = [0, 1, 2, 3, 4];

function digitsToNumber(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function formatThousands(value: number | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('ru-RU');
}

/**
 * Фильтр-бар главной: табы рынка, тип недвижимости, город, цена с ползунком,
 * комнатность и переход в каталог или на карту с теми же фильтрами.
 */
const FilterBar = () => {
  const navigate = useNavigate();
  const { data: regionId, rows: regionRows, setStoredRegionId } = useDefaultRegionId();
  const [filters, setFilters] = useState<CatalogFilters>(() => ({ ...defaultFilters, marketType: 'new' }));
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const hintsEnabled = searchFocused && deferredSearch.length >= 2 && regionId != null;

  const { data: hints, isFetching: hintsLoading } = useQuery({
    queryKey: ['search', 'catalog-hints', regionId, deferredSearch],
    queryFn: () =>
      apiGet<CatalogHints>(
        `/search/catalog-hints?region_id=${regionId}&q=${encodeURIComponent(deferredSearch)}&limit=30`,
      ),
    enabled: hintsEnabled,
    staleTime: 20_000,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const priceFromText = useMemo(() => formatThousands(filters.priceMin), [filters.priceMin]);
  const priceToText = useMemo(() => formatThousands(filters.priceMax), [filters.priceMax]);

  const buildParams = useCallback(() => {
    const params = catalogFiltersIntoSearchParams(new URLSearchParams(), filters);
    if (regionId != null) params.set('region_id', String(regionId));
    return params;
  }, [filters, regionId]);

  const toggleRoom = (room: number) => {
    setFilters((prev) => ({
      ...prev,
      rooms: prev.rooms.includes(room) ? prev.rooms.filter((r) => r !== room) : [...prev.rooms, room],
    }));
  };

  const labelClass = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground';
  const controlClass =
    'h-11 w-full rounded-xl border border-[#e2e8f0] bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60';

  return (
    <section className="max-w-[1400px] mx-auto px-4 pt-4 sm:pt-6">
      <div className="rounded-[20px] border border-border/60 bg-card p-4 shadow-[0_8px_32px_rgba(15,23,42,0.06)] sm:p-5">
        {/* Строка поиска над табами */}
        <div ref={searchRef} className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60"
            placeholder="ЖК, район, улица или застройщик"
            value={filters.search}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(`/catalog?${buildParams().toString()}`);
            }}
          />
          {hintsEnabled ? (
            <CatalogSearchHintsDropdown
              hints={hints}
              isLoading={hintsLoading}
              objectType={filters.objectType}
              className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(60vh,420px)] overflow-y-auto"
              onPick={() => {
                setSearchFocused(false);
                setFilters((prev) => ({ ...prev, search: '' }));
              }}
            />
          ) : null}
        </div>

        {/* Ряд 1: рынок + ссылка на карту */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Тип рынка">
            {MARKET_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={filters.marketType === tab.value}
                onClick={() => setFilters((prev) => ({ ...prev, marketType: tab.value }))}
                className={cn(
                  'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                  filters.marketType === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/70',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate(`/map?${buildParams().toString()}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <MapPin className="h-4 w-4" />
            Показать на карте
          </button>
        </div>

        {/* Ряд 2: тип, город, цена, комнаты, поиск */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_auto] lg:items-end">
          <div>
            <label className={labelClass} htmlFor="hero-object-type">
              Тип недвижимости
            </label>
            <select
              id="hero-object-type"
              className={controlClass}
              value={filters.objectType}
              onChange={(e) =>
                setFilters((prev) => resetFiltersForObjectType(prev, e.target.value as ObjectType))
              }
            >
              {OBJECT_TYPE_TABS.map((tab) => (
                <option key={tab.type} value={tab.type}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="hero-region">
              Город
            </label>
            <select
              id="hero-region"
              className={controlClass}
              value={regionId ?? ''}
              onChange={(e) => setStoredRegionId(Number(e.target.value))}
              disabled={!regionRows?.length}
            >
              {(regionRows ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={labelClass}>Цена, ₽</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                aria-label="Цена от"
                placeholder="от"
                className={controlClass}
                value={priceFromText}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, priceMin: digitsToNumber(e.target.value) }))
                }
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Цена до"
                placeholder="до"
                className={controlClass}
                value={priceToText}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, priceMax: digitsToNumber(e.target.value) }))
                }
              />
            </div>
            <RangeSlider
              className="mt-1"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              ariaLabel="Цена, ₽"
              value={[filters.priceMin ?? null, filters.priceMax ?? null]}
              onChange={([from, to]) =>
                setFilters((prev) => ({
                  ...prev,
                  priceMin: from ?? undefined,
                  priceMax: to ?? undefined,
                }))
              }
            />
          </div>

          <div>
            <span className={labelClass}>Комнат</span>
            <div className="flex gap-1.5">
              {ROOM_CHIPS.map((room) => (
                <button
                  key={room}
                  type="button"
                  aria-pressed={filters.rooms.includes(room)}
                  onClick={() => toggleRoom(room)}
                  className={cn(
                    'h-11 min-w-[44px] flex-1 rounded-xl border text-sm font-medium transition-colors',
                    filters.rooms.includes(room)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-[#e2e8f0] bg-background hover:border-primary/40',
                  )}
                >
                  {ROOM_LABELS[room]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/catalog?${buildParams().toString()}`)}
            className={cn(btnClass('primary'), 'h-11 w-full px-8 lg:w-auto')}
          >
            Найти
          </button>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
