import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import { parseHomeBanners, visibleHomeBanners, type HomeBanner } from '@/redesign/lib/home-banners';

const AUTOPLAY_MS = 7000;

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Баннер главной: слайды задаются в админке («Главная: баннеры»).
 * Текст лежит в плашке поверх тёмного градиента — читаемость не зависит от фото.
 */
const HeroBanner = () => {
  const { data: settings } = useSiteSettings();
  const { shortName } = useSiteBrand();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo<HomeBanner[]>(() => {
    const fromSettings = visibleHomeBanners(parseHomeBanners(settingOptional(settings, 'home_banners')));
    if (fromSettings.length > 0) return fromSettings;
    // Пока баннеры не заведены в админке — один слайд из настроек сайта.
    return [
      {
        id: 'default',
        image: settingOptional(settings, 'about_platform_image') ?? '',
        title: settingOptional(settings, 'site_title') ?? `${shortName}: новостройки и вторичка`,
        subtitle:
          settingOptional(settings, 'meta_description') ??
          'Каталог квартир, домов и коммерции с проверенными данными',
        buttonText: 'Смотреть каталог',
        buttonLink: '/catalog',
        enabled: true,
      },
    ];
  }, [settings, shortName]);

  const total = slides.length;
  const go = useCallback((next: number) => setIndex(((next % total) + total) % total), [total]);

  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [index, total]);

  useEffect(() => {
    if (total < 2 || paused) return;
    const t = setInterval(() => setIndex((prev) => (prev + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [total, paused]);

  const active = slides[Math.min(index, total - 1)];
  if (!active) return null;

  return (
    <section
      className="max-w-[1400px] mx-auto px-4 pt-4 sm:pt-6"
      aria-roledescription="carousel"
      aria-label="Баннеры"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[260px] overflow-hidden rounded-[20px] bg-muted sm:h-[340px] lg:h-[420px]">
        {active.image ? (
          <StableMediaFrame
            src={active.image}
            altContext={active.title || 'Баннер'}
            decorative={!active.title}
            loading="eager"
            fetchPriority="high"
            fixedHeightClass="h-full w-full"
            className="h-full w-full"
          />
        ) : (
          // Фото не задано — вместо заглушки ровная фирменная подложка
          <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary to-primary/70" aria-hidden />
        )}

        {/* Затемнение снизу — текст остаётся читаемым на любом фото */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
          <div className="max-w-[640px]">
            {active.title ? (
              <h1 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.25rem]">
                {active.title}
              </h1>
            ) : null}
            {active.subtitle ? (
              <p className="mt-2 text-sm leading-snug text-white/85 sm:mt-3 sm:text-base">
                {active.subtitle}
              </p>
            ) : null}
            {active.buttonText && active.buttonLink ? (
              isExternal(active.buttonLink) ? (
                <a
                  href={active.buttonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:mt-6"
                >
                  {active.buttonText}
                </a>
              ) : (
                <Link
                  to={active.buttonLink}
                  className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:mt-6"
                >
                  {active.buttonText}
                </Link>
              )
            ) : null}
          </div>
        </div>

        {total > 1 ? (
          <>
            <button
              type="button"
              aria-label="Предыдущий слайд"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-colors hover:bg-white sm:flex"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button
              type="button"
              aria-label="Следующий слайд"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-colors hover:bg-white sm:flex"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Слайд ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === index ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/80',
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default HeroBanner;
