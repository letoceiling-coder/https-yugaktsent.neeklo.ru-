import { useCallback } from 'react';
import { toast } from '@/components/ui/sonner';
import { useSitePhone } from '@/redesign/hooks/useSitePhone';
import {
  type ConsultationContext,
  phoneUnavailableMessage,
} from '@/redesign/lib/conversion-cta';
import { conversionObsCtaClick } from '@/redesign/lib/conversion-observability';

type PhoneActionOpts = {
  context: ConsultationContext;
  /** When phone unavailable, open consultation flow instead of toast-only. */
  onFallbackConsultation?: (ctx: ConsultationContext) => void;
};

/**
 * Realistic phone CTA: dial site phone when configured, else consultation fallback.
 * Never fakes a phone number or tel: link.
 */
export function usePhoneAction() {
  const { phone, phoneHref, isAvailable } = useSitePhone();

  const handlePhoneClick = useCallback(
    ({ context, onFallbackConsultation }: PhoneActionOpts) => {
      conversionObsCtaClick('phone', context.surface);

      if (context.sold) return;

      if (isAvailable && phoneHref) {
        window.location.href = phoneHref;
        return;
      }

      const fallbackCtx: ConsultationContext = {
        ...context,
        requestType: 'CALLBACK',
        title: 'Обратный звонок',
        contextFooter: [
          context.contextFooter,
          'Пользователь нажал «Позвонить», телефон недоступен: запрос обратного звонка.',
        ]
          .filter(Boolean)
          .join('\n'),
      };

      if (onFallbackConsultation) {
        onFallbackConsultation(fallbackCtx);
        toast.info(phoneUnavailableMessage());
        return;
      }

      toast.info(phoneUnavailableMessage());
    },
    [isAvailable, phoneHref],
  );

  return { phone, phoneHref, isAvailable, handlePhoneClick };
}
