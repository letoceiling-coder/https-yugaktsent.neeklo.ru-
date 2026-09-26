import { cn } from '@/lib/utils';

type Props = {
  count?: number;
  variant?: 'grid' | 'list';
  className?: string;
};

/**
 * Каркас карточек на время загрузки: держит высоту сетки,
 * чтобы контент не прыгал, когда данные приедут.
 */
const CardGridSkeleton = ({ count = 8, variant = 'grid', className }: Props) => (
  <div
    className={cn(
      variant === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'
        : 'space-y-3',
      className,
    )}
    aria-hidden
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'overflow-hidden rounded-[20px] border border-neutral-200/80 bg-card',
          variant === 'list' && 'flex',
        )}
      >
        <div
          className={cn(
            'animate-pulse bg-muted',
            variant === 'list' ? 'h-[150px] w-[200px] shrink-0' : 'aspect-video w-full',
          )}
        />
        <div className="flex-1 space-y-2.5 p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    ))}
  </div>
);

export default CardGridSkeleton;
