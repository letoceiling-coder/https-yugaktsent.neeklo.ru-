import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, GitCompare, MapPin, Building2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { parseApiBlockId, useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import CardDottedPriceRow from '@/redesign/components/CardDottedPriceRow';
import {
  cardVisual,
  complexPopularCompletionLine,
  complexFallbackPriceRow,
  complexImageOverlayLines,
  complexInventoryLine,
  complexMetroDisplayLine,
  complexPriceBandRows,
  complexYieldLabel,
} from '@/redesign/lib/card-visual';

interface Props {
  complex: ResidentialComplex;
  variant?: 'grid' | 'list' | 'compact';
  coverAspect?: '16/9' | '4/3';
  /** Тег в подвале карточки */
  tag?: 'new' | 'secondary';
  /** Карточка на первом экране: обложка грузится без lazy */
  priority?: boolean;
}

/**
 * Карточка ЖК: обложка с двумя действиями, под ней — вся информация.
 * Поверх фото ничего, кроме иконок и точек-переключателей.
 */
const ComplexCard = ({
  complex,
  variant = 'grid',
  coverAspect = '16/9',
  tag = 'new',
  priority = false,
}: Props) => {
  const isCompact = variant === 'compact';
  const cardVariant = isCompact ? 'grid' : variant;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isBlockFavorite, toggleBlock } = useFavorites();
  const { isCompared, toggle: toggleCompare } = useCompare();
  const blockNum = parseApiBlockId(complex.id);
  const liked = blockNum != null && isBlockFavorite(blockNum);
  const slug = complex.slug?.trim() ?? '';
  const inCompare = Boolean(slug) && isCompared(slug);
  const coverImages = complex.images.filter((src) => Boolean(src?.trim()));
  const coverImage = coverImages[currentImageIndex] ?? coverImages[0] ?? '';
  const builderName = complex.builder?.trim();
  const hasBuilder = Boolean(builderName && builderName !== '—');
  const addressLine = complex.address?.trim();
  const hasAddress = Boolean(addressLine && addressLine !== '—');
  const metroLine = complexMetroDisplayLine(complex);
  const completion = complexPopularCompletionLine(complex);
  const priceBandRows = complexPriceBandRows(complex);
  const fallbackPrice = priceBandRows.length === 0 ? complexFallbackPriceRow(complex)?.price : null;
  const inventoryLine = complexInventoryLine(complex);
  const yieldLabel = complexYieldLabel(complex);
  const districtLine =
    complex.district && complex.district !== '—' ? complex.district.trim() : '';
  const fullAddressLine = [districtLine, hasAddress ? addressLine : ''].filter(Boolean).join(', ');
  /** Статус ЖК показываем в подвале, а не поверх обложки */
  const statusNote = complexImageOverlayLines(complex).primary ?? (complex.isPromoted ? 'Новый ЖК' : null);
  const tagLabel = tag === 'secondary' ? 'Вторичка' : 'Новостройки';

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blockNum == null) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    void toggleBlock(blockNum);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!slug) return;
    toggleCompare(slug);
  };

  const actionButtons = (
    <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
      {slug ? (
        <button
          type="button"
          title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
          aria-label={inCompare ? 'Убрать из сравнения' : 'Добавить в сравнение'}
          className={cn(cardVisual.complexActionBtn, 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary')}
          onClick={handleCompare}
        >
          <GitCompare className={cn('h-3.5 w-3.5', inCompare ? 'text-primary' : 'text-muted-foreground')} />
        </button>
      ) : null}
      <button
        type="button"
        title="Избранное"
        aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
        className={cn(cardVisual.complexActionBtn, 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary')}
        onClick={handleLike}
      >
        <Heart className={cn('h-3.5 w-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
      </button>
    </div>
  );

  const contentMain = (
    <>
      <h3
        className={cn(
          isCompact
            ? 'text-base font-bold leading-snug tracking-tight text-foreground line-clamp-2 min-h-[2.5rem]'
            : cardVisual.complexTitle,
          'group-hover:text-primary transition-colors',
        )}
      >
        {complex.name}
      </h3>

      {metroLine ? (
        <div className={cardVisual.complexMetaRow}>
          <span className={cardVisual.complexMetroDot} aria-hidden />
          <span className="min-w-0 line-clamp-1 text-foreground/85">{metroLine}</span>
        </div>
      ) : null}

      {fullAddressLine ? (
        <div className={cardVisual.complexMetaRow}>
          <MapPin className={cardVisual.complexMetaIcon} aria-hidden />
          <span className="min-w-0 line-clamp-2 text-muted-foreground/90">{fullAddressLine}</span>
        </div>
      ) : null}

      {hasBuilder ? (
        <div className={cardVisual.complexMetaRow}>
          <Building2 className={cardVisual.complexMetaIcon} aria-hidden />
          <span className="min-w-0 line-clamp-1">
            <span className="text-muted-foreground">Застройщик: </span>
            <span className="font-semibold text-foreground/85">{builderName}</span>
          </span>
        </div>
      ) : null}

      {completion ? (
        <p
          className={cn(cardVisual.complexCompletion, isCompact && 'line-clamp-1')}
          aria-label={`Срок сдачи: ${completion}`}
        >
          {completion}
        </p>
      ) : null}

      {priceBandRows.length > 0 ? (
        <div className={cardVisual.dottedBlock} role="list" aria-label="Цены по типам квартир">
          {priceBandRows.map((row) => (
            <CardDottedPriceRow key={row.rooms} label={row.label} price={row.price} />
          ))}
        </div>
      ) : fallbackPrice ? (
        <p className="pt-1 text-sm font-semibold tabular-nums text-foreground leading-none">
          {fallbackPrice}
        </p>
      ) : null}

      {inventoryLine ? <p className={cardVisual.complexInventory}>{inventoryLine}</p> : null}
    </>
  );

  const contentFooter = (
    <div className={cn(cardVisual.complexFooter, 'mt-auto shrink-0')}>
      <span className={cardVisual.complexFooterPill}>{tagLabel}</span>
      <div className="flex min-w-0 items-center gap-2">
        {statusNote ? (
          <span className="truncate text-[11px] font-medium text-muted-foreground">{statusNote}</span>
        ) : null}
        {yieldLabel ? (
          <span className={cardVisual.complexYield} aria-label={`Доходность ${yieldLabel}`}>
            <span aria-hidden>🏦</span>
            {yieldLabel}
          </span>
        ) : null}
      </div>
    </div>
  );

  const mediaAspectProp = coverAspect === '16/9' ? '16/9' : '4/3';

  const photoDots =
    coverImages.length > 1 ? (
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
        {coverImages.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Фото ${index + 1}`}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              index === currentImageIndex ? 'bg-background shadow-sm' : 'bg-background/50',
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentImageIndex(index);
            }}
          />
        ))}
      </div>
    ) : null;

  const coverMedia = (
    <div className={cn(cardVisual.complexMedia, 'relative')}>
      <StableMediaFrame
        src={coverImage || null}
        altContext={complex.name}
        decorative={false}
        aspect={mediaAspectProp}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        className="w-full rounded-t-[20px]"
        imgClassName="object-cover object-center transition-transform duration-200 group-hover:scale-[1.02]"
      />
      {actionButtons}
      {photoDots}
    </div>
  );

  const shell = (children: ReactNode, extraClass: string) => {
    const className = cn(cardVisual.complexShell, 'group', extraClass, !slug && 'cursor-default');
    return slug ? (
      <Link to={`/complex/${slug}`} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );
  };

  if (cardVariant === 'list') {
    return shell(
      <>
        <div className="relative w-[200px] shrink-0 overflow-hidden bg-muted sm:w-[220px]">
          <StableMediaFrame
            src={coverImages[0] || null}
            altContext={complex.name}
            decorative={false}
            aspect="4/3"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            className="h-full w-full rounded-none"
            imgClassName="object-cover object-center transition-transform duration-200 group-hover:scale-[1.02]"
          />
          {actionButtons}
        </div>
        <div className={cn(cardVisual.complexBody, 'flex flex-1 flex-col')}>
          <div className="flex flex-1 flex-col gap-2.5">{contentMain}</div>
          {contentFooter}
        </div>
      </>,
      'flex',
    );
  }

  return shell(
    <>
      {coverMedia}
      <div className={cn(cardVisual.complexBody, isCompact && 'p-3 gap-2', 'flex flex-1 flex-col min-h-0')}>
        <div className="flex flex-1 flex-col gap-2.5 min-h-0">{contentMain}</div>
        {contentFooter}
      </div>
    </>,
    'flex h-full w-full flex-col',
  );
};

export default ComplexCard;
