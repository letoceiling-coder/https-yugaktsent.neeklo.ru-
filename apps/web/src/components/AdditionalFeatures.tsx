import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isHelpConsultUrl } from '@/shared/lib/help-selection-cms';
import { sectionIcon } from '@/shared/lib/section-icons';
import {
  normalizePlatformToolsSettings,
  sortedEnabledTools,
  type PlatformToolsSettings,
} from '@/shared/lib/platform-tools-cms';
import { usePlatformToolsSection } from '@/shared/hooks/usePlatformToolsSection';

type Props = {
  pageSlug?: string;
  settings?: PlatformToolsSettings;
  preview?: boolean;
  onConsult?: () => void;
};

export default function AdditionalFeatures({
  pageSlug = '/',
  settings: settingsProp,
  preview = false,
  onConsult,
}: Props) {
  const cms = usePlatformToolsSection(preview ? '' : pageSlug);
  if (!preview && !settingsProp && cms === null) return null;

  const settings = settingsProp ?? cms?.settings ?? normalizePlatformToolsSettings(null);
  const items = sortedEnabledTools(settings);
  if (items.length === 0) return null;

  return (
    <section className="section-y" aria-labelledby="platform-tools-title">
      <div className="max-w-[1400px] mx-auto px-4">
        {settings.title ? (
          <h2 id="platform-tools-title" className="text-base font-semibold text-foreground mb-3 sm:mb-4 sm:text-lg">
            {settings.title}
          </h2>
        ) : null}

        <ul
          className={cn(
            'grid gap-2 sm:gap-2.5',
            items.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {items.map((item) => {
            const Icon = sectionIcon(item.icon);
            const consult = isHelpConsultUrl(item.link);
            const className =
              'flex min-h-[52px] items-center gap-2.5 rounded-xl border border-border/70 bg-card/90 px-3 py-2.5 transition-all duration-200 hover:-translate-y-px hover:border-primary/25 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] group';

            const inner = (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                  <Icon className="h-4 w-4 text-primary/90" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-tight text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  {item.description ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  ) : null}
                </div>
              </>
            );

            if (consult && onConsult) {
              return (
                <li key={item.id}>
                  <button type="button" className={cn(className, 'w-full text-left')} onClick={onConsult}>
                    {inner}
                  </button>
                </li>
              );
            }

            if (/^https?:\/\//i.test(item.link)) {
              return (
                <li key={item.id}>
                  <a href={item.link} className={className} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link to={item.link || '/catalog'} className={className}>
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
