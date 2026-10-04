import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDisplayPrice, isPriceFallbackText, priceAriaLabel } from '@/redesign/lib/display-price';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import PromotionBadge from '@/redesign/components/PromotionBadge';
import TrustBadgeRow, { type TrustBadgeView } from '@/redesign/components/TrustBadgeRow';
import { listingFreshnessBadge } from '@lg/shared';
import { cardBadgeClass, cardVisual, formatQuarterFromDate, metaDotLine } from '@/redesign/lib/card-visual';

export type ListingPromotionView = {
  tier: string;
  isActive: boolean;
  promotedUntil?: string | null;
};

export type ApiListingCardRow = {
  id: number;
  kind: string;
  lat?: string | number | null;
  lng?: string | number | null;
  title?: string | null;
  address?: string | null;
  price: string | number | null;
  status: string;
  dataSource?: string | null;
  lastActivityAt?: string | null;
  updatedAt?: string | null;
  promotion?: ListingPromotionView | null;
  block?: { name: string; slug: string } | null;
  region?: { code?: string; name?: string } | null;
  apartment?: {
    areaTotal: string | number | null;
    areaKitchen: string | number | null;
    floor: number | null;
    floorsTotal: number | null;
    planUrl: string | null;
    finishingPhotoUrl?: string | null;
    extraPhotoUrls?: unknown;
    roomType?: { name: string } | null;
    buildingDeadline?: string | null;
  } | null;
  house?: {
    areaTotal?: string | number | null;
    areaLand?: string | number | null;
    floorsCount?: number | null;
    bedrooms?: number | null;
    photoUrl?: string | null;
    extraPhotoUrls?: unknown;
  } | null;
  land?: {
    areaSotki?: string | number | null;
    landCategory?: string | null;
    photoUrl?: string | null;
    extraPhotoUrls?: unknown;
  } | null;
  commercial?: {
    commercialType?: string | null;
    area?: string | number | null;
    floor?: number | null;
  } | null;
  parking?: {
    parkingType?: string | null;
    area?: string | number | null;
    floor?: number | null;
  } | null;
};

interface Props {
  listing: ApiListingCardRow;
  variant?: 'grid' | 'list' | 'home';
  trustBadges?: TrustBadgeView[];
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickImage(l: ApiListingCardRow): string {
  const tryUrl = (raw: unknown): string | null => {
    if (typeof raw === 'string' && raw.trim()) return raw;
    return null;
  };
  const fromArray = (arr: unknown): string | null => {
    if (!Array.isArray(arr)) return null;
    for (const it of arr) {
      const u = tryUrl(it);
      if (u) return u;
    }
    return null;
  };
  if (l.kind === 'APARTMENT') {
    return (
      tryUrl(l.apartment?.planUrl) ??
      tryUrl(l.apartment?.finishingPhotoUrl) ??
      fromArray(l.apartment?.extraPhotoUrls) ??
      null
    );
  }
  return (
    tryUrl(l.house?.photoUrl) ??
    fromArray(l.house?.extraPhotoUrls) ??
    tryUrl(l.land?.photoUrl) ??
    fromArray(l.land?.extraPhotoUrls) ??
    tryUrl(l.apartment?.finishingPhotoUrl) ??
    fromArray(l.apartment?.extraPhotoUrls) ??
    tryUrl(l.apartment?.planUrl) ??
    null
  );
}

/**
 * Жильё меньше 10 м² не бывает: в фиде у части объектов площадь приходит
 * ровно единицей — это артефакт импорта, а не планировка. Показывать
 * «1 м²» в заголовке карточки хуже, чем не показывать площадь вовсе.
 */
const MIN_PLAUSIBLE_AREA_M2 = 10;

function plausibleArea(value: unknown): number {
  const n = num(value);
  return n >= MIN_PLAUSIBLE_AREA_M2 ? n : 0;
}

function buildTitle(l: ApiListingCardRow): string {
  switch (l.kind) {
    case 'HOUSE': {
      const area = plausibleArea(l.house?.areaTotal);
      return area > 0 ? `Дом · ${area} м²` : 'Дом';
    }
    case 'LAND': {
      const sotki = num(l.land?.areaSotki);
      return sotki > 0 ? `Участок · ${sotki} сот.` : 'Участок';
    }
    case 'COMMERCIAL': {
      const t = l.commercial?.commercialType?.trim();
      const area = plausibleArea(l.commercial?.area);
      const head = t || 'Коммерция';
      return area > 0 ? `${head} · ${area} м²` : head;
    }
    case 'PARKING': {
      const t = l.parking?.parkingType?.trim();
      const area = num(l.parking?.area);
      const head = t || 'Машиноместо';
      return area > 0 ? `${head} · ${area} м²` : head;
    }
    case 'APARTMENT':
    default: {
      const rooms = l.apartment?.roomType?.name?.trim();
      const area = plausibleArea(l.apartment?.areaTotal);
      const parts = [rooms, area > 0 ? `${area} м²` : null].filter(Boolean);
      // Нет ни комнатности, ни правдоподобной площади — называем вещь своим именем
      return parts.length ? parts.join(' · ') : 'Квартира';
    }
  }
}

function buildSubtitle(l: ApiListingCardRow): string {
  const block = l.block?.name?.trim();
  const region = l.region?.name?.trim();
  if (block && region) return `${block} · ${region}`;
  return block || region || '—';
}

const STATUS_BADGE: Record<string, { label: string; variant: 'primary' | 'secondary' | 'outline'; accent?: 'emerald' | 'amber' | 'muted' | 'red' }> = {
  ACTIVE: { label: 'Свободно', variant: 'secondary', accent: 'emerald' },
  RESERVED: { label: 'Бронь', variant: 'secondary', accent: 'amber' },
  SOLD: { label: 'Продано', variant: 'outline', accent: 'muted' },
  DRAFT: { label: 'Черновик', variant: 'outline', accent: 'muted' },
  INACTIVE: { label: 'Снято', variant: 'outline', accent: 'red' },
};

const ListingCard = ({ listing, variant = 'grid', trustBadges }: Props) => {
  const formatted = formatDisplayPrice(listing.price);
  const img = pickImage(listing);
  const title = buildTitle(listing);
  const subtitle = buildSubtitle(listing);
  const priceIsFallback = isPriceFallbackText(formatted);
  const status = STATUS_BADGE[listing.status] ?? { label: listing.status, variant: 'outline' as const, accent: 'muted' as const };
  const locationLine = metaDotLine([subtitle !== '—' ? subtitle : null, listing.address?.trim()]);

  const linkTo = listing.kind === 'APARTMENT' ? `/apartment/${listing.id}` : `/listing/${listing.id}`;

  const isList = variant === 'list';
  const isHome = variant === 'home';
  const isApartment = listing.kind === 'APARTMENT';
  const completionLine = formatQuarterFromDate(listing.apartment?.buildingDeadline ?? null);
  const freshness = listingFreshnessBadge({
    dataSource: listing.dataSource,
    lastActivityAt: listing.lastActivityAt,
    updatedAt: listing.updatedAt,
  });

  return (
    <Link
      to={linkTo}
      className={cn(
        isHome ? cardVisual.complexShell : cardVisual.cardShell,
        'group',
        isList ? 'sm:flex sm:items-stretch' : '',
        isHome && 'h-full w-full flex flex-col',
      )}
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden bg-muted',
          isList ? 'sm:w-56 sm:shrink-0 aspect-[4/3] sm:aspect-video' : 'aspect-video w-full',
          isHome && 'rounded-t-[20px]',
        )}
      >
        <StableMediaFrame
          src={img}
          aspect="none"
          fit={isApartment ? 'contain' : 'cover'}
          decorative={false}
          altContext={title}
          className="absolute inset-0 h-full w-full"
          imgClassName={isApartment ? '' : 'group-hover:scale-[1.02] transition-transform duration-200'}
        />
        <span
          className={cn(
            'absolute top-1.5 left-1.5',
            cardBadgeClass(status.variant, status.accent),
          )}
        >
          {status.label}
        </span>
        {freshness ? (
          <span
            className={cn(
              'absolute top-1.5 right-1.5 rounded-md bg-background/90 backdrop-blur-sm border px-1.5 py-0.5 text-[9px] font-medium',
              freshness.tone === 'recent'
                ? 'text-emerald-700 border-emerald-200'
                : 'text-muted-foreground',
            )}
          >
            {freshness.label}
          </span>
        ) : null}
        <PromotionBadge promotion={listing.promotion ?? null} />
        {trustBadges?.length ? (
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            <TrustBadgeRow badges={trustBadges} compact />
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          isHome ? cn(cardVisual.complexBody, 'flex-1 p-3 gap-2') : cardVisual.cardBody,
        )}
      >
        <p
          className={cn(
            isHome
              ? priceIsFallback
                ? cardVisual.priceGridFallback
                : cardVisual.priceGrid
              : priceIsFallback
                ? cardVisual.priceFallback
                : cardVisual.price,
          )}
          aria-label={priceAriaLabel(formatted)}
        >
          {formatted}
        </p>
        <h3
          className={cn(
            isHome ? 'text-base font-bold leading-snug tracking-tight text-foreground line-clamp-2 min-h-[2.5rem]' : cardVisual.title,
            'line-clamp-2',
          )}
        >
          {title}
        </h3>
        {locationLine ? (
          <p className={isHome ? cardVisual.metaDot : cardVisual.metaMuted}>{locationLine}</p>
        ) : null}
        {completionLine ? (
          <p className={cn(cardVisual.complexCompletion, 'line-clamp-1')}>{completionLine}</p>
        ) : isHome ? (
          <p className={cn(cardVisual.complexCompletion, 'invisible min-h-[1.125rem] select-none')} aria-hidden>
            &nbsp;
          </p>
        ) : null}
      </div>
    </Link>
  );
};

export default ListingCard;
