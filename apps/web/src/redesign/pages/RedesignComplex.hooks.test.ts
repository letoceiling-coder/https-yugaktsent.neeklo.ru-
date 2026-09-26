import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('RedesignComplex hooks order', () => {
  const src = readFileSync(resolve(__dirname, 'RedesignComplex.tsx'), 'utf8');

  it('declares post-handler hooks before early return when complex is null', () => {
    const earlyReturn = src.indexOf('\n  if (!complex) {\n    if (slug && apiBlockQuery.isPending');
    expect(earlyReturn).toBeGreaterThan(-1);

    for (const hook of [
      'const openComplexConsult = useCallback',
      'const buildingFilterOptions = useMemo',
      'const availableCount = useMemo',
    ]) {
      const idx = src.indexOf(hook);
      expect(idx, hook).toBeGreaterThan(-1);
      expect(idx, `${hook} must be before early return`).toBeLessThan(earlyReturn);
    }
  });

  it('does not duplicate openComplexConsult hook', () => {
    expect(src.split('const openComplexConsult = useCallback').length - 1).toBe(1);
  });
});
