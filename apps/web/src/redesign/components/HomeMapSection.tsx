import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { settingOptional, useSiteSettings } from '@/redesign/hooks/useSiteSettings';
import { yandexMapsHref, yandexMapWidgetSrc } from '@/lib/contact-links';
import { typo } from '@/shared/lib/typography';

/**
 * Блок «Посмотрите, что где стоит» с живой картой.
 *
 * Карта — виджет Яндекса в iframe: он работает без ключа API, в отличие от
 * интерактивной карты каталога. Точку ставим только по координатам из
 * настроек; выдуманных координат на карте быть не должно.
 */
const HomeMapSection = () => {
  const { data: s } = useSiteSettings();
  const officeLat = settingOptional(s, 'office_lat');
  const officeLng = settingOptional(s, 'office_lng');
  const address = settingOptional(s, 'address') ?? settingOptional(s, 'contacts_address') ?? '';

  // Обзор города, а не вход в офис: блок про «что где стоит»
  const widgetSrc = yandexMapWidgetSrc({ officeLat, officeLng, address, zoom: 13 });
  const mapsUrl = yandexMapsHref({ officeLat, officeLng, address });

  return (
    <section className="section-y" aria-labelledby="map-cta-title">
      <div className="container-page">
        <div className="overflow-hidden rounded-[24px] bg-graphite lg:rounded-[32px]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
              <p className="text-overline text-white/50">Карта</p>
              <h2 id="map-cta-title" className="text-section-title mt-3 text-white">
                {typo('Посмотрите, что где стоит')}
              </h2>
              <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-white/70">
                {typo(
                  'Все жилые комплексы на одной карте: до моря, до центра, до школы. Фильтры по цене и комнатности работают прямо на карте.',
                )}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/map"
                  className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-graphite transition-colors hover:bg-white/90"
                >
                  Открыть карту
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-[15px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    Как доехать в офис
                  </a>
                ) : null}
              </div>
            </div>

            {widgetSrc ? (
              <div className="min-h-[280px] lg:min-h-[420px]">
                <iframe
                  title="Анапа на Яндекс Картах"
                  src={widgetSrc}
                  className="h-full min-h-[280px] w-full border-0 lg:min-h-[420px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeMapSection;
