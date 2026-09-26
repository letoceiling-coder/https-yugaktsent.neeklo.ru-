import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, Pencil, Search, UserCircle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import AdminStatusBadge from '@/admin/components/AdminStatusBadge';
import AgentAvatar from '@/ecosystem/components/AgentAvatar';

type AgentRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  profileId: string | null;
  slug: string | null;
  status: string | null;
  listingCount: number;
  publicUrl: string | null;
};

const profileStatusLabel: Record<string, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'На сайте',
  SUSPENDED: 'Скрыт',
};

export default function AdminAgentsListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const query = useQuery({
    queryKey: ['admin', 'agents', debouncedSearch],
    queryFn: () => {
      const sp = new URLSearchParams({ per_page: '100' });
      if (debouncedSearch.trim()) sp.set('search', debouncedSearch.trim());
      return apiGet<{ data: AgentRow[] }>(`/admin/agents?${sp}`);
    },
    staleTime: 20_000,
  });

  const agents = query.data?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl pb-24">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" />
            Агенты
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Пользователи с ролью «агент». Используются внутри админки, публичного каталога специалистов нет.
          </p>
        </div>
        <Link
          to="/admin/users"
          className="text-sm text-primary hover:underline shrink-0"
        >
          Создать пользователя →
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm"
            placeholder="Поиск по ФИО, email, телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl border text-sm hover:bg-muted">
          Найти
        </button>
      </form>

      {query.isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      ) : agents.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <p>Нет пользователей с ролью «агент».</p>
          <p className="mt-2">
            Создайте пользователя в разделе{' '}
            <Link to="/admin/users" className="text-primary hover:underline">Пользователи и роли</Link>
            {' '}и назначьте роль «Агент».
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <div
              key={a.userId}
              className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-4 justify-between"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <AgentAvatar name={a.fullName} avatarUrl={a.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.fullName || 'Без имени'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[a.phone, a.email].filter(Boolean).join(' · ') || 'Контакты не указаны'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.listingCount}{' '}
                    {a.listingCount === 1 ? 'объявление' : a.listingCount < 5 ? 'объявления' : 'объявлений'}
                    {a.slug ? ` · /agent/${a.slug}` : ' · профиль не настроен'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.status === 'PUBLISHED' ? (
                  <AdminStatusBadge tone="ok">{profileStatusLabel.PUBLISHED}</AdminStatusBadge>
                ) : a.status ? (
                  <AdminStatusBadge tone={a.status === 'SUSPENDED' ? 'warn' : 'neutral'}>
                    {profileStatusLabel[a.status] ?? a.status}
                  </AdminStatusBadge>
                ) : (
                  <AdminStatusBadge tone="warn">Нет профиля</AdminStatusBadge>
                )}
                {a.status && a.status !== 'PUBLISHED' ? (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">не в каталоге</span>
                ) : null}
                {!a.isActive ? (
                  <AdminStatusBadge tone="warn">Неактивен</AdminStatusBadge>
                ) : null}
                {a.publicUrl && a.status === 'PUBLISHED' ? (
                  <a
                    href={a.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg border hover:bg-muted"
                    title="Открыть на сайте"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : null}
                <Link
                  to={`/admin/agents/${a.userId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm min-h-[40px]"
                >
                  <Pencil className="w-4 h-4" />
                  Карточка
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
