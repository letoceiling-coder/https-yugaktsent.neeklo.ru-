import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CatalogFilters } from '@/redesign/data/types';
import {
  applyCatalogPreset,
  CATALOG_FILTER_PRESETS,
  type CatalogFilterPreset,
} from '@/redesign/lib/catalog-filter-presets';

type Props = {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  className?: string;
  /** Hide new-build-only presets when region has no blocks. */
  showNewBuildPresets?: boolean;
  maxVisible?: number;
};

function isPresetActive(filters: CatalogFilters, preset: CatalogFilterPreset): boolean {
  for (const [key, val] of Object.entries(preset.patch) as [keyof CatalogFilters, unknown][]) {
    const current = filters[key];
    if (Array.isArray(val) && Array.isArray(current)) {
      if (val.length !== current.length || val.some((v, i) => current[i] !== v)) return false;
    } else if (current !== val) {
      return false;
    }
  }
  return true;
}

export default function CatalogFilterPresets({
  filters,
  onChange,
  className,
  showNewBuildPresets = true,
  maxVisible = 6,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (filters.objectType !== 'apartments' && filters.objectType !== 'rooms') return null;

  const presets = CATALOG_FILTER_PRESETS.filter(
    (p) => showNewBuildPresets || !['new-build', 'ready'].includes(p.id),
  );

  const overflow = presets.length > maxVisible;
  const visiblePresets = expanded || !overflow ? presets : presets.slice(0, maxVisible);
  const hiddenCount = presets.length - maxVisible;

  return (
    <div className={cn('mb-2', className)}>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
        {visiblePresets.map((preset) => {
          const active = isPresetActive(filters, preset);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onChange(
                  active
                    ? {
                        ...filters,
                        rooms: [],
                        priceMax: undefined,
                        priceMin: undefined,
                        areaMin: undefined,
                        marketType: 'all',
                        status: [],
                      }
                    : applyCatalogPreset(filters, preset),
                )
              }
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors min-h-[44px] sm:min-h-[32px] touch-manipulation',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted/60',
              )}
            >
              {preset.label}
            </button>
          );
        })}
        {overflow ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors min-h-[44px] sm:min-h-[32px]"
          >
            {expanded ? 'Свернуть' : `Ещё${hiddenCount > 0 ? ` (${hiddenCount})` : ''}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
