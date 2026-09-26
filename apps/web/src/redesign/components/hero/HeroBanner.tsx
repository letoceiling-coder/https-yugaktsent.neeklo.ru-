import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import ConsultationFlow from '@/redesign/components/ConsultationFlow';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import { parseHomeBanners, visibleHomeBanners, type HomeBanner } from '@/redesign/lib/home-banners';

const AUTOPLAY_MS = 6500;
/** Ниже этого сдвига палец считаем дрожанием, а не свайпом */
const SWIPE_THRESHOLD_PX = 50;

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Первый экран: слайдер во всю ширину и высоту окна.
 * Слайды заводятся в админке («Главная: баннеры»), текст лежит на тёмном
 * градиенте слева — читаемость не зависит от того, какое фото загрузили.
 */
const HeroBanner = () => {
  const { data: settings } = useSiteSettings();
  const { shortName } = useSiteBrand();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const slides = useMemo<HomeBanner[]>(() => {
    const fromSettings = visibleHomeBanners(parseHomeBanners(settingOptional(settings, 'home_banners')));
    if (fromSettings.length > 0) return fromSettings;
    // Пока слайды не заведены в админке — один экран из общих настроек сайта.
    return [
      {
        id: 'default',
        image: settingOptional(settings, 'about_platform_image') ?? '',
        tag: '',
        title: settingOptional(settings, 'site_title') ?? shortName,
        subtitle: settingOptional(settings, 'meta_description') ?? '',
        buttonText: 'Открыть каталог',
        buttonLink: '/catalog',
        consultButtonText: 'Получить консультацию',
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
    if (total < 2 || paused || consultOpen) return;
    const t = setInterval(() => setIndex((prev) => (prev + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [total, paused, consultOpen]);

  const active = slides[Math.min(index, total - 1)];
  if (!active) return null;

  const arrowClass =
    'absolute top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full ' +
    'border border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:flex';

  return (
    <section
      className="relative h-[calc(100svh-4rem)] min-h-[520px] w-full overflow-hidden lg:h-[calc(100svh-72px)]"
      aria-roledescription="carousel"
      aria-label="Баннеры"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null || total < 2) return;
        const delta = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        go(delta < 0 ? index + 1 : index - 1);
      }}
    >
      {/* Слайды лежат стопкой и меняются прозрачностью: высота не скачет */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {slide.image ? (
            <StableMediaFrame
              src={slide.image}
              altContext={slide.title || 'Баннер'}
              decorative
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : undefined}
              fixedHeightClass="h-full w-full"
              className="h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/70" />
          )}
        </div>
      ))}

      {/* Затемнение слева: текст читается на любом фото */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-graphite/85 via-graphite/55 to-graphite/10"
        aria-hidden
      />

      <div className="container-page relative z-10 flex h-full flex-col justify-center">
        <div className="max-w-[720px]">
          {active.tag ? (
            <p className="text-overline mb-4 text-white/80">{active.tag}</p>
          ) : null}
          {active.title ? (
            <h1 className="text-display text-white">{active.title}</h1>
          ) : null}
          {active.subtitle ? (
            <p className="mt-4 max-w-[560px] text-base leading-relaxed text-white/85 sm:mt-5 sm:text-lg">
              {active.subtitle}
            </p>
          ) : null}

          {active.buttonText || active.consultButtonText ? (
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
              {active.buttonText && active.buttonLink ? (
                isExternal(active.buttonLink) ? (
                  <a
                    href={active.buttonLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {active.buttonText}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    to={active.buttonLink}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {active.buttonText}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )
              ) : null}

              {active.consultButtonText ? (
                <button
                  type="button"
                  onClick={() => setConsultOpen(true)}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/50 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/15"
                >
                  {active.consultButtonText}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Предыдущий слайд"
            onClick={() => go(index - 1)}
            className={cn(arrowClass, 'left-4 lg:left-8')}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Следующий слайд"
            onClick={() => go(index + 1)}
            className={cn(arrowClass, 'right-4 lg:right-8')}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center gap-2 lg:bottom-28">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Слайд ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        </>
      ) : null}

      <ConsultationFlow
        open={consultOpen}
        onOpenChange={setConsultOpen}
        context={{ surface: 'home', source: 'hero', title: active.consultButtonText || 'Получить консультацию' }}
      />
    </section>
  );
};

export default HeroBanner;
