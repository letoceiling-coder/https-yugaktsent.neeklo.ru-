import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { loadYandexMapsScript } from '@/lib/yandex-maps-loader';

export type YandexMapsFailure = 'no-key' | 'script' | null;

/**
 * Загружает конфиг с API и скрипт Yandex Maps (один раз на вкладку).
 * Скрипт запрашивается только когда карта реально нужна — хук вызывают
 * компоненты карты, а не общий layout.
 */
export function useYandexMapsReady(options?: { enabled?: boolean }) {
  // Скрипт карт весит сотни килобайт — грузим только там, где карта реально нужна
  const enabled = options?.enabled ?? true;
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<YandexMapsFailure>(null);
  const cfg = useQuery({
    queryKey: ['content', 'maps-config'],
    queryFn: () => apiGet<{ apiKey: string | null }>('/content/maps-config'),
    staleTime: 300_000,
    enabled,
  });

  useEffect(() => {
    if (!enabled || cfg.isPending) return;
    const key = cfg.isError ? null : (cfg.data?.apiKey ?? null);
    let cancelled = false;
    // Скрипт может загрузиться, но не вызвать ready (например, ключ отклонён) —
    // не оставляем пользователя в бесконечной «Загрузке»
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setReady((prev) => {
          if (!prev) setFailure(key ? 'script' : 'no-key');
          return prev;
        });
      }
    }, 12_000);
    void loadYandexMapsScript(key)
      .then(() => {
        if (cancelled) return;
        setReady(true);
        setFailure(null);
      })
      .catch(() => {
        if (cancelled) return;
        setReady(false);
        // Без ключа Яндекс отдаёт скрипт не всегда — для пользователя это разные подсказки
        setFailure(key ? 'script' : 'no-key');
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [enabled, cfg.isPending, cfg.isError, cfg.data?.apiKey]);

  return {
    ready,
    isLoading: enabled && (cfg.isPending || (!ready && failure == null)),
    configError: cfg.isError,
    /** Карта не поднимется: 'no-key' — ключ не задан в админке, 'script' — скрипт не загрузился */
    failure,
  };
}
