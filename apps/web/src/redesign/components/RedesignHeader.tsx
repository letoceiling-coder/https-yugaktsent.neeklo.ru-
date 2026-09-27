import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, X, Phone, Send, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import { telHref } from '@/lib/contact-links';
import MobileTabBar from '@/redesign/components/MobileTabBar';
import ConsultationFlow from '@/redesign/components/ConsultationFlow';
import { btnClass } from '@/redesign/lib/button-styles';

/** Пять пунктов меню по согласованным макетам. */
const NAV_ITEMS: { label: string; href: string; match: (path: string, search: string) => boolean }[] = [
  {
    label: 'Каталог недвижимости',
    href: '/catalog',
    match: (p, s) => p.startsWith('/catalog') && !s.includes('market=new'),
  },
  {
    label: 'Новостройки',
    href: '/catalog?type=apartments&market=new',
    match: (p, s) => p.startsWith('/catalog') && s.includes('market=new'),
  },
  { label: 'О компании', href: '/about', match: (p) => p.startsWith('/about') },
  { label: 'Новости', href: '/news', match: (p) => p.startsWith('/news') },
  { label: 'Контакты', href: '/contacts', match: (p) => p.startsWith('/contacts') },
];

const RedesignHeader = () => {
  const { data: siteSettings } = useSiteSettings();
  const { shortName, logoUrl } = useSiteBrand();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  // Ссылки на каналы заполняет заказчик в админке; пустые — иконку не рисуем.
  const telegramUrl = settingOptional(siteSettings, 'telegram_url');
  const youtubeUrl = settingOptional(siteSettings, 'youtube_url');
  const phoneMain = settingOptional(siteSettings, 'phone_main');

  // Навигация по ссылке из выехавшей панели не должна оставлять её открытой
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const isActive = (item: (typeof NAV_ITEMS)[number]) => item.match(location.pathname, location.search);

  const socials = (
    <>
      {telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <Send className="h-[18px] w-[18px]" />
        </a>
      ) : null}
      {youtubeUrl ? (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <Youtube className="h-[18px] w-[18px]" />
        </a>
      ) : null}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
        <div className="container-page flex h-16 items-center gap-4 lg:h-[72px]">
          {/* В самом логотипе уже есть название — подписывать его ещё раз незачем */}
          <Link to="/" className="flex shrink-0 items-center" aria-label={shortName}>
            <img
              src={logoUrl}
              alt={shortName}
              width={194}
              height={48}
              className="h-10 w-auto lg:h-12"
              decoding="async"
            />
          </Link>

          <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Основное меню">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                aria-current={isActive(item) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
                  isActive(item)
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted hover:text-primary',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            {phoneMain ? (
              <>
                <a
                  href={telHref(phoneMain)}
                  className="hidden items-center gap-2 whitespace-nowrap px-2 text-[15px] font-semibold text-foreground transition-colors hover:text-primary xl:inline-flex"
                >
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  {phoneMain}
                </a>
                <a
                  href={telHref(phoneMain)}
                  aria-label={`Позвонить ${phoneMain}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted hover:text-primary xl:hidden"
                >
                  <Phone className="h-[18px] w-[18px]" />
                </a>
              </>
            ) : null}

            <div className="hidden items-center gap-1 lg:flex">{socials}</div>

            <button
              type="button"
              onClick={() => setLeadOpen(true)}
              className={cn(btnClass('primary'), 'hidden h-10 px-5 lg:inline-flex')}
            >
              Оставить заявку
            </button>

            <button
              type="button"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-muted lg:hidden"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 top-16 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute inset-x-0 top-0 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background p-4 shadow-lg"
            aria-label="Мобильное меню"
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex min-h-[52px] items-center rounded-xl px-4 py-3 text-lg font-medium transition-colors',
                    isActive(item) ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setLeadOpen(true);
              }}
              className={cn(btnClass('primary'), 'mt-4 h-12 w-full')}
            >
              Оставить заявку
            </button>

            {phoneMain ? (
              <a
                href={telHref(phoneMain)}
                className="mt-3 flex min-h-[44px] items-center justify-center text-base font-medium text-foreground"
              >
                {phoneMain}
              </a>
            ) : null}

            {telegramUrl || youtubeUrl ? (
              <div className="mt-2 flex items-center justify-center gap-2 border-t border-border pt-3">{socials}</div>
            ) : null}
          </nav>
        </div>
      ) : null}

      <MobileTabBar />

      <ConsultationFlow
        open={leadOpen}
        onOpenChange={setLeadOpen}
        context={{ surface: 'home', source: 'header', title: 'Оставить заявку' }}
      />
    </>
  );
};

export default RedesignHeader;
