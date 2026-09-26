import { useEffect, useState, type RefObject } from 'react';

/**
 * true, как только элемент впервые подошёл к экрану (и больше не сбрасывается).
 * Нужен, чтобы тяжёлые виджеты (карта) не грузились, пока их никто не видит.
 */
export function useInViewOnce(ref: RefObject<Element | null>, rootMargin = '400px'): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}
