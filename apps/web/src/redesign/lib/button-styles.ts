import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

/**
 * Акцент бренда в hex — для мест, где нельзя подставить CSS-переменную:
 * разметка меток Яндекс.Карт, canvas, инлайновые SVG.
 * Держать в соответствии с `--primary` в index.css (168 55% 20%).
 */
export const BRAND_PRIMARY_HEX = '#174F44';
/** Тот же акцент светлее — для активного состояния на карте */
export const BRAND_PRIMARY_ACTIVE_HEX = '#257E6D';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export function btnClass(
  variant: ButtonVariant,
  opts?: { block?: boolean; size?: ButtonSize; className?: string },
): string {
  const size = opts?.size ?? 'md';
  const mappedVariant = variant === 'primary' ? 'primary' : variant === 'secondary' ? 'secondary' : 'ghost';
  return cn(
    buttonVariants({ variant: mappedVariant, size: size === 'sm' ? 'sm' : 'md' }),
    opts?.block && 'w-full sm:w-auto',
    opts?.className,
  );
}
