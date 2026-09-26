import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    ymaps: {
      ready: (cb: () => void) => void;
      geocode: (query: string, opts?: { results?: number; kind?: string }) => Promise<{
        geoObjects: { get: (i: number) => { geometry: { getCoordinates: () => [number, number] }; getAddressLine?: () => string } | null };
      }>;
      Map: new (el: HTMLElement, opts: { center: number[]; zoom: number; controls?: string[] }) => {
        geoObjects: { add: (o: unknown) => void; remove: (o: unknown) => void };
        setCenter: (c: number[], z: number) => void;
        events: { add: (ev: string, cb: (e: { get: (k: string) => [number, number] }) => void) => void };
        destroy: () => void;
      };
      Placemark: new (coords: number[], props?: unknown, opts?: { preset?: string }) => unknown;
    };
  }
}

type Props = {
  address: string;
  lat: string;
  lng: string;
  onAddressChange: (v: string) => void;
  onCoordsChange: (lat: string, lng: string) => void;
};

function fmtCoord(n: number): string {
  return n.toFixed(7);
}

export default function AddressGeocoderField({
  address,
  lat,
  lng,
  onAddressChange,
  onCoordsChange,
}: Props) {
  const { ready } = useYandexMapsReady();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof window.ymaps.Map> | null>(null);
  const placemarkRef = useRef<unknown>(null);
  const [search, setSearch] = useState(address);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    setSearch(address);
  }, [address]);

  const placeMarker = useCallback(
    (newLat: number, newLng: number) => {
      if (!mapRef.current || !window.ymaps) return;
      if (placemarkRef.current) {
        mapRef.current.geoObjects.remove(placemarkRef.current);
      }
      const pm = new window.ymaps.Placemark([newLat, newLng], {}, { preset: 'islands#redDotIcon' });
      mapRef.current.geoObjects.add(pm);
      placemarkRef.current = pm;
      mapRef.current.setCenter([newLat, newLng], 15);
      onCoordsChange(fmtCoord(newLat), fmtCoord(newLng));
    },
    [onCoordsChange],
  );

  useEffect(() => {
    if (!ready || !mapContainerRef.current || mapRef.current) return;
    const latN = Number(lat);
    const lngN = Number(lng);
    const hasCoords = Number.isFinite(latN) && Number.isFinite(lngN);
    const center = hasCoords ? [latN, lngN] : [50.595414, 36.587277];
    const zoom = hasCoords ? 15 : 11;

    window.ymaps.ready(() => {
      if (!mapContainerRef.current) return;
      const map = new window.ymaps.Map(mapContainerRef.current, {
        center,
        zoom,
        controls: ['zoomControl'],
      });
      mapRef.current = map;

      if (hasCoords) {
        const pm = new window.ymaps.Placemark(center, {}, { preset: 'islands#redDotIcon' });
        map.geoObjects.add(pm);
        placemarkRef.current = pm;
      }

      map.events.add('click', (e) => {
        const coords = e.get('coords');
        placeMarker(coords[0], coords[1]);
      });
    });

    return () => {
      try {
        mapRef.current?.destroy();
      } catch {
        // ignore
      }
      mapRef.current = null;
      placemarkRef.current = null;
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const runGeocode = async () => {
    const q = search.trim();
    if (!q || !window.ymaps) return;
    setSearching(true);
    setGeoError('');
    try {
      let result = await window.ymaps.geocode(q, { results: 1, kind: 'house' });
      let obj = result.geoObjects.get(0);
      if (!obj) {
        result = await window.ymaps.geocode(q, { results: 1 });
        obj = result.geoObjects.get(0);
      }
      if (!obj) {
        setGeoError('Адрес не найден. Уточните запрос или укажите точку на карте.');
        return;
      }
      const coords = obj.geometry.getCoordinates();
      const line = obj.getAddressLine?.() ?? q;
      onAddressChange(line);
      setSearch(line);
      placeMarker(coords[0], coords[1]);
    } catch {
      setGeoError('Ошибка геокодера. Проверьте подключение или укажите точку на карте.');
    } finally {
      setSearching(false);
    }
  };

  const clearCoords = () => {
    if (mapRef.current && placemarkRef.current) {
      mapRef.current.geoObjects.remove(placemarkRef.current);
      placemarkRef.current = null;
    }
    onCoordsChange('', '');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Адрес *</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runGeocode())}
              placeholder="Анапа, ул. Крымская, 99"
              className="pl-9 min-h-11"
            />
          </div>
          <Button type="button" onClick={runGeocode} disabled={searching || !ready} className="min-h-11">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Найти на карте'}
          </Button>
        </div>
        {geoError ? <p className="text-xs text-destructive">{geoError}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Широта</Label>
          <Input
            inputMode="decimal"
            value={lat}
            onChange={(e) => onCoordsChange(e.target.value, lng)}
            placeholder="50.595414"
            className="min-h-11"
          />
        </div>
        <div className="space-y-1">
          <Label>Долгота</Label>
          <Input
            inputMode="decimal"
            value={lng}
            onChange={(e) => onCoordsChange(lat, e.target.value)}
            placeholder="36.587277"
            className="min-h-11"
          />
        </div>
      </div>

      {(lat || lng) ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {lat && lng ? `${lat}, ${lng}` : 'Укажите обе координаты'}
          </span>
          <button type="button" onClick={clearCoords} className="inline-flex items-center gap-1 hover:text-destructive">
            <X className="w-3.5 h-3.5" /> Сбросить
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Найдите адрес или кликните на карту для установки метки</p>
      )}

      <div
        ref={mapContainerRef}
        className="w-full h-52 sm:h-64 rounded-xl overflow-hidden border bg-muted"
      >
        {!ready ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Загрузка карты…
          </div>
        ) : null}
      </div>
    </div>
  );
}
