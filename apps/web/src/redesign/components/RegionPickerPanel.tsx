import { useMemo, useState, useDeferredValue } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegionRow } from '@/redesign/hooks/useDefaultRegionId';
import {
  filterRegionsByQuery,
  groupRegionsByLetter,
  pickPopularRegions,
  regionLabel,
} from '@/redesign/lib/region-picker-utils';

type Props = {
  regions: RegionRow[];
  selectedRegionId?: number | null;
  onSelect: (regionId: number) => void;
  className?: string;
};

const RegionPickerPanel = ({ regions, selectedRegionId, onSelect, className }: Props) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const popular = useMemo(() => pickPopularRegions(regions), [regions]);
  const filtered = useMemo(
    () => filterRegionsByQuery(regions, deferredQuery),
    [regions, deferredQuery],
  );
  const groups = useMemo(() => groupRegionsByLetter(filtered), [filtered]);
  const showPopular = !deferredQuery.trim();

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div className="relative shrink-0 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск региона или города"
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-muted/30 text-base outline-none md:text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          autoComplete="off"
          aria-label="Поиск региона или города"
        />
      </div>

      {showPopular && popular.length > 0 ? (
        <div className="shrink-0 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Популярные города</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((region) => {
              const active = region.id === selectedRegionId;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onSelect(region.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground hover:bg-muted',
                  )}
                >
                  {regionLabel(region)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Ничего не найдено</p>
        ) : (
          <div className="space-y-4 pb-2">
            {groups.map(({ letter, regions: letterRegions }) => (
              <div key={letter}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
                  {letter}
                </p>
                <ul className="space-y-0.5">
                  {letterRegions.map((region) => {
                    const active = region.id === selectedRegionId;
                    return (
                      <li key={region.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(region.id)}
                          className={cn(
                            'w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors',
                            active
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/60 text-foreground',
                          )}
                        >
                          {regionLabel(region)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionPickerPanel;
