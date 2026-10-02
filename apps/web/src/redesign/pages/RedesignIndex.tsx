import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiConnectionStrip } from '@/components/ApiConnectionStrip';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import HeroSearch from '@/redesign/components/HeroSearch';
import ComplexCard from '@/redesign/components/ComplexCard';
import QuizSection from '@/components/QuizSection';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import LatestNews from '@/components/LatestNews';
import LeadHighlightSection from '@/redesign/components/LeadHighlightSection';
import FooterSection from '@/components/FooterSection';
import ConsultationFlow from '@/redesign/components/ConsultationFlow';
import type { ConsultationContext } from '@/redesign/lib/conversion-cta';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import { btnClass } from '@/redesign/lib/button-styles';
import HorizontalSnapSlider from '@/redesign/components/HorizontalSnapSlider';

const RedesignIndex = () => {
  const navigate = useNavigate();
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultContext, setConsultContext] = useState<ConsultationContext | null>(null);
  const { data: regionId } = useDefaultRegionId();

  const blocksFeatured = useQuery({
    queryKey: ['blocks', 'featured', regionId],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      sp.set('per_page', '24');
      sp.set('page', '1');
      sp.set('sort', 'created_desc');
      sp.set('require_active_listings', 'true');
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
    },
    enabled: regionId != null,
    staleTime: 300_000,
  });

  const featured = useMemo(() => {
    const rows = blocksFeatured.data?.data ?? [];
    const pool = rows.filter((b) => (b._count?.listings ?? 0) > 0);
    const withImages = pool.filter((b) => (b.images?.length ?? 0) > 0);
    const promoted = (withImages.length ? withImages : pool).filter((b) => b.isPromoted);
    const pick = (promoted.length >= 6 ? promoted : withImages.length ? withImages : pool.length ? pool : rows)
      .slice()
      .sort((a, z) => (z._count?.listings ?? 0) - (a._count?.listings ?? 0))
      .slice(0, 8)
      .map(mapApiBlockListRowToResidentialComplex);
    return pick;
  }, [blocksFeatured.data]);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <ApiConnectionStrip />
      <HeroSearch />

      {featured.length > 0 && (
      <section className="relative z-0 container-page section-y">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-section-title">Популярные ЖК</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className={cn(btnClass('secondary'), 'hidden sm:inline-flex')}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              На карте
            </button>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className={cn(btnClass('secondary'), 'hidden sm:inline-flex')}
            >
              Все предложения
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <HorizontalSnapSlider
          mobileItemClass="w-[calc(100vw-72px)]"
          /* Колонок не больше, чем карточек: две карточки в сетке на четыре
             выглядели брошенными с пустой половиной ряда */
          desktopGridClass={cn(
            'sm:grid-cols-2 md:grid-cols-2 gap-3 md:gap-3 lg:gap-4 items-stretch',
            featured.length >= 4 ? 'lg:grid-cols-4' : featured.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
          )}
          showDots
          showArrows={false}
        >
          {featured.map((c, index) => (
            <ComplexCard
              key={c.id}
              complex={c}
              variant="compact"
              coverAspect="16/9"
              priority={index < 4}
            />
          ))}
        </HorizontalSnapSlider>

        <button
          type="button"
          onClick={() => navigate('/catalog')}
          className={cn(btnClass('secondary', { block: true }), 'mt-4 sm:hidden')}
        >
          Все предложения
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
      )}


      <PropertyGridSection title="Горячие предложения" type="hot" />
      <PropertyGridSection title="Старт продаж" type="start" />

      <div id="quiz-section">
        <QuizSection />
      </div>

      <AboutPlatform pageSlug="/" />

      {/* Карта: полноценный блок, а не узкая полоска с иконкой */}
      <section className="section-y" aria-labelledby="map-cta-title">
        <div className="container-page">
          <Link
            to="/map"
            className="group block overflow-hidden rounded-[24px] bg-graphite transition-shadow hover:shadow-xl lg:rounded-[32px]"
          >
            <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10 lg:p-14">
              <div>
                <p className="text-overline text-white/60">Карта</p>
                <h2 id="map-cta-title" className="text-section-title mt-3 text-white">
                  Посмотрите, что где стоит
                </h2>
                <p className="mt-4 max-w-[520px] text-sm leading-relaxed text-white/70 sm:text-base">
                  Все жилые комплексы на одной карте: до моря, до центра, до школы.
                  Фильтры по цене и комнатности работают прямо на карте.
                </p>
              </div>

              <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-white/40 px-6 text-[15px] font-medium text-white transition-colors group-hover:bg-white/15">
                Открыть карту
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <ConsultationFlow open={consultOpen} onOpenChange={setConsultOpen} context={consultContext} />

      <LeadHighlightSection />
      <LatestNews />
      <FooterSection />
    </div>
  );
};

export default RedesignIndex;