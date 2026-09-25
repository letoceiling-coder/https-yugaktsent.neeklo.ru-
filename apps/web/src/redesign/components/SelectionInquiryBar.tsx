import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConsultationFlow from '@/redesign/components/ConsultationFlow';
import { CONVERSION_CTA, type ConsultationContext } from '@/redesign/lib/conversion-cta';

type Props = {
  source: string;
  contextFooter: string;
  /** fixed bottom bar on mobile */
  sticky?: boolean;
  className?: string;
};

export default function SelectionInquiryBar({ source, contextFooter, sticky, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const context: ConsultationContext = {
    surface: 'catalog',
    source,
    requestType: 'SELECTION',
    contextFooter,
  };

  const bar = (
    <Button
      type="button"
      className="w-full h-11 gap-2"
      onClick={() => setOpen(true)}
    >
      <MessageCircle className="w-4 h-4" />
      Запросить подбор эксперта
    </Button>
  );

  return (
    <>
      {sticky ? (
        <div
          className={`fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-40 border-t border-border bg-background/95 backdrop-blur-sm p-3 lg:hidden ${className}`}
        >
          {bar}
        </div>
      ) : (
        <div className={className}>{bar}</div>
      )}
      <ConsultationFlow
        open={open}
        onOpenChange={setOpen}
        context={{ ...context, title: CONVERSION_CTA.consultation }}
      />
    </>
  );
}
