import { describe, it, expect } from 'vitest';
import {
  complexPopularCompletionLine,
  complexCompletionLine,
  complexFallbackPriceRow,
  complexImageOverlayLines,
  complexMetroDisplayLine,
  complexMetroTimeLabel,
  complexPriceBandRows,
  complexRoomBandLabel,
  complexTotalUnits,
  complexYieldLabel,
  complexCoverBadgeLabel,
  complexInventoryLine,
  formatCompletionQuarterText,
} from '@/redesign/lib/card-visual';
import type { ResidentialComplex } from '@/redesign/data/types';

const base: ResidentialComplex = {
  id: '1',
  slug: 'test',
  name: 'Test',
  description: '',
  builder: 'Dev',
  district: '—',
  subway: '—',
  subwayDistance: '—',
  address: 'Addr',
  deadline: '2029 2 квартал',
  status: 'completed',
  priceFrom: 4_962_342,
  priceTo: 4_962_342,
  images: [],
  coords: [0, 0],
  advantages: [],
  infrastructure: [],
  buildings: [],
  listingCount: 268,
};

describe('card-visual complex helpers', () => {
  it('formats room band labels', () => {
    expect(complexRoomBandLabel(0)).toBe('Студии');
    expect(complexRoomBandLabel(2)).toBe('2Е-к.кв');
    expect(complexRoomBandLabel(21)).toBe('2-к.кв');
  });

  it('picks cover badge label', () => {
    expect(complexCoverBadgeLabel({ ...base, isPromoted: true })).toBe('Новый ЖК');
    expect(
      complexCoverBadgeLabel({ ...base, salesStartDate: '2026-06-01T00:00:00.000Z' }),
    ).toBe('Старт продаж');
  });

  it('formats completion quarter text', () => {
    expect(formatCompletionQuarterText('2029 2 квартал')).toBe('2 кв. 2029');
    expect(formatCompletionQuarterText('2027 3 квартал')).toBe('3 кв. 2027');
    expect(formatCompletionQuarterText('2026-01-30T00:00:00.000Z')).toBe('1 кв. 2026');
  });

  it('builds sales overlay lines', () => {
    const lines = complexImageOverlayLines({
      ...base,
      salesStartDate: '2026-05-01T00:00:00.000Z',
      buildings: [
        {
          id: 'b1',
          complexId: '1',
          name: 'корпус 4.1',
          floors: 1,
          sections: 1,
          deadline: '',
          apartments: [],
        },
      ],
    });
    expect(lines.primary).toMatch(/^Старт продаж · /);
    expect(lines.secondary).toBeNull();
  });

  it('formats metro display line with transport time', () => {
    expect(
      complexMetroDisplayLine({
        ...base,
        nearbySubways: [{ name: 'Томилино (D3)', distanceTime: 10, distanceType: 2 }],
      }),
    ).toBe('Томилино (D3), 10 минут транспортом');
    expect(complexMetroTimeLabel(5, 1)).toBe('5 минут пешком');
  });

  it('emphasizes completion line with quarter', () => {
    expect(complexCompletionLine(base)).toBe('Сдан в 2 кв. 2029');
    expect(
      complexCompletionLine({ ...base, status: 'building', deadline: '2027 3 квартал' }),
    ).toBe('Строится, сдача 3 кв. 2027');
  });

  it('builds popular completion range without status prefix', () => {
    expect(
      complexPopularCompletionLine({
        ...base,
        status: 'building',
        deadline: 'Строится',
        buildings: [
          {
            id: 'b1',
            complexId: '1',
            name: 'корпус 1',
            floors: 1,
            sections: 1,
            deadline: '2028 3 квартал',
            apartments: [],
          },
          {
            id: 'b2',
            complexId: '1',
            name: 'корпус 2',
            floors: 1,
            sections: 1,
            deadline: '2028 4 квартал',
            apartments: [],
          },
        ],
      }),
    ).toBe('3 кв. 2028 – 4 кв. 2028');
  });

  it('builds price bands from API priceRanges', () => {
    const rows = complexPriceBandRows({
      ...base,
      priceRanges: [
        { rooms: 0, priceMin: 4_962_342 },
        { rooms: 1, priceMin: 6_516_498 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe('Студии');
    expect(rows[0].price.replace(/\s/g, ' ')).toBe('от 4 962 342 ₽');
    expect(rows[1].price).toContain('6');
  });

  it('falls back to single price row when no bands', () => {
    const row = complexFallbackPriceRow(base);
    expect(row?.label).toBe('Цены от');
    expect(row?.price).toContain('4');
  });

  it('formats inventory with scenic count', () => {
    expect(complexInventoryLine({ ...base, scenicCount: 95 })).toBe('Квартир 268 · Видовых 95');
    expect(complexInventoryLine(base)).toBe('Квартир 268');
  });

  it('returns null yield when API fields missing', () => {
    expect(complexYieldLabel(base)).toBeNull();
  });

  it('formats yield range when provided', () => {
    expect(complexYieldLabel({ ...base, yieldMin: 1.2, yieldMax: 1.7 })).toBe('1.2–1.7%');
    expect(complexYieldLabel({ ...base, yieldMin: 1.5, yieldMax: 1.5 })).toBe('1.5%');
  });

  it('reads total units from listingCount', () => {
    expect(complexTotalUnits(base)).toBe(268);
  });
});
