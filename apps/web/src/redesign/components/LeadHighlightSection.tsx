import { Check, Clock, Wallet } from 'lucide-react';
import LeadForm from '@/shared/components/LeadForm';

type Props = {
  /** Метка источника заявки: с какой страницы пришла */
  source?: string;
};

const PROMISES: { icon: typeof Clock; value: string; caption: string }[] = [
  { icon: Clock, value: '15 минут', caption: 'среднее время ответа' },
  { icon: Wallet, value: '0 ₽', caption: 'сопровождение сделки' },
];

/**
 * Лид-блок «Получите подборку»: тёмная панель слева, белая карточка формы справа.
 * Форма — общая LeadForm: маска телефона, согласие и отправка в API уже в ней.
 */
const LeadHighlightSection = ({ source = 'home:selection' }: Props) => (
  <section className="section-y" aria-labelledby="lead-highlight-title">
    <div className="container-page">
      <div className="overflow-hidden rounded-[24px] bg-graphite lg:rounded-[32px]">
        <div className="grid gap-0 lg:grid-cols-[1fr_minmax(380px,460px)]">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span className="text-overline">Персональный подбор</span>
            </span>

            <h2 id="lead-highlight-title" className="text-section-title mt-5 text-white">
              Получите подборку объектов под ваш бюджет
            </h2>

            <p className="mt-4 max-w-[520px] text-sm leading-relaxed text-white/75 sm:text-base">
              Расскажите о задаче — пришлём 3–5 точных вариантов от прямых застройщиков Анапы
              с проверенными документами.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:max-w-[420px]">
              {PROMISES.map(({ icon: Icon, value, caption }) => (
                <div key={value} className="rounded-2xl bg-white/10 p-4">
                  <Icon className="h-5 w-5 text-white/70" aria-hidden />
                  <p className="mt-3 text-xl font-bold leading-none text-white">{value}</p>
                  <p className="mt-1.5 text-xs leading-snug text-white/60">{caption}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Карточка формы выступает над тёмной панелью, как на макете */}
          <div className="p-4 sm:p-6 lg:py-8 lg:pl-0 lg:pr-8">
            <div className="rounded-[20px] bg-card p-5 shadow-xl sm:p-7">
              <p className="text-overline text-muted-foreground">Заявка · 30 секунд</p>
              <h3 className="mt-2 text-xl font-bold leading-tight">Оставьте контакты</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">Перезвоним в течение 15 минут</p>

              <div className="mt-5">
                <LeadForm
                  embedded
                  title=""
                  source={source}
                  requestType="SELECTION"
                  submitLabel="Получить подборку"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LeadHighlightSection;
