import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode[];
  /** Mobile card width — default calc(100vw - 32px) */
  mobileItemClass?: string;
  desktopGridClass?: string;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
};

const HorizontalSnapSlider = ({
  children,
  mobileItemClass = 'w-[calc(100vw-72px)]',
  desktopGridClass,
  showDots = true,
  showArrows = true,
  className,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = children.length;

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;
    const item = el.firstElementChild as HTMLElement | null;
    if (!item) return;
    const gap = 12;
    const stride = item.offsetWidth + gap;
    if (stride <= 0) return;
    const idx = Math.round(el.scrollLeft / stride);
    setActiveIndex(Math.max(0, Math.min(count - 1, idx)));
  }, [count]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateIndex, { passive: true });
    return () => el.removeEventListener('scroll', updateIndex);
  }, [updateIndex]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    const amount = item ? item.offsetWidth + 12 : el.offsetWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    if (!item) return;
    const gap = 12;
    el.scrollTo({ left: index * (item.offsetWidth + gap), behavior: 'smooth' });
  };

  if (count === 0) return null;

  if (desktopGridClass) {
    return (
      <>
        <div className={cn('hidden sm:grid', desktopGridClass)}>
          {children.map((child, i) => (
            <div key={i} className="h-full min-h-0 flex w-full">
              {child}
            </div>
          ))}
        </div>
        <div className="sm:hidden">
          <div
            ref={scrollRef}
            className={cn(
              'flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 items-stretch',
              className,
            )}
          >
            {children.map((child, i) => (
              <div key={i} className={cn('snap-start shrink-0 flex', mobileItemClass)}>
                {child}
              </div>
            ))}
          </div>
          {showDots && count > 1 ? (
            <div className="flex justify-center gap-1.5 mt-3">
              {children.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Слайд ${i + 1}`}
                  onClick={() => scrollTo(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === activeIndex ? 'w-4 bg-primary' : 'w-1.5 bg-[#d1d5db]',
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="relative">
      {showArrows && count > 1 ? (
        <div className="hidden lg:flex absolute -top-12 right-0 items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-[10px] border-[1.5px] border-primary bg-transparent flex items-center justify-center text-primary hover:bg-primary/[0.08] transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-[10px] border-[1.5px] border-primary bg-transparent flex items-center justify-center text-primary hover:bg-primary/[0.08] transition-colors"
            aria-label="Вперёд"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className={cn(
          'flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 items-stretch',
          className,
        )}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className={cn(
              'snap-start shrink-0 flex',
              mobileItemClass,
              'lg:min-w-0 lg:flex-1 lg:w-auto',
            )}
          >
            {child}
          </div>
        ))}
      </div>
      {showDots && count > 1 ? (
        <div className="flex justify-center gap-1.5 mt-3 lg:mt-4">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Слайд ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === activeIndex ? 'w-4 bg-primary' : 'w-1.5 bg-[#d1d5db]',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default HorizontalSnapSlider;
