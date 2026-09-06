const LEGACY_BRAND_RE = /live\s*grid/gi;

/** Fallback when site_settings.company_name is not loaded yet. */
export function defaultPublicBrandName(): string {
  const fromEnv = import.meta.env.VITE_DEFAULT_BRAND as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  return 'Агентство недвижимости';
}

export function withoutLegacyBrand(text: string, brandName: string): string {
  if (!text) return text;
  const brand = brandName.trim() || defaultPublicBrandName();
  return text.replace(LEGACY_BRAND_RE, brand);
}

export function containsLegacyBrand(text: string): boolean {
  return LEGACY_BRAND_RE.test(text);
}

export function replaceLegacyBrandDeep<T>(value: T, brandName: string): T {
  const brand = brandName.trim() || defaultPublicBrandName();
  const walk = (input: unknown): unknown => {
    if (typeof input === 'string') {
      return containsLegacyBrand(input) ? withoutLegacyBrand(input, brand) : input;
    }
    if (Array.isArray(input)) return input.map(walk);
    if (input && typeof input === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(input as Record<string, unknown>)) {
        out[key] = walk(v);
      }
      return out;
    }
    return input;
  };
  return walk(value) as T;
}
