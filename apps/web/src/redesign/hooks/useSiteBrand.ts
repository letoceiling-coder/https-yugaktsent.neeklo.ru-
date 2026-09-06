import { useSiteSettings, setting, settingOptional } from '@/redesign/hooks/useSiteSettings';

import { defaultPublicBrandName } from '@/shared/lib/site-brand-text';

const DEFAULT_BRAND = defaultPublicBrandName();
const DEFAULT_LOGO = '/logo.svg';

/** Публичное имя бренда и лого из site_settings (white-label). */
export function useSiteBrand() {
  const query = useSiteSettings();
  const settings = query.data;

  const brandName = setting(settings, 'company_name', DEFAULT_BRAND);
  const siteTitle = setting(settings, 'site_title', `${brandName} — недвижимость`);
  const logoUrl = setting(settings, 'site_logo_url', DEFAULT_LOGO);
  const tagline = settingOptional(settings, 'site_tagline') ?? 'Платформа недвижимости';

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
    tagline,
  };
}

export function siteBrandFromMap(settings: Map<string, string> | undefined) {
  const brandName = setting(settings, 'company_name', DEFAULT_BRAND);
  const siteTitle = setting(settings, 'site_title', `${brandName} — недвижимость`);
  const logoUrl = setting(settings, 'site_logo_url', DEFAULT_LOGO);
  const shortName =
    brandName
      .replace(/^ООО\s*[«"']?/i, '')
      .replace(/[»"']$/g, '')
      .trim() || brandName;
  return { brandName, shortName, siteTitle, logoUrl };
}
