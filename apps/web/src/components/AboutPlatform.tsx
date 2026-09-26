import { useMemo } from 'react';
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
  const stats = sortedEnabledStats(settings).map((s) => ({
    ...s,
    value: preview ? s.value : applyLiveStatValue(s, liveStats),
  }));
  const cmsAboutImage = settingOptional(siteMap, 'about_platform_image');
  const desktopSrc = settings.imageUrl?.trim() || cmsAboutImage || aboutMain;
  const mobileSrc = settings.imageUrlMobile?.trim() || desktopSrc;

  return (
    <section
      className={cn('section-y', aboutPlatformSectionBg(settings.backgroundVariant))}
      aria-labelledby="about-platform-title"
    >
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 md:items-stretch">
          <div className="relative mx-auto w-full max-w-[480px] md:max-w-none md:mx-0 flex">
            <div className="relative overflow-hidden rounded-3xl w-full min-h-[220px] sm:min-h-[260px] md:min-h-[320px] md:h-full shadow-[0_4px_24px_rgba(0,0,0,0.06)] bg-muted">
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
                  height={512}
                />
              </picture>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 min-w-0 justify-center">
            {eyebrow ? (
              <p className="text-xs font-medium tracking-wide text-primary/80">{eyebrow}</p>
            ) : null}
            <h2 id="about-platform-title" className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl line-clamp-6">
                {description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {settings.primaryButtonText?.trim() ? (
                <CtaLink href={settings.primaryButtonUrl || '/login'} variant="primary">
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
        </div>

        {stats.length > 0 ? (
          <ul
            className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3"
            aria-label="Показатели платформы"
          >
            {stats.map((s) => {
              const Icon = aboutPlatformIcon(s.icon);
              const href = preview ? null : aboutPlatformStatHref(s.label);
              const inner = (
                <div className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-bold tabular-nums leading-none text-foreground">
                      {s.value}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">{s.label}</div>
                  </div>
                </div>
              );
              return (
                <li key={s.id}>
                  {href ? (
                    <Link
                      to={href}
                      className="block rounded-xl border border-border/60 bg-background/90 px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-primary/30 transition-colors"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

export default AboutPlatform;
