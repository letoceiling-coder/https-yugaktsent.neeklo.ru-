import { useMemo } from 'react';
import { Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import aboutMain from '@/assets/about-main.jpg';
import {
  aboutPlatformIcon,
  aboutPlatformSectionBg,
  normalizeAboutPlatformSettings,
  sortedEnabledStats,
  aboutPlatformStatHref,
  type AboutPlatformSettings,
  type AboutPlatformStat,
} from '@/shared/lib/about-platform-cms';
import { useAboutPlatformSection } from '@/shared/hooks/useAboutPlatformSection';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import { withoutLegacyBrand } from '@/shared/lib/site-brand-text';

type Props = {
  pageSlug?: string;
  settings?: AboutPlatformSettings;
  preview?: boolean;
};

function formatStatNumber(n: number): string {
  if (n >= 10_000) return n.toLocaleString('ru-RU');
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  return String(n);
}

function applyLiveStatValue(stat: AboutPlatformStat, live: Record<string, string | null>): string {
  const label = stat.label.toLowerCase();
  if (label.includes('квартир') || label.includes('объект')) return live.apartments ?? stat.value;
  if (label.includes('комплекс') || label.includes('жк')) return live.complexes ?? stat.value;
  if (label.includes('регион')) return live.regions ?? stat.value;
  return stat.value;
}

function CtaLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const className = cn(
    'inline-flex h-11 min-h-12 sm:min-h-11 items-center justify-center rounded-[10px] px-6 py-3 text-[15px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    variant === 'primary'
      ? 'bg-primary text-primary-foreground font-semibold hover:opacity-90'
      : 'border-[1.5px] border-primary bg-transparent text-primary font-medium hover:bg-primary/[0.08]',
  );
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

const AboutPlatform = ({ pageSlug = '/', settings: settingsProp, preview = false }: Props) => {
  const cms = useAboutPlatformSection(preview ? '' : pageSlug);
  const { shortName } = useSiteBrand();
  const { data: defaultRegionId } = useDefaultRegionId();
  const { data: siteMap } = useSiteSettings();

  const kindCounts = useQuery({
    queryKey: ['stats', 'listing-kind-counts', defaultRegionId],
    queryFn: () =>
      apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${defaultRegionId}`),
    enabled: defaultRegionId != null && !preview,
    staleTime: 120_000,
  });

  const catalogCounts = useQuery({
    queryKey: ['blocks', 'catalog-counts', defaultRegionId],
    queryFn: () =>
      apiGet<{ blocks: number; apartments: number }>(
        `/blocks/catalog-counts?region_id=${defaultRegionId}`,
      ),
    enabled: defaultRegionId != null && !preview,
    staleTime: 120_000,
  });

  const globalCounters = useQuery({
    queryKey: ['stats', 'counters'],
    queryFn: () =>
      apiGet<{ blocks: number; apartments: number; builders: number; regions: number; regionNames?: string[] }>(
        '/stats/counters',
      ),
    enabled: !preview,
    staleTime: 120_000,
  });

  const liveStats = useMemo((): Record<string, string | null> => {
    const apartments =
      globalCounters.data?.apartments != null && globalCounters.data.apartments > 0
        ? globalCounters.data.apartments.toLocaleString('ru-RU')
        : null;
    const complexes =
      globalCounters.data?.blocks != null && globalCounters.data.blocks > 0
        ? globalCounters.data.blocks.toLocaleString('ru-RU')
        : catalogCounts.data?.blocks != null && catalogCounts.data.blocks > 0
          ? formatStatNumber(catalogCounts.data.blocks)
          : null;
    const names = globalCounters.data?.regionNames ?? [];
    const regions =
      names.length > 0
        ? names.length <= 3
          ? names.join(' и ')
          : `${names.length} региона`
        : globalCounters.data?.regions != null && globalCounters.data.regions > 0
          ? String(globalCounters.data.regions)
          : null;
    return { apartments, complexes, regions };
  }, [catalogCounts.data, globalCounters.data]);

  if (!preview && !settingsProp && cms === null) return null;

  const settings = settingsProp ?? cms?.settings ?? normalizeAboutPlatformSettings(null);
  const brandText = (value: string) => withoutLegacyBrand(value, shortName);
  const eyebrow = brandText(settings.eyebrow);
  const title = brandText(settings.title);
  const description = brandText(settings.description);
  const imageAlt = brandText(settings.imageAlt);
  const stats = sortedEnabledStats(settings)
    .map((s) => ({
      ...s,
      value: preview ? s.value : applyLiveStatValue(s, liveStats),
    }))
    // Прочерк вместо числа — это отсутствие данных, а не показатель
    .filter((s) => /\d/.test(s.value));
  const cmsAboutImage = settingOptional(siteMap, 'about_platform_image');
  const desktopSrc = settings.imageUrl?.trim() || cmsAboutImage || aboutMain;
  const mobileSrc = settings.imageUrlMobile?.trim() || desktopSrc;

  return (
    <section className="section-y" aria-labelledby="about-platform-title">
      <div className="container-page">
        {/* Мятная плашка с крупным внутренним отступом — по согласованному макету */}
        <div className="overflow-hidden rounded-[24px] bg-mint lg:rounded-[32px]">
          <div className="grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_minmax(320px,44%)] lg:items-center lg:gap-12 lg:p-14">
            <div className="flex min-w-0 flex-col">
              <Quote className="h-8 w-8 shrink-0 text-primary/30" aria-hidden />

              {eyebrow ? (
                <p className="text-overline mt-5 text-primary/70">{eyebrow}</p>
              ) : null}

              <h2 id="about-platform-title" className="text-section-title mt-2 text-foreground">
                {title}
              </h2>

              {description ? (
                <p className="mt-4 max-w-[560px] text-sm leading-relaxed text-mint-foreground/80 sm:text-base">
                  {description}
                </p>
              ) : null}

              {stats.length > 0 ? (
                <ul className="mt-7 flex flex-wrap gap-x-8 gap-y-4" aria-label="Показатели">
                  {stats.map((st) => (
                    <li key={st.id}>
                      <div className="text-xl font-bold leading-none tabular-nums text-foreground sm:text-2xl">
                        {st.value}
                      </div>
                      <div className="mt-1.5 text-xs leading-snug text-mint-foreground/60">{st.label}</div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {settings.primaryButtonText?.trim() ? (
                  <CtaLink href={settings.primaryButtonUrl || '/about'} variant="primary">
                    {settings.primaryButtonText}
                  </CtaLink>
                ) : null}
                {settings.secondaryButtonText?.trim() ? (
                  <CtaLink href={settings.secondaryButtonUrl || '/catalog'} variant="secondary">
                    {settings.secondaryButtonText}
                  </CtaLink>
                ) : null}
              </div>
            </div>

            <div className="relative order-first w-full lg:order-none">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-muted shadow-[0_8px_32px_rgba(15,23,42,0.10)] lg:aspect-[4/5]">
                <picture className="block h-full w-full">
                  {settings.imageUrlMobile?.trim() ? (
                    <source media="(max-width: 767px)" srcSet={mobileSrc} />
                  ) : null}
                  <img
                    src={desktopSrc}
                    alt={imageAlt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={800}
                  />
                </picture>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPlatform;
