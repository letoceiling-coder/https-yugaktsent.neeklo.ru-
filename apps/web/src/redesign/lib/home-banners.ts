/**
 * Слайды баннера на главной.
 * Хранятся одной строкой JSON в site_settings.home_banners,
 * редактируются в админке → «Главная: баннеры».
 */
export type HomeBanner = {
  id: string;
  /** URL изображения (медиа-библиотека или внешняя ссылка) */
  image: string;
  /** Надзаголовок капсом над заголовком, например «НОВОСТРОЙКИ АНАПЫ» */
  tag: string;
  title: string;
  subtitle: string;
  /** Текст кнопки; пустой — кнопку не рисуем */
  buttonText: string;
  /** Куда ведёт кнопка */
  buttonLink: string;
  /** Вторая кнопка — открывает форму заявки; пустой текст — кнопки нет */
  consultButtonText: string;
  /** Выключенные слайды не показываем на сайте */
  enabled: boolean;
};

export const MAX_HOME_BANNERS = 5;

export function emptyHomeBanner(): HomeBanner {
  return {
    id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    image: '',
    tag: '',
    title: '',
    subtitle: '',
    buttonText: 'Открыть каталог',
    buttonLink: '/catalog',
    consultButtonText: 'Получить консультацию',
    enabled: true,
  };
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Терпимо к мусору: что не разобралось — просто не показываем. */
export function parseHomeBanners(raw: string | null | undefined): HomeBanner[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: asString(item.id, `b${index}`),
      image: asString(item.image).trim(),
      tag: asString(item.tag).trim(),
      title: asString(item.title).trim(),
      subtitle: asString(item.subtitle).trim(),
      buttonText: asString(item.buttonText).trim(),
      buttonLink: asString(item.buttonLink).trim(),
      consultButtonText: asString(item.consultButtonText).trim(),
      enabled: item.enabled !== false,
    }))
    .slice(0, MAX_HOME_BANNERS);
}

/** Слайды для витрины: включённые и с картинкой либо текстом. */
export function visibleHomeBanners(banners: HomeBanner[]): HomeBanner[] {
  return banners.filter((b) => b.enabled && (b.image || b.title || b.subtitle || b.tag));
}

export function serializeHomeBanners(banners: HomeBanner[]): string {
  return JSON.stringify(banners.slice(0, MAX_HOME_BANNERS));
}
