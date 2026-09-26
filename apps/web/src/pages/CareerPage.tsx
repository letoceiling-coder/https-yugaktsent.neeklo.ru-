import { Link } from 'react-router-dom';
import StubPage from '@/shared/components/StubPage';
import { useSiteContacts } from '@/shared/hooks/useSiteContacts';

export default function CareerPage() {
  const { email } = useSiteContacts();

  return (
    <StubPage
      title="Карьера"
      description={
        <>
          Актуальные вакансии можно уточнить по телефону в разделе{' '}
          <Link to="/contacts" className="text-primary underline hover:no-underline">
            Контакты
          </Link>
          {email ? (
            <>
              {' '}или по почте{' '}
              <a href={`mailto:${email}`} className="text-primary underline hover:no-underline">
                {email}
              </a>
            </>
          ) : null}
          .
        </>
      }
    />
  );
}
