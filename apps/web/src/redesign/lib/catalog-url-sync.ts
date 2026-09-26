import type { CatalogFilters, MarketType, ObjectType } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';
import { roomCategoriesFromHeroLabel } from '@/redesign/lib/catalog-filter-config';

export { roomCategoriesFromHeroLabel };

/** Ключи URL, влияющие на состояние фильтров каталога (sort, region_id, geo не сбрасывают фильтры). */
export const CATALOG_FILTER_URL_KEYS = [
  'type',
  'market',
  'search',
  'rooms',
  'price_min',
  'price_max',
  'priceMin',
  'priceMax',
  'priceFrom',
  'priceTo',
  'area_min',
  'area_max',
  'areaMin',
  'areaMax',
  'land_area_min',
  'land_area_max',
  'distance_min',
  'distance_max',
  'directions',
  'house_location',
  'house_materials',
  'land_categories',
  'commercial_types',
  'floor_min',
  'floor_max',
  'floorMin',
  'floorMax',
  'deadline',
  'district_names',
  'subway_names',
  'builder_names',
  'status',
] as const;

export function catalogFilterUrlSignature(sp: URLSearchParams): string {
  const parts: string[] = [];
  for (const k of CATALOG_FILTER_URL_KEYS) {
    const v = sp.get(k);
    if (v) parts.push(`${k}=${v}`);
  }
  return parts.sort().join('&');
}

/** Поля цены подписаны «₽», поэтому ввод трактуем как рубли без скрытого масштабирования. */
export function heroDigitsToRubles(digitsRaw: string): number | undefined {
  const digits = digitsRaw.replace(/\D/g, '');
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function parseFiniteNumber(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseRoomCategories(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 4);
}

function parseStringList(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Полное состояние фильтров каталога из адресной строки (герой, шаринг, назад в браузере).
 */
export function catalogFiltersFromSearchParams(sp: URLSearchParams): CatalogFilters {
  const f: CatalogFilters = JSON.parse(JSON.stringify(defaultFilters)) as CatalogFilters;

  const type = sp.get('type');
  if (type && ['apartments', 'rooms', 'houses', 'land', 'dachas', 'commercial'].includes(type)) {
    f.objectType = type as ObjectType;
  }

  const market = sp.get('market');
  if (market && ['all', 'new', 'secondary'].includes(market)) {
    f.marketType = market as MarketType;
  }

  f.search = sp.get('search') ?? '';

  f.rooms = parseRoomCategories(sp.get('rooms'));

  const pMin =
    parseFiniteNumber(sp.get('price_min')) ??
    parseFiniteNumber(sp.get('priceMin')) ??
    heroDigitsToRubles(sp.get('priceFrom') ?? '');
  const pMax =
    parseFiniteNumber(sp.get('price_max')) ??
    parseFiniteNumber(sp.get('priceMax')) ??
    heroDigitsToRubles(sp.get('priceTo') ?? '');
  if (pMin !== undefined) f.priceMin = pMin;
  if (pMax !== undefined) f.priceMax = pMax;

  const aMin =
    parseFiniteNumber(sp.get('area_min')) ?? parseFiniteNumber(sp.get('areaMin'));
  const aMax =
    parseFiniteNumber(sp.get('area_max')) ?? parseFiniteNumber(sp.get('areaMax'));
  if (aMin !== undefined) f.areaMin = aMin;
  if (aMax !== undefined) f.areaMax = aMax;

  const landMin = parseFiniteNumber(sp.get('land_area_min'));
  const landMax = parseFiniteNumber(sp.get('land_area_max'));
  if (landMin !== undefined) f.landAreaMin = landMin;
  if (landMax !== undefined) f.landAreaMax = landMax;

  const distanceMin = parseFiniteNumber(sp.get('distance_min'));
  const distanceMax = parseFiniteNumber(sp.get('distance_max'));
  if (distanceMin !== undefined) f.distanceMin = distanceMin;
  if (distanceMax !== undefined) f.distanceMax = distanceMax;

  f.directions = parseStringList(sp.get('directions')).filter((s) =>
    ['south', 'north', 'east', 'west'].includes(s),
  );
  // Фильтр расположения убран из интерфейса: в API он завязан на флаги
  // чужой географии в схеме (см. docs/BACKEND_TODO.md), для Юга он пуст.
  f.houseLocation = [];
  f.houseMaterials = parseStringList(sp.get('house_materials'));
  f.landPurpose = parseStringList(sp.get('land_categories'));
  f.commercialTypes = parseStringList(sp.get('commercial_types'));

  const flMin =
    parseFiniteNumber(sp.get('floor_min')) ?? parseFiniteNumber(sp.get('floorMin'));
  const flMax =
    parseFiniteNumber(sp.get('floor_max')) ?? parseFiniteNumber(sp.get('floorMax'));
  if (flMin !== undefined) f.floorMin = flMin;
  if (flMax !== undefined) f.floorMax = flMax;

  const dl = sp.get('deadline');
  if (dl?.trim()) {
    f.deadline = parseStringList(dl);
  }

  f.district = parseStringList(sp.get('district_names'));
  f.subway = parseStringList(sp.get('subway_names'));
  f.builder = parseStringList(sp.get('builder_names'));
  f.status = parseStringList(sp.get('status')).filter((s) =>
    ['building', 'completed', 'planned'].includes(s),
  );

  return f;
}

export function catalogFiltersIntoSearchParams(
  base: URLSearchParams,
  f: CatalogFilters,
): URLSearchParams {
  const p = new URLSearchParams(base.toString());

  if (f.search.trim()) p.set('search', f.search.trim());
  else p.delete('search');

  if (f.objectType !== 'apartments') p.set('type', f.objectType);
  else p.delete('type');

  if (f.marketType !== 'all') p.set('market', f.marketType);
  else p.delete('market');

  if (f.rooms.length) p.set('rooms', f.rooms.join(','));
  else p.delete('rooms');

  if (f.priceMin != null && Number.isFinite(f.priceMin)) p.set('price_min', String(Math.round(f.priceMin)));
  else p.delete('price_min');
  if (f.priceMax != null && Number.isFinite(f.priceMax)) p.set('price_max', String(Math.round(f.priceMax)));
  else p.delete('price_max');

  if (f.areaMin != null && Number.isFinite(f.areaMin)) p.set('area_min', String(f.areaMin));
  else p.delete('area_min');
  if (f.areaMax != null && Number.isFinite(f.areaMax)) p.set('area_max', String(f.areaMax));
  else p.delete('area_max');

  if (f.landAreaMin != null && Number.isFinite(f.landAreaMin)) p.set('land_area_min', String(f.landAreaMin));
  else p.delete('land_area_min');
  if (f.landAreaMax != null && Number.isFinite(f.landAreaMax)) p.set('land_area_max', String(f.landAreaMax));
  else p.delete('land_area_max');

  if (f.distanceMin != null && Number.isFinite(f.distanceMin)) p.set('distance_min', String(f.distanceMin));
  else p.delete('distance_min');
  if (f.distanceMax != null && Number.isFinite(f.distanceMax)) p.set('distance_max', String(f.distanceMax));
  else p.delete('distance_max');

  if (f.directions.length) p.set('directions', f.directions.join(','));
  else p.delete('directions');
  if (f.houseLocation.length) p.set('house_location', f.houseLocation.join(','));
  else p.delete('house_location');
  if (f.houseMaterials.length) p.set('house_materials', f.houseMaterials.join(','));
  else p.delete('house_materials');
  if (f.landPurpose.length) p.set('land_categories', f.landPurpose.join(','));
  else p.delete('land_categories');
  if (f.commercialTypes.length) p.set('commercial_types', f.commercialTypes.join(','));
  else p.delete('commercial_types');

  if (f.floorMin != null && Number.isFinite(f.floorMin)) p.set('floor_min', String(f.floorMin));
  else p.delete('floor_min');
  if (f.floorMax != null && Number.isFinite(f.floorMax)) p.set('floor_max', String(f.floorMax));
  else p.delete('floor_max');

  if (f.deadline.length) p.set('deadline', f.deadline.join(','));
  else p.delete('deadline');

  if (f.district.length) p.set('district_names', f.district.join(','));
  else p.delete('district_names');

  if (f.subway.length) p.set('subway_names', f.subway.join(','));
  else p.delete('subway_names');

  if (f.builder.length) p.set('builder_names', f.builder.join(','));
  else p.delete('builder_names');

  if (f.status.length) p.set('status', f.status.join(','));
  else p.delete('status');

  p.delete('finishing_ids');
  p.delete('priceFrom');
  p.delete('priceTo');
  p.delete('priceMin');
  p.delete('priceMax');
  p.delete('areaMin');
  p.delete('areaMax');
  p.delete('floorMin');
  p.delete('floorMax');
  p.delete('district');
  p.delete('subway');
  p.delete('builder');

  return p;
}
