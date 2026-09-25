import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Menu, X, Search, Home, LayoutGrid, Heart, LogIn, ChevronDown, User, Star, LogOut, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { apiGet } from '@/lib/api';
import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { useAuth } from '@/shared/hooks/useAuth';
import { useFavorites } from '@/shared/hooks/useFavorites';
import UserNotificationBell from '@/account/components/UserNotificationBell';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import { isBelgorodRegion } from '@/redesign/lib/region-picker-utils';
import { telHref } from '@/lib/contact-links';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import CatalogSearchHintsDropdown from '@/redesign/components/CatalogSearchHintsDropdown';
import type { CatalogHints } from '@/redesign/lib/catalog-hints-types';
import { btnClass } from '@/redesign/lib/button-styles';

const catalogCategories = [
  { label: 'Квартиры', href: '/catalog?type=apartments', sub: [
    { label: 'Новостройки', href: '/catalog?type=apartments&market=new' },
    { label: 'Вторичное жильё', href: '/catalog?type=apartments&market=secondary' },
  ]},
  { label: 'Дома', href: '/catalog?type=houses' },
  { label: 'Участки', href: '/catalog?type=land' },
  { label: 'Коммерция', href: '/catalog?type=commercial' },
];

const navLinkClass =
  'px-2 py-2 text-[15px] font-medium rounded-lg transition-colors text-[#111827] hover:text-primary';

const RedesignHeader = () => {
  const { data: siteSettings } = useSiteSettings();
  const { shortName, logoUrl } = useSiteBrand();
  const { data: regionId, rows: regionRows } = useDefaultRegionId();
  const belgorodRegion = regionRows?.find(isBelgorodRegion);
  const phoneMain = settingOptional(siteSettings, 'phone_main');
  const phoneHref = phoneMain ? telHref(phoneMain) : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const deferredSearch = useDeferredValue(query.trim());
  const hintsEnabled = searchOpen && deferredSearch.length >= 2 && regionId != null;
  const { data: headerHints, isFetching: headerHintsLoading } = useQuery({
    queryKey: ['search', 'catalog-hints', 'header', regionId, deferredSearch],
    queryFn: () =>
      apiGet<CatalogHints>(
        `/search/catalog-hints?region_id=${regionId}&q=${encodeURIComponent(deferredSearch)}&limit=12`,
      ),
    enabled: hintsEnabled,
    staleTime: 20_000,
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [loginModalTgError, setLoginModalTgError] = useState('');
  const { isAuthenticated, user, logout } = useAuth();
  const { count: favoritesCount } = useFavorites();

  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const handleHeartClick = () => {
    navigate('/account/favorites');
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setDesktopSearchOpen(false);
      }
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) setCatalogOpen(false);
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 lg:min-w-[140px]">
            <img
              src={logoUrl}
              alt={shortName}
              className="h-10 sm:h-11 w-auto max-w-[min(220px,46vw)] object-contain object-left"
            />
          </Link>

          {/* Desktop nav — centered */}
          <nav className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-4 xl:gap-8 text-[#111827]">
            <div
              ref={catalogRef}
              className="relative"
              onMouseEnter={() => setCatalogOpen(true)}
              onMouseLeave={() => setCatalogOpen(false)}
            >
              <button
                type="button"
                className={cn(
                  navLinkClass,
                  'flex items-center gap-1 font-medium',
                  catalogOpen && 'bg-[#f3f4f6]',
                )}
              >
                Каталог
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', catalogOpen && 'rotate-180')} />
              </button>
              {catalogOpen && (
                <div className="absolute top-full left-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[260px]">
                  {catalogCategories.map(item => (
                    <div key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => setCatalogOpen(false)}
                        className="block px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                      >
                        {item.label}
                      </Link>
                      {'sub' in item && item.sub && (
                        <div className="pl-4">
                          {item.sub.map(sub => (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              onClick={() => setCatalogOpen(false)}
                              className="block px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link to="/catalog?type=apartments&market=new" className={navLinkClass}>
              Новостройки
            </Link>
            {belgorodRegion ? (
              <Link to={`/catalog?region_id=${belgorodRegion.id}`} className={navLinkClass}>
                {belgorodRegion.name ?? 'Белгород'}
              </Link>
            ) : null}
            <Link to="/agents" className={navLinkClass}>
              Агенты
            </Link>
            <Link to="/contacts" className={navLinkClass}>
              Контакты
            </Link>
          </nav>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0 justify-end">
            <div
              ref={searchRef}
              className={cn(
                'relative transition-all duration-300 ease-out',
                desktopSearchOpen ? 'flex-1 max-w-md' : 'w-10',
              )}
            >
              {desktopSearchOpen ? (
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Район, метро, ЖК, улица..."
                    className="pl-9 h-10 w-full border-[#e5e7eb]"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && query.trim()) {
                        navigate(`/catalog?type=apartments&search=${encodeURIComponent(query.trim())}`);
                        setDesktopSearchOpen(false);
                        setQuery('');
                      }
                      if (e.key === 'Escape') setDesktopSearchOpen(false);
                    }}
                  />
                  {query.trim().length >= 2 && regionId != null && (
                    <CatalogSearchHintsDropdown
                      hints={headerHints}
                      isLoading={headerHintsLoading}
                      className="absolute left-0 right-0 top-full mt-1.5 z-50"
                      onPick={() => {
                        setDesktopSearchOpen(false);
                        setQuery('');
                      }}
                    />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDesktopSearchOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors"
                  aria-label="Поиск"
                >
                  <Search className="w-5 h-5 text-[#111827]" />
                </button>
              )}
            </div>
            <UserNotificationBell />
            <button
              type="button"
              onClick={handleHeartClick}
              className="relative flex items-center justify-center w-11 h-11 rounded-full hover:bg-secondary transition-colors"
              title="Избранное"
            >
              <Heart className="w-6 h-6 text-muted-foreground" />
              {favoritesCount > 0 ? (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              ) : null}
            </button>
            <div className="w-px h-5 bg-border" />
            {phoneMain && phoneHref ? (
              <a
                href={phoneHref}
                title={phoneMain}
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:text-primary hover:bg-muted/50 transition-colors"
              >
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap">{phoneMain}</span>
              </a>
            ) : null}

            {!isAuthenticated ? (
              <button
                onClick={() => setLoginModalOpen(true)}
                className={cn(btnClass('primary'), 'gap-1.5 shrink-0')}
              >
                <LogIn className="w-4 h-4" />
                Войти
              </button>
            ) : (
              <div ref={userDropdownRef} className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  title={user?.name ?? 'Профиль'}
                >
                  <User className="w-5 h-5 text-primary" />
                </button>
                {userDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 py-1.5 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-150">
                    <button
                      onClick={() => { setUserDropdownOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      Личный кабинет
                    </button>
                    <button
                      onClick={() => { setUserDropdownOpen(false); navigate('/favorites'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <Star className="w-4 h-4 text-muted-foreground" />
                      Избранное
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 lg:hidden" aria-hidden />

          {/* Mobile buttons */}
          <div className="flex lg:hidden items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={handleHeartClick}
              className="relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6]"
              aria-label="Избранное"
            >
              <Heart className="w-6 h-6" />
              {favoritesCount > 0 ? (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={() => setSearchOpen(!searchOpen)} className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6]" aria-label="Поиск">
              <Search className="w-6 h-6" />
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[#f3f4f6]" aria-label="Меню">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="lg:hidden border-t border-border px-4 py-3 bg-background animate-in slide-in-from-top-2 duration-200">
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Район, метро, ЖК, улица..."
                className="pl-9 h-10"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    navigate(`/catalog?type=apartments&search=${encodeURIComponent(query.trim())}`);
                    setSearchOpen(false);
                  }
                }}
              />
              {query.trim().length >= 2 && regionId != null && (
                <CatalogSearchHintsDropdown
                  hints={headerHints}
                  isLoading={headerHintsLoading}
                  className="absolute left-0 right-0 top-full mt-1.5"
                  onPick={() => {
                    setSearchOpen(false);
                    setQuery('');
                  }}
                />
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[59] bg-black/40 lg:hidden"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[60] w-[85vw] max-w-[320px] bg-white flex flex-col shadow-xl lg:hidden animate-in slide-in-from-right duration-[250ms] ease-out">
          <div className="flex items-center justify-between h-16 px-4 border-b border-[#e5e7eb]">
            <span className="font-semibold">Меню</span>
            <button onClick={() => setMenuOpen(false)} className="w-10 h-10 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <nav className="flex flex-col p-4 gap-1">
            <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">Каталог</p>
            {catalogCategories.map(item => (
              <div key={item.href}>
                <Link to={item.href} onClick={() => setMenuOpen(false)}
                  className="py-3 px-4 rounded-xl text-lg font-medium hover:bg-[#f3f4f6] transition-colors block min-h-[52px] flex items-center">{item.label}</Link>
                {'sub' in item && item.sub && item.sub.map(sub => (
                  <Link key={sub.href} to={sub.href} onClick={() => setMenuOpen(false)}
                    className="py-2 px-8 rounded-xl text-xs text-muted-foreground hover:bg-accent transition-colors block">{sub.label}</Link>
                ))}
              </div>
            ))}
            <div className="h-px bg-border my-2" />
            <Link to="/catalog?type=apartments&market=new" onClick={() => setMenuOpen(false)} className="py-3 px-4 rounded-xl text-lg font-medium hover:bg-[#f3f4f6] min-h-[52px] flex items-center">Новостройки</Link>
            {belgorodRegion ? (
              <Link
                to={`/catalog?region_id=${belgorodRegion.id}`}
                onClick={() => setMenuOpen(false)}
                className="py-3 px-4 rounded-xl text-lg font-medium hover:bg-[#f3f4f6] min-h-[52px] flex items-center"
              >
                {belgorodRegion.name ?? 'Белгород'}
              </Link>
            ) : null}
            <Link to="/agents" onClick={() => setMenuOpen(false)} className="py-3 px-4 rounded-xl text-lg font-medium hover:bg-[#f3f4f6] min-h-[52px] flex items-center">Агенты</Link>
            <Link to="/contacts" onClick={() => setMenuOpen(false)} className="py-3 px-4 rounded-xl text-lg font-medium hover:bg-[#f3f4f6] min-h-[52px] flex items-center">Контакты</Link>
          </nav>
          <div className="mt-auto p-4 border-t border-border space-y-3">
            {phoneMain && phoneHref ? (
              <a href={phoneHref} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" /> {phoneMain}
              </a>
            ) : null}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setLoginModalOpen(true); }}
                className={cn(btnClass('primary', { block: true }), 'gap-2')}
              >
                <LogIn className="w-4 h-4" /> Войти
              </button>
            ) : (
              <div className="space-y-1">
                <button onClick={() => { setMenuOpen(false); navigate('/profile'); }} className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm hover:bg-accent transition-colors">
                  <User className="w-4 h-4 text-muted-foreground" /> Личный кабинет
                </button>
                <button onClick={() => { setMenuOpen(false); navigate('/favorites'); }} className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm hover:bg-accent transition-colors">
                  <Star className="w-4 h-4 text-muted-foreground" /> Избранное
                </button>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="flex items-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm text-destructive hover:bg-accent transition-colors">
                  <LogOut className="w-4 h-4" /> Выйти
                </button>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-4 h-14 min-h-[56px]">
          <Link to="/" className={cn('flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium', location.pathname === '/' ? 'text-primary' : 'text-[#6b7280]')}>
            <Home className="w-6 h-6" />
            <span>Главная</span>
          </Link>
          <Link to="/catalog" className={cn('flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium', location.pathname.startsWith('/catalog') ? 'text-primary' : 'text-[#6b7280]')}>
            <LayoutGrid className="w-6 h-6" />
            <span>Каталог</span>
          </Link>
          <Link to="/map" className={cn('flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium', location.pathname === '/map' ? 'text-primary' : 'text-[#6b7280]')}>
            <MapPin className="w-6 h-6" />
            <span>Карта</span>
          </Link>
          <button
            type="button"
            onClick={handleHeartClick}
            className={cn('relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#6b7280]')}
          >
            <Heart className="w-6 h-6" />
            {favoritesCount > 0 ? (
              <span className="absolute top-1 right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center leading-none">
                {favoritesCount > 9 ? '9+' : favoritesCount}
              </span>
            ) : null}
            <span>Избранное</span>
          </button>
        </div>
      </div>

      {/* Login Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLoginModalOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-[400px] mx-4 p-6 sm:p-8 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setLoginModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-bold mb-1">Вход</h2>
            <p className="text-sm text-muted-foreground mb-6">Войдите, чтобы сохранять избранное</p>

            <Link
              to="/login"
              onClick={() => setLoginModalOpen(false)}
              className={btnClass('primary', { block: true })}
            >
              Войти по email и паролю
            </Link>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">или</span></div>
            </div>

            {loginModalTgError && (
              <p className="text-sm text-destructive text-center mb-3">{loginModalTgError}</p>
            )}
            <TelegramLoginButton
              onSuccess={() => {
                setLoginModalTgError('');
                setLoginModalOpen(false);
              }}
              onError={(msg) => setLoginModalTgError(msg)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default RedesignHeader;
