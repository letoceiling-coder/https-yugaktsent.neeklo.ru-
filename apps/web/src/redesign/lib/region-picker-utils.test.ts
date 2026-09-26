import { describe, expect, it } from 'vitest';
import {
  filterRegionsByQuery,
  groupRegionsByLetter,
  pickPopularRegions,
  regionLabel,
} from './region-picker-utils.js';
import type { RegionRow } from '@/redesign/hooks/useDefaultRegionId';

const rows: RegionRow[] = [
  { id: 1, code: 'anapa', name: 'Анапа' },
  { id: 2, code: 'krasnodar', name: 'Краснодар' },
  { id: 7, code: 'yalta', name: 'Ялта' },
];

describe('region-picker-utils', () => {
  it('filters by name', () => {
    expect(filterRegionsByQuery(rows, 'красно').map((r) => r.id)).toEqual([2]);
  });

  it('groups by letter', () => {
    const groups = groupRegionsByLetter(rows);
    expect(groups.some((g) => g.letter === 'А')).toBe(true);
  });

  it('picks popular cities', () => {
    const popular = pickPopularRegions(rows);
    // Анапа идёт первой: это рабочий город агентства
    expect(regionLabel(popular[0])).toBe('Анапа');
    expect(popular.some((r) => regionLabel(r) === 'Ялта')).toBe(true);
  });
});
