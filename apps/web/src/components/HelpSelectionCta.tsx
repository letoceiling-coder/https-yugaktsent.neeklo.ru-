import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  helpSelectionPanelClass,
  isHelpConsultUrl,
  normalizeHelpSelectionSettings,
  type HelpSelectionSettings,
} from '@/shared/lib/help-selection-cms';
import { useHelpSelectionSection } from '@/shared/hooks/useHelpSelectionSection';
import { btnClass } from '@/redesign/lib/button-styles';

type Props = {
  pageSlug?: string;
  settings?: HelpSelectionSettings;
  preview?: boolean;
  onConsult?: () => void;
};

export default function HelpSelectionCta({ pageSlug = '/', settings: settingsProp, preview = false, onConsult }: Props) {
  const cms = useHelpSelectionSection(preview ? '' : pageSlug);
  if (!preview && !settingsProp && cms === null) return null;

  const settings = settingsProp ?? cms?.settings ?? normalizeHelpSelectionSettings(null);
  const consult = isHelpConsultUrl(settings.buttonUrl);

  const handleClick = () => {
    if (consult && onConsult) onConsult();
  };

  const buttonClass = btnClass('primary', { className: 'shrink-0 w-full sm:w-auto' });

  return (
    <section className="section-y" aria-labelledby="help-selection-title">
      <div className="max-w-[1400px] mx-auto px-4">
        <div
          className={cn(
            'flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4',
            helpSelectionPanelClass(settings.backgroundVariant),
          )}
        >
          <div className="min-w-0 text-left">
            <h2 id="help-selection-title" className="text-base font-semibold leading-snug text-foreground sm:text-lg">
              {settings.title}
            </h2>
            {settings.description ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{settings.description}</p>
            ) : null}
          </div>
          {settings.buttonText?.trim() ? (
            consult ? (
              <button type="button" className={buttonClass} onClick={handleClick} aria-label={settings.buttonText}>
                {settings.buttonText}
              </button>
            ) : /^https?:\/\//i.test(settings.buttonUrl) ? (
              <a href={settings.buttonUrl} className={buttonClass} target="_blank" rel="noopener noreferrer">
                {settings.buttonText}
              </a>
            ) : (
              <Link to={settings.buttonUrl || '/contacts'} className={buttonClass}>
                {settings.buttonText}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}
