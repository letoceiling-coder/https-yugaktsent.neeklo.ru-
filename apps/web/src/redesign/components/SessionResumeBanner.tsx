import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, X, MapPin, LayoutGrid } from 'lucide-react';
import {
  readSessionSnapshot,
  dismissSessionResume,
  isSessionResumeDismissed,
} from '@/shared/lib/session-continuity';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export default function SessionResumeBanner({ className }: Props) {
  const [dismissed, setDismissed] = useState(isSessionResumeDismissed);

  const snapshot = useMemo(() => readSessionSnapshot(), []);

  if (dismissed || !snapshot) return null;

  const actions: { href: string; label: string; icon: typeof LayoutGrid }[] = [];
  if (snapshot.lastListingHref) {
    actions.push({
      href: snapshot.lastListingHref,
      label: snapshot.lastListingTitle?.trim() || 'Последний объект',
      icon: RotateCcw,
    });
  }
  if (snapshot.catalogHref) {
    actions.push({ href: snapshot.catalogHref, label: 'Каталог', icon: LayoutGrid });
  }
  if (snapshot.mapHref) {
    actions.push({ href: snapshot.mapHref, label: 'Карта', icon: MapPin });
  }

  if (!actions.length) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center gap-2',
        className,
      )}
    >
      <p className="text-xs sm:text-sm font-medium mr-auto">Продолжить сессию</p>
      <div className="flex flex-wrap gap-1.5">
        {actions.slice(0, 3).map((a) => {
          const Icon = a.icon;
          return (
          <Link
            key={a.href}
            to={a.href}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-background hover:border-primary/40 transition-colors max-w-[200px]"
          >
            <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{a.label}</span>
          </Link>
          );
        })}
      </div>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground ml-auto sm:ml-0"
        aria-label="Скрыть"
        onClick={() => {
          dismissSessionResume();
          setDismissed(true);
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
