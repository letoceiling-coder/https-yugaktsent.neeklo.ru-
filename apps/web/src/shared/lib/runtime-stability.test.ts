import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureArray, safeFirst, safeMap } from '@/shared/lib/safe-array';
import { authQueryEnabled } from '@/shared/lib/safe-query';

describe('safe-array', () => {
  it('ensureArray returns empty for non-array', () => {
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray(undefined)).toEqual([]);
    expect(ensureArray('x')).toEqual([]);
  });

  it('safeFirst returns first element', () => {
    expect(safeFirst([1, 2])).toBe(1);
    expect(safeFirst(null)).toBeUndefined();
  });

  it('safeMap maps arrays only', () => {
    expect(safeMap([1, 2], (n) => n * 2)).toEqual([2, 4]);
    expect(safeMap(null, (n: number) => n)).toEqual([]);
  });
});

describe('authQueryEnabled', () => {
  it('is false without JWT in test env', () => {
    expect(authQueryEnabled()).toBe(false);
  });
});

describe('recordBrowseHistory guest guard', () => {
  it('checks canCallAccountApi before apiPost', () => {
    const src = readFileSync(
      resolve(__dirname, 'record-browse-history.ts'),
      'utf8',
    );
    const guardIdx = src.indexOf('canCallAccountApi()');
    const postIdx = src.indexOf("apiPost('/account/history'");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(postIdx).toBeGreaterThan(guardIdx);
  });
});

describe('RedesignApartment hooks order', () => {
  it('does not return before hook declarations', () => {
    const src = readFileSync(resolve(__dirname, '../../redesign/pages/RedesignApartment.tsx'), 'utf8');
    const navigateIdx = src.indexOf('return <Navigate');
    const navSectionsHook = src.indexOf('const navSections = useMemo');
    expect(navigateIdx).toBeGreaterThan(-1);
    expect(navSectionsHook).toBeGreaterThan(-1);
    expect(navSectionsHook).toBeLessThan(navigateIdx);
  });
});

describe('mapApiBlockListRowToResidentialComplex', () => {
  it('handles empty images and missing district', async () => {
    const { mapApiBlockListRowToResidentialComplex } = await import('@/redesign/lib/blocks-from-api');
    const row = {
      id: 1,
      slug: 'test',
      name: 'Test',
      status: 'BUILDING',
      district: null,
      subways: [],
      images: [],
    };
    const complex = mapApiBlockListRowToResidentialComplex(row as never);
    expect(complex.images.length).toBeGreaterThan(0);
    // Незаполненное поле отдаём пустой строкой: прочерк в карточке
    // выглядел как данные, которых на самом деле нет.
    expect(complex.district).toBe('');
    expect(complex.subway).toBe('');
  });
});
