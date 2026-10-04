import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePhoneAction } from '@/redesign/hooks/usePhoneAction';
import {
  CONVERSION_CTA,
  CONVERSION_CTA_ICON,
  type ConsultationContext,
} from '@/redesign/lib/conversion-cta';
import { conversionObsCtaClick } from '@/redesign/lib/conversion-observability';

type Props = {
  context: ConsultationContext;
  disabled?: boolean;
  className?: string;
  /** stack — колонка (сайдбар, карта); row — в ряд только на широких экранах */
  layout?: 'row' | 'stack';
  size?: 'default' | 'sm';
  /** Primary consultation label override */
  consultationLabel?: string;
  /** Show phone button (default true) */
  showPhone?: boolean;
  onConsultation: (ctx: ConsultationContext) => void;
};

function consultationLabelContent(
  fullLabel: string,
  layout: 'row' | 'stack',
): ReactNode {
  const shortLabel =
    fullLabel === CONVERSION_CTA.viewing ? CONVERSION_CTA.viewingShort : fullLabel;

  if (layout === 'stack' || shortLabel === fullLabel) {
    return fullLabel;
  }

  return (
    <>
      <span className="sm:hidden">{fullLabel}</span>
      <span className="hidden sm:inline">{shortLabel}</span>
    </>
  );
}

const ConversionCTABar = ({
  context,
  disabled = false,
  className,
  layout = 'stack',
  size = 'default',
  consultationLabel,
  showPhone = true,
  onConsultation,
}: Props) => {
  const { handlePhoneClick, isAvailable } = usePhoneAction();
  const PhoneIcon = CONVERSION_CTA_ICON.phone;
  const ConsultIcon = CONVERSION_CTA_ICON.consultation;
  const btnSize = size === 'sm' ? 'sm' : 'default';

  const consultLabel =
    consultationLabel ??
    (context.requestType === 'CALLBACK'
      ? CONVERSION_CTA.callback
      : context.sold
        ? CONVERSION_CTA.consultation
        : CONVERSION_CTA.viewing);

  const openConsult = (ctx: ConsultationContext) => {
    conversionObsCtaClick('consultation', ctx.surface);
    onConsultation(ctx);
  };

  const btnClass = cn(
    'w-full min-w-0 whitespace-normal text-center leading-snug',
    layout === 'row' && 'sm:flex-1',
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        layout === 'row' && 'sm:flex-row sm:items-stretch',
        className,
      )}
    >
      {showPhone ? (
        <Button
          type="button"
          variant="primary"
          size={btnSize}
          className={btnClass}
          disabled={disabled || context.sold}
          onClick={() =>
            handlePhoneClick({
              context,
              onFallbackConsultation: (fallbackCtx) => onConsultation(fallbackCtx),
            })
          }
          title={!isAvailable ? 'Телефон недоступен, откроется форма обратного звонка' : undefined}
        >
          <PhoneIcon className="shrink-0" />
          {CONVERSION_CTA.phone}
        </Button>
      ) : null}
      <Button
        type="button"
        variant={showPhone ? 'secondary' : 'primary'}
        size={btnSize}
        className={btnClass}
        disabled={disabled}
        onClick={() => openConsult(context)}
        title={consultLabel}
      >
        <ConsultIcon className="shrink-0" />
        {consultationLabelContent(consultLabel, layout)}
      </Button>
    </div>
  );
};

export default ConversionCTABar;
