import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GalleryHorizontal,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api';
import MediaPickerDialog from '@/admin/components/MediaPickerDialog';
import {
  MAX_HOME_BANNERS,
  emptyHomeBanner,
  parseHomeBanners,
  serializeHomeBanners,
  type HomeBanner,
} from '@/redesign/lib/home-banners';

type SettingRow = { id: number; key: string; value: string; groupName: string };
type GroupedSettings = Record<string, SettingRow[]>;

const SETTING_KEY = 'home_banners';

export default function AdminBanners() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'content', 'settings'],
    queryFn: () => apiGet<GroupedSettings>('/admin/content/settings'),
    staleTime: 60_000,
  });

  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const row = Object.values(data)
      .flat()
      .find((r) => r.key === SETTING_KEY);
    setBanners(parseHomeBanners(row?.value));
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => apiPut('/admin/content/settings', [{ key: SETTING_KEY, value: serializeHomeBanners(banners) }]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', 'settings'] });
      qc.invalidateQueries({ queryKey: ['content', 'settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const patch = (id: string, fields: Partial<HomeBanner>) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...fields } : b)));

  const move = (index: number, delta: number) =>
    setBanners((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60';

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GalleryHorizontal className="h-7 w-7 text-primary" />
            Главная: баннеры
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Слайды в шапке главной страницы: фото, заголовок, подзаголовок и кнопка со своей ссылкой.
            До {MAX_HOME_BANNERS} слайдов, переключаются автоматически. Пока список пуст, на сайте
            показывается один слайд из настроек сайта.
          </p>
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : null}
          {saved ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      {mutation.isError ? (
        <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Не удалось сохранить: {(mutation.error as Error).message}
        </p>
      ) : null}

      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div key={banner.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Слайд {index + 1}</span>
              <div className="flex items-center gap-1">
                <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={banner.enabled}
                    onChange={(e) => patch(banner.id, { enabled: e.target.checked })}
                  />
                  Показывать
                </label>
                <button
                  type="button"
                  aria-label="Выше"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-lg border border-border p-1.5 disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ниже"
                  disabled={index === banners.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-lg border border-border p-1.5 disabled:opacity-40"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Удалить слайд"
                  onClick={() => setBanners((prev) => prev.filter((b) => b.id !== banner.id))}
                  className="rounded-lg border border-border p-1.5 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <div>
                <div className="mb-2 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
                  {banner.image ? (
                    <img src={banner.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerFor(banner.id)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50"
                >
                  Выбрать фото
                </button>
                {banner.image ? (
                  <button
                    type="button"
                    onClick={() => patch(banner.id, { image: '' })}
                    className="mt-1 w-full px-3 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Убрать фото
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                <input
                  className={inputClass}
                  placeholder="Надзаголовок капсом, например НОВОСТРОЙКИ АНАПЫ"
                  value={banner.tag}
                  onChange={(e) => patch(banner.id, { tag: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Заголовок"
                  value={banner.title}
                  onChange={(e) => patch(banner.id, { title: e.target.value })}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Подзаголовок"
                  value={banner.subtitle}
                  onChange={(e) => patch(banner.id, { subtitle: e.target.value })}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="Текст кнопки"
                    value={banner.buttonText}
                    onChange={(e) => patch(banner.id, { buttonText: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Ссылка кнопки, например /catalog"
                    value={banner.buttonLink}
                    onChange={(e) => patch(banner.id, { buttonLink: e.target.value })}
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="Вторая кнопка — открывает форму заявки. Пусто — кнопки нет"
                  value={banner.consultButtonText}
                  onChange={(e) => patch(banner.id, { consultButtonText: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Ссылка внутри сайта начинается со слэша (<code>/catalog?type=houses</code>), внешняя — с
                  <code> https://</code>. Пустой текст кнопки — кнопки не будет.
                </p>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Слайдов пока нет. Добавьте первый — он появится на главной после сохранения.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={banners.length >= MAX_HOME_BANNERS}
        onClick={() => setBanners((prev) => [...prev, emptyHomeBanner()])}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Добавить слайд
      </button>

      <MediaPickerDialog
        open={pickerFor != null}
        onOpenChange={(open) => setPickerFor(open ? pickerFor : null)}
        title="Фото баннера"
        onPick={(items) => {
          const url = items[0]?.url;
          if (pickerFor && url) patch(pickerFor, { image: url });
          setPickerFor(null);
        }}
      />
    </div>
  );
}
