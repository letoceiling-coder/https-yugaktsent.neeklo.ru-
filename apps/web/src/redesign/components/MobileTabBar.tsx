import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, LayoutGrid, MapPin, Menu, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/shared/hooks/useFavorites';

type Props = {
  /** Открыть поиск (обычно — шторка или фокус в поле) */
  onSearch: () => void;
  /** Открыть меню «Ещё» */
  onMore: () => void;
  /** Клик по избранному: гостя уводим на вход */
  onFavorites: () => void;
};

const TAB_CLASS =
  'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors';

/**
 * Нижняя навигация для телефонов: пять вкладок, прячется при скролле вниз
 * и возвращается при скролле вверх, чтобы не съедать экран.
 */
const MobileTabBar = ({ onSearch, onMore, onFavorites }: Props) => {
  const location = useLocation();
  const { count: favoritesCount } = useFavorites();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      // Малые колебания игнорируем, иначе панель дрожит
      if (Math.abs(delta) < 8) return;
      setHidden(delta > 0 && y > 80);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const tone = (active: boolean) => (active ? 'text-primary' : 'text-muted-foreground');

  return (
    <nav
      aria-label="Основная навигация"
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md',
        'pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200',
        hidden && 'translate-y-[calc(100%+env(safe-area-inset-bottom,0px))]',
      )}
    >
      <div className="grid grid-cols-5">
        <Link to="/catalog" className={cn(TAB_CLASS, tone(isActive('/catalog')))}>
          <LayoutGrid className="h-6 w-6" />
          <span>Каталог</span>
        </Link>

        <button type="button" onClick={onSearch} className={cn(TAB_CLASS, tone(false))}>
          <Search className="h-6 w-6" />
          <span>Поиск</span>
        </button>

        <Link to="/map" className={cn(TAB_CLASS, tone(isActive('/map')))}>
          <MapPin className="h-6 w-6" />
          <span>Карта</span>
        </Link>

        <button
          type="button"
          onClick={onFavorites}
          className={cn(TAB_CLASS, 'relative', tone(isActive('/account/favorites')))}
        >
          <Heart className="h-6 w-6" />
          {favoritesCount > 0 ? (
            <span className="absolute right-[22%] top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold leading-none text-destructive-foreground">
              {favoritesCount > 9 ? '9+' : favoritesCount}
            </span>
          ) : null}
          <span>Избранное</span>
        </button>

        <button type="button" onClick={onMore} className={cn(TAB_CLASS, tone(false))}>
          <Menu className="h-6 w-6" />
          <span>Ещё</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileTabBar;
