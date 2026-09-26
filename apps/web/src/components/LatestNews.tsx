import { ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useSiteSettings } from '@/redesign/hooks/useSiteSettings';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import CardShell from './CardShell';
import PropertyBadge from './PropertyBadge';
import HorizontalSnapSlider from '@/redesign/components/HorizontalSnapSlider';
import { btnClass } from '@/redesign/lib/button-styles';
import { formatNewsDateShort, formatNewsSource } from '@/redesign/lib/news-source';
import { cn } from '@/lib/utils';

type NewsRow = {
  id: number;
  slug: string;
  title: string;
  imageUrl: string | null;
  source: string | null;
  publishedAt: string | null;
};

type NewsResponse = {
  data: NewsRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

function newsPerPage(map: Map<string, string> | undefined): number {
  const raw = map?.get('home_news_per_page');
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 && n <= 24 ? n : 4;
}

function NewsCard({ n, className }: { n: NewsRow; className?: string }) {
  const sourceLabel = formatNewsSource(n.source);
  const dateLabel = formatNewsDateShort(n.publishedAt);
  const hasImage = Boolean(n.imageUrl?.trim());

  return (
    <CardShell className={cn('h-full', className)}>
      <Link
        to={`/news/${encodeURIComponent(n.slug)}`}
        className="flex flex-col flex-1 min-h-0 h-full"
      >
        <div className="overflow-hidden aspect-video bg-muted shrink-0">
          {hasImage ? (
            <img
              src={n.imageUrl!}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-opacity duration-300 opacity-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Newspaper className="w-8 h-8 opacity-40" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col gap-1 min-h-[88px]">
          <PropertyBadge label={sourceLabel} type="new" className="self-start" />
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{n.title}</h3>
          {dateLabel ? (
            <span className="text-[11px] text-muted-foreground">{dateLabel}</span>
          ) : null}
        </div>
      </Link>
    </CardShell>
  );
}

const LatestNews = () => {
  const { data: siteMap } = useSiteSettings();
  const { data: regionId } = useDefaultRegionId();
  const perPage = newsPerPage(siteMap);

  const { data, isLoading } = useQuery({
    queryKey: ['news', 'home', perPage, regionId ?? null],
    queryFn: () =>
      apiGet<NewsResponse>(
        `/news?per_page=${perPage}&page=1${regionId != null ? `&region_id=${regionId}` : ''}`,
      ),
    enabled: regionId != null,
    staleTime: 300_000,
  });

  const items = data?.data ?? [];
  if (!isLoading && items.length === 0) return null;

  const cards = items.map((n) => <NewsCard key={n.id} n={n} />);

  return (
    <section className="section-y">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold">Последние новости</h2>
          <Link to="/news" className={cn(btnClass('secondary'), 'hidden sm:inline-flex')}>
            Все новости
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <div className="aspect-video bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <HorizontalSnapSlider
            mobileItemClass="w-[calc(100vw-72px)]"
            desktopGridClass="sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch"
            showDots
            showArrows={false}
          >
            {cards}
          </HorizontalSnapSlider>
        )}

        <Link to="/news" className={cn(btnClass('secondary', { block: true }), 'mt-4 sm:hidden')}>
          Все новости
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};

export default LatestNews;
