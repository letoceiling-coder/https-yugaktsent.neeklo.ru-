import { useSiteBrand } from '@/redesign/hooks/useSiteBrand';
import StubPage from '@/shared/components/StubPage';

export default function OfferPage() {
  const { shortName } = useSiteBrand();

  return (
    <StubPage
      title="Оферта"
      description={`Публичная оферта и договорные условия публикуются по мере финализации текстов юридического отдела. По вопросам договоров свяжитесь с офисом ${shortName} через раздел «Контакты».`}
    />
  );
}
