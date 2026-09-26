import { Link } from 'react-router-dom';
import StubPage from '@/shared/components/StubPage';
import { useSiteContacts } from '@/shared/hooks/useSiteContacts';

export default function PartnersPage() {
  const { email } = useSiteContacts();

  return (
    <StubPage
      title="Партнёрам"
      description={
        <>
          По вопросам сотрудничества{' '}
          {email ? (
            <>
              напишите на{' '}
              <a href={`mailto:${email}`} className="text-primary underline hover:no-underline">
                {email}
              </a>{' '}
              или{' '}
            </>
          ) : null}
          откройте раздел{' '}
          <Link to="/contacts" className="text-primary underline hover:no-underline">
            Контакты
          </Link>
          .
        </>
      }
    />
  );
}
