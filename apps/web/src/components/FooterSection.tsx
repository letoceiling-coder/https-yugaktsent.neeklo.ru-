import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setting, settingOptional, useSiteSettings } from '@/redesign/hooks/useSiteSettings';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import { telHref, yandexMapsHref, yandexMapWidgetSrc } from '@/lib/contact-links';
import {
  FOOTER_CATALOG_LINKS,
  FOOTER_COMPANY_LINKS,
  FOOTER_DEFAULT_ADDRESS,
  FOOTER_DEFAULT_EMAIL,
  FOOTER_DEFAULT_HOURS,
  FOOTER_DEFAULT_MAPS_URL,
  FOOTER_DEFAULT_PHONE,
} from '@/components/footer-constants';

const footerLinkClass =
  'inline-flex min-h-11 items-center text-sm opacity-80 hover:opacity-100 transition-opacity py-1.5 -my-1.5';

const FooterNavColumn = ({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; to: string }[];
}) => (
  <div>
    <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2 sm:mb-3">{title}</h3>
    <ul className="flex flex-col">
      {links.map((l) => (
        <li key={l.label}>
          <Link to={l.to} className={footerLinkClass}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const FooterOfficeMap = ({
  widgetSrc,
  mapsUrl,
  officeTitle,
}: {
  widgetSrc: string;
  mapsUrl: string;
  officeTitle: string;
}) => (
  <div className="mt-6 sm:mt-8">
    <div className="h-[300px] w-full overflow-hidden rounded-xl border border-primary-foreground/15 bg-primary-foreground/5">
      <iframe
        title={officeTitle}
        src={widgetSrc}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(footerLinkClass, 'mt-2 text-xs opacity-60')}
    >
      Открыть в Яндекс Картах
    </a>
  </div>
);

const FooterSection = React.forwardRef<HTMLElement>((_, ref) => {
  const { data: s } = useSiteSettings();
  const { shortName, logoUrl, tagline } = useSiteBrand();

  const phoneMain = setting(s, 'phone_main', FOOTER_DEFAULT_PHONE);
  const phoneHref = telHref(phoneMain);
  const emailVal =
    settingOptional(s, 'email') ?? settingOptional(s, 'contacts_email') ?? FOOTER_DEFAULT_EMAIL;
  const addressVal = setting(s, 'address', FOOTER_DEFAULT_ADDRESS);
  const officeLat = settingOptional(s, 'office_lat');
  const officeLng = settingOptional(s, 'office_lng');

  const mapsUrl =
    yandexMapsHref({ address: addressVal, officeLat, officeLng }) ?? FOOTER_DEFAULT_MAPS_URL;

  const whWeekday = settingOptional(s, 'work_hours_weekdays');
  const whWeekend = settingOptional(s, 'work_hours_weekend');
  const whSingle = settingOptional(s, 'work_hours') ?? settingOptional(s, 'contacts_work_hours');
  const hourLines = [whWeekday, whWeekend].filter(Boolean) as string[];
  if (hourLines.length === 0) {
    hourLines.push(whSingle?.trim() ? whSingle : FOOTER_DEFAULT_HOURS);
  }

  const copyrightYear = settingOptional(s, 'copyright_year') ?? '2026';

  const mapWidgetSrc =
    yandexMapWidgetSrc({ officeLat, officeLng, address: addressVal }) ??
    yandexMapWidgetSrc({ address: 'Белгород ул. Есенина 9' }) ??
    'https://yandex.ru/map-widget/v1/?text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%20%D1%83%D0%BB.%20%D0%95%D1%81%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0%209&z=16&l=map';

  const contactLinkClass = cn(
    'inline-flex min-h-11 items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity py-1',
  );

  return (
    <footer ref={ref} className="bg-foreground text-primary-foreground">
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {/* Brand + contacts */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex min-h-11 items-center mb-2">
              <img
                src={logoUrl}
                alt={shortName}
                className="h-10 w-auto max-w-[220px] object-contain object-left"
              />
            </Link>
            <p className="text-sm opacity-70 mb-4">{tagline}</p>

            <div className="space-y-0.5">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(contactLinkClass, 'items-start whitespace-pre-line')}
              >
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                <span className="underline-offset-2 hover:underline">{addressVal}</span>
              </a>
              <a href={phoneHref} className={contactLinkClass}>
                <Phone className="w-4 h-4 shrink-0" aria-hidden />
                {phoneMain}
              </a>
              <a href={`mailto:${emailVal}`} className={contactLinkClass}>
                <Mail className="w-4 h-4 shrink-0" aria-hidden />
                {emailVal}
              </a>
              <div className={cn(contactLinkClass, 'opacity-80')}>
                <Clock className="w-4 h-4 shrink-0" aria-hidden />
                <span>
                  {hourLines.map((line, i) => (
                    <span key={`${line}-${i}`}>
                      {i > 0 ? ' · ' : null}
                      {line}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>

          <FooterNavColumn title="Каталог" links={FOOTER_CATALOG_LINKS} />
          <FooterNavColumn title="Компания" links={FOOTER_COMPANY_LINKS} />
        </div>

        <FooterOfficeMap
          widgetSrc={mapWidgetSrc}
          mapsUrl={mapsUrl}
          officeTitle={`Офис ${shortName} на Яндекс Картах`}
        />
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="max-w-[1400px] mx-auto px-4 py-5 sm:py-6">
          <p className="text-xs sm:text-sm opacity-50">
            © {copyrightYear} {shortName}
            <span className="opacity-40 mx-2" aria-hidden>
              ·
            </span>
            <Link to="/privacy" className="inline-flex min-h-11 items-center hover:opacity-80 transition-opacity">
              Политика конфиденциальности
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
});

FooterSection.displayName = 'FooterSection';

export default FooterSection;
