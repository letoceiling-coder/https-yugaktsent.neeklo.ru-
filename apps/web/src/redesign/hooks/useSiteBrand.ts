import { useSiteSettings, setting, settingOptional } from '@/redesign/hooks/useSiteSettings';

import { defaultPublicBrandName } from '@/shared/lib/site-brand-text';

const DEFAULT_BRAND = defaultPublicBrandName();
const DEFAULT_LOGO = '/logo-yug-aktsent.png';
/** Тот же знак, но со светлой типографикой: на тёмном подвале основной не читался. */
const DEFAULT_LOGO_LIGHT = '/logo-yug-aktsent-light.png';

/** Публичное имя бренда и лого из site_settings (white-label). */
export function useSiteBrand() {
  const query = useSiteSettings();
  const settings = query.data;

  const brandName = setting(settings, 'company_name', DEFAULT_BRAND);
  const siteTitle = setting(settings, 'site_title', `${brandName} · недвижимость`);
  const logoUrl = setting(settings, 'site_logo_url', DEFAULT_LOGO);
  // Светлый вариант: явно заданный в админке, иначе наш — но только если
  // основной логотип тоже наш. Чужой логотип подменять своим нельзя.
  const logoLightUrl =
    settingOptional(settings, 'site_logo_light_url') ??
    (logoUrl === DEFAULT_LOGO ? DEFAULT_LOGO_LIGHT : logoUrl);
  // Подпись под логотипом задаёт заказчик в админке. Запасного текста нет:
  // «Платформа недвижимости» — формулировка чужого продукта, а не этого бренда.
  const tagline = settingOptional(settings, 'site_tagline') ?? null;

  const shortName =
    brandName
      .replace(/^ООО\s*[«"']?/i, '')
      .replace(/[»"']$/g, '')
      .trim() || brandName;

  return {
    ...query,
    brandName,
    shortName,
    siteTitle,
    logoUrl,
    logoLightUrl,
    tagline,
  };
}

export function siteBrandFromMap(settings: Map<string, string> | undefined) {
  const brandName = setting(settings, 'company_name', DEFAULT_BRAND);
  const siteTitle = setting(settings, 'site_title', `${brandName} · недвижимость`);
  const logoUrl = setting(settings, 'site_logo_url', DEFAULT_LOGO);
  const shortName =
    brandName
      .replace(/^ООО\s*[«"']?/i, '')
      .replace(/[»"']$/g, '')
      .trim() || brandName;
  return { brandName, shortName, siteTitle, logoUrl };
}
