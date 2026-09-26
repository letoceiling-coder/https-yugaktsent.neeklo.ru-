import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, apiGet, apiPostForm, apiPut } from '@/lib/api';
import AgentAvatar from '@/ecosystem/components/AgentAvatar';
import AdminStatusBadge from '@/admin/components/AdminStatusBadge';

type AgentDetail = {
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    isActive: boolean;
  };
  profile: {
    id: string;
    slug: string;
    bio: string | null;
    specializations: string[];
    status: string;
    showPhone: boolean;
    showEmail: boolean;
  } | null;
  listingCount: number;
  publicUrl: string | null;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  slug: string;
  bio: string;
  specializationsText: string;
  showPhone: boolean;
  showEmail: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
};

function parseError(error: unknown): string {
  if (error instanceof ApiError) return error.message || `Ошибка ${error.status}`;
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

function detailToForm(d: AgentDetail): FormState {
  return {
    fullName: d.user.fullName ?? '',
    email: d.user.email ?? '',
    phone: d.user.phone ?? '',
    slug: d.profile?.slug ?? '',
    bio: d.profile?.bio ?? '',
    specializationsText: (d.profile?.specializations ?? []).join(', '),
    showPhone: d.profile?.showPhone ?? true,
    showEmail: d.profile?.showEmail ?? false,
    status: (d.profile?.status as FormState['status']) ?? 'DRAFT',
  };
}

export default function AdminAgentEditPage() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['admin', 'agents', userId],
    queryFn: () => apiGet<AgentDetail>(`/admin/agents/${userId}`),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (detailQuery.data && form === null) {
      setForm(detailToForm(detailQuery.data));
      setAvatarPreview(detailQuery.data.user.avatarUrl);
    }
  }, [detailQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiPut<AgentDetail>(`/admin/agents/${userId}`, payload),
    onSuccess: (data) => {
      setForm(detailToForm(data));
      setAvatarPreview(data.user.avatarUrl);
      void qc.invalidateQueries({ queryKey: ['admin', 'agents'] });
      toast.success('Карточка агента сохранена');
    },
    onError: (e) => toast.error(parseError(e)),
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiPostForm<{ avatarUrl: string }>(`/admin/agents/${userId}/avatar`, fd);
    },
    onSuccess: (res) => {
      setAvatarPreview(res.avatarUrl);
      void qc.invalidateQueries({ queryKey: ['admin', 'agents', userId] });
      toast.success('Фото обновлено');
    },
    onError: (e) => toast.error(parseError(e)),
  });

  const publicHref = useMemo(() => {
    const slug = form?.slug?.trim();
    if (!slug || form?.status !== 'PUBLISHED') return null;
    return `/agent/${slug}`;
  }, [form?.slug, form?.status]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const specializations = form.specializationsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    saveMutation.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      slug: form.slug.trim() || undefined,
      bio: form.bio.trim() || undefined,
      specializations,
      showPhone: form.showPhone,
      showEmail: form.showEmail,
      status: form.status,
    });
  };

  if (detailQuery.isLoading || !form) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-sm text-destructive mb-4">Агент не найден или нет доступа.</p>
        <Link to="/admin/agents" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> К списку агентов
        </Link>
      </div>
    );
  }

  const d = detailQuery.data!;
  const isBusy = saveMutation.isPending || avatarMutation.isPending;

  return (
    <div className="p-4 sm:p-6 max-w-2xl pb-24">
      <Link
        to="/admin/agents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Все агенты
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Карточка агента</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {d.listingCount} публичных объявлений ·{' '}
            {d.user.isActive ? 'аккаунт активен' : 'аккаунт отключён'}
          </p>
        </div>
        {publicHref ? (
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            На сайте <ExternalLink className="w-4 h-4" />
          </a>
        ) : null}
      </div>

      {form.status !== 'PUBLISHED' ? (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Карточка неактивна, пока статус не «На сайте». Выберите «На сайте» и нажмите «Сохранить».
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Фото и контакты</h2>
          <div className="flex flex-wrap items-center gap-4">
            <AgentAvatar name={form.fullName} avatarUrl={avatarPreview} size="lg" />
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer hover:bg-muted min-h-[44px]">
                <Upload className="w-4 h-4" />
                Загрузить фото
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={avatarMutation.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) avatarMutation.mutate(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG или WebP, до 5 МБ</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted-foreground">ФИО (на сайте)</span>
              <input
                required
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Телефон</span>
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Email</span>
              <input
                type="email"
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showPhone}
                onChange={(e) => setField('showPhone', e.target.checked)}
              />
              Показывать телефон на сайте
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showEmail}
                onChange={(e) => setField('showEmail', e.target.checked)}
              />
              Показывать email на сайте
            </label>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Публичный профиль</h2>
          <label className="block">
            <span className="text-xs text-muted-foreground">URL (slug)</span>
            <div className="mt-1 flex rounded-xl border overflow-hidden">
              <span className="px-3 py-2 text-sm bg-muted text-muted-foreground shrink-0">/agent/</span>
              <input
                className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                placeholder="ivan-petrov"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Специализация (первая строка — заголовок на карточке)</span>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="Риелтор, новостройки"
              value={form.specializationsText}
              onChange={(e) => setField('specializationsText', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Несколько значений через запятую</p>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">О себе</span>
            <textarea
              rows={4}
              className="mt-1 w-full border rounded-xl px-3 py-2 text-sm resize-y"
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
            />
          </label>
        </section>

        <section className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Статус агента</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Статус «На сайте» помечает агента как активного. Публичного каталога специалистов на сайте нет.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: 'DRAFT' as const, label: 'Черновик' },
                { value: 'PUBLISHED' as const, label: 'На сайте' },
                { value: 'SUSPENDED' as const, label: 'Скрыт' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField('status', opt.value)}
                className={`px-3 py-2 rounded-xl text-sm border min-h-[40px] ${
                  form.status === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {form.status === 'PUBLISHED' ? (
            <AdminStatusBadge tone="ok">Будет виден в каталоге /agents</AdminStatusBadge>
          ) : (
            <AdminStatusBadge tone="neutral">Не показывается в каталоге</AdminStatusBadge>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 min-h-[44px]"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </button>
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl border text-sm min-h-[44px]"
            onClick={() => navigate('/admin/agents')}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
