import type { MarkerZoomMode } from '@/redesign/lib/map-marker-layout';
import { buildMarkerLayoutHtml, formatMarkerPriceFromRub } from '@/redesign/lib/map-marker-layout';
import { formatMarkerPriceFrom } from '@/redesign/lib/display-price';
import type { ResidentialComplex } from '@/redesign/data/types';

/** Minimal listing fields for marker descriptor building */
export type ListingMarkerSource = {
  id: number;
  lat: number | string;
  lng: number | string;
  price: string | number | null;
  title: string | null;
  address: string | null;
};

/** Minimal stable payload for map placemarks — avoids dragging full card objects into layout logic */
export type MapMarkerDescriptor = {
  id: string;
  coords: [number, number];
  label: string | null;
};

const layoutClassCache = new Map<string, unknown>();

export function clearMarkerLayoutCache(): void {
  layoutClassCache.clear();
}

export function getMarkerLayoutCacheSize(): number {
  return layoutClassCache.size;
}

function layoutCacheKey(mode: MarkerZoomMode, label: string | null, isActive: boolean): string {
  return `${mode}\0${isActive ? '1' : '0'}\0${label ?? ''}`;
}

/** Reuse templateLayoutFactory classes — same mode/label/active → same layout instance */
export function getCachedMarkerLayoutClass(
  ymaps: typeof window.ymaps,
  mode: MarkerZoomMode,
  label: string | null,
  isActive: boolean,
): unknown {
  const key = layoutCacheKey(mode, label, isActive);
  let layout = layoutClassCache.get(key);
  if (!layout) {
    layout = ymaps.templateLayoutFactory.createClass(
      buildMarkerLayoutHtml({ mode, label, isActive }),
    );
    layoutClassCache.set(key, layout);
  }
  return layout;
}

export function complexMarkerLabel(c: ResidentialComplex, mode: MarkerZoomMode): string | null {
  if (mode === 'dot') return null;
  if (mode === 'name') return c.name;
  return formatMarkerPriceFromRub(c.priceFrom);
}

export function listingMarkerLabel(l: ListingMarkerSource, mode: MarkerZoomMode): string | null {
  if (mode === 'dot') return null;
  if (mode === 'name') return l.title ?? l.address ?? `Объект #${l.id}`;
  return formatMarkerPriceFrom(l.price);
}

export function buildComplexMarkerDescriptors(
  complexes: ResidentialComplex[],
  mode: MarkerZoomMode,
): MapMarkerDescriptor[] {
  // ЖК без настоящих координат отбрасываем: coords у них — запасной центр,
  // метка встала бы в чужом городе
  return complexes
    .filter((c) => c.hasCoords !== false)
    .map((c) => ({
      id: c.slug,
      coords: c.coords,
      label: complexMarkerLabel(c, mode),
    }));
}

export function buildListingMarkerDescriptors(
  listings: ListingMarkerSource[],
  mode: MarkerZoomMode,
): MapMarkerDescriptor[] {
  return listings
    .filter((l) => l.lat != null && l.lng != null && parseFloat(String(l.lat)) !== 0)
    .map((l) => ({
      id: String(l.id),
      coords: [parseFloat(String(l.lat)), parseFloat(String(l.lng))] as [number, number],
      label: listingMarkerLabel(l, mode),
    }));
}

/** Stable signature — rebuild cluster only when descriptors or zoom mode bucket change */
export function markerLayerSignature(mode: MarkerZoomMode, descriptors: MapMarkerDescriptor[]): string {
  if (descriptors.length === 0) return `${mode}|0`;
  const body = descriptors
    .map((d) => `${d.id}:${d.coords[0]},${d.coords[1]}:${d.label ?? ''}`)
    .join(';');
  return `${mode}|${descriptors.length}|${body}`;
}
