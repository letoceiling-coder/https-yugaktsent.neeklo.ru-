import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ApiError, apiGet } from '@/lib/api';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import AgentAvatar from '@/ecosystem/components/AgentAvatar';

type AgentCard = {
  slug: string;
  name: string | null;
  avatarUrl: string | null;
  title: string | null;
  listingCount: number;
};

function normalizeAgentsResponse(raw: { data?: AgentCard[] } | AgentCard[] | null | undefined): AgentCard[] {
  if (Array.isArray(raw)) return raw;
  return raw?.data ?? [];
}

export default function PublicAgentsListPage() {
  const query = useQuery({
    queryKey: ['ecosystem', 'agents', 'directory'],
    queryFn: () =>
      apiGet<{ data: AgentCard[] }>('/ecosystem/agents', { cache: 'no-store' }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const agents = normalizeAgentsResponse(query.data);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <RedesignHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold">Наши специалисты</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          Опубликованные карточки наших специалистов
        </p>

        {query.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-destructive">
              {query.error instanceof ApiError
                ? `Не удалось загрузить каталог (${query.error.status})`
                : 'Не удалось загрузить каталог'}
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="text-sm text-primary hover:underline"
            >
              Повторить
            </button>
          </div>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">Список агентов пока пуст</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => (
              <Link
                key={a.slug}
                to={`/agent/${a.slug}`}
                className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all flex gap-4 items-start"
              >
                <AgentAvatar name={a.name} avatarUrl={a.avatarUrl} size="sm" className="shrink-0 border-2" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{a.name?.trim() || a.slug || 'Агент'}</p>
                  {a.title ? (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.title}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-2">
                    {a.listingCount}{' '}
                    {a.listingCount === 1 ? 'объявление' : a.listingCount < 5 ? 'объявления' : 'объявлений'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <FooterSection />
    </div>
  );
}
