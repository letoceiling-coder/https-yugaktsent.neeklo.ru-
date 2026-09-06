import type { LucideIcon } from 'lucide-react';
import { Building2, Crown, Heart, Home, Layers, MapPin, TrendingUp, Users } from 'lucide-react';

export type AboutPlatformBackground = 'default' | 'muted' | 'white';

export type AboutPlatformStat = {
  id: string;
  value: string;
  label: string;
  icon: string;
  enabled: boolean;
  order: number;
};

export type AboutPlatformSettings = {
  eyebrow: string;
  title: string;
  description: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  imageUrl: string;
  imageAlt: string;
  imageUrlMobile: string;
  backgroundVariant: AboutPlatformBackground;
  stats: AboutPlatformStat[];
};

export const ABOUT_PLATFORM_ICON_OPTIONS = [
  { id: 'building2', label: 'Здание' },
  { id: 'crown', label: 'Корона' },
  { id: 'users', label: 'Люди' },
  { id: 'heart', label: 'Сердце' },
  { id: 'home', label: 'Дом' },
  { id: 'layers', label: 'Слои' },
  { id: 'map-pin', label: 'Метка' },
  { id: 'trending-up', label: 'Рост' },
] as const;

const ICON_MAP: Record<string, LucideIcon> = {
  building2: Building2,
  crown: Crown,
  users: Users,
  heart: Heart,
  home: Home,
  layers: Layers,
  'map-pin': MapPin,
  'trending-up': TrendingUp,
};

export function aboutPlatformIcon(id: string): LucideIcon {
  return ICON_MAP[id] ?? Building2;
}

export const DEFAULT_ABOUT_PLATFORM_SETTINGS: AboutPlatformSettings = {
  eyebrow: 'О компании',
  title: 'ЮгАкцент — недвижимость в Анапе',
  description:
    'Мы — команда экспертов, для которых недвижимость Анапы не просто работа, а профессия и стиль жизни. С 2017 года «ЮгАкцент» помогает семьям, инвесторам и предпринимателям находить объекты, в которые хочется вернуться. За каждым положительным отзывом — часы работы: телефонные переговоры, показы, юридические проверки, сопровождение сделки от аванса до ключей.',
  primaryButtonText: 'Узнать подробнее',
  primaryButtonUrl: '/about',
  secondaryButtonText: '',
  secondaryButtonUrl: '',
  imageUrl: '',
  imageAlt: 'ЮгАкцент — агентство недвижимости в Анапе',
  imageUrlMobile: '',
  backgroundVariant: 'muted',
  stats: [
    { id: 's1', value: '—', label: 'квартир в каталоге', icon: 'layers', enabled: true, order: 0 },
    { id: 's2', value: '—', label: 'жилых комплексов', icon: 'building2', enabled: true, order: 1 },
    { id: 's3', value: '—', label: 'новостроек в Анапе', icon: 'map-pin', enabled: true, order: 2 },
  ],
};

const DEMO_STAT_LABEL_BLOCK =
  /пользовател|10\s*лет|85\s*регион|100\s*000|50\s*000/i;

function statId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function coerceStat(raw: unknown, index: number): AboutPlatformStat {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: typeof o.id === 'string' && o.id ? o.id : statId(),
    value: String(o.value ?? ''),
    label: String(o.label ?? ''),
    icon: typeof o.icon === 'string' && o.icon ? o.icon : 'building2',
    enabled: o.enabled !== false,
    order: typeof o.order === 'number' ? o.order : index,
  };
}

export function normalizeAboutPlatformSettings(
  raw: Record<string, unknown> | undefined | null,
): AboutPlatformSettings {
  const base = { ...DEFAULT_ABOUT_PLATFORM_SETTINGS };
  if (!raw) return base;

  const legacyStats = Array.isArray(raw.stats) ? raw.stats.map(coerceStat) : null;

  const eyebrow =
    (typeof raw.eyebrow === 'string' && raw.eyebrow.trim()) ||
    (typeof raw.subtitle === 'string' && raw.subtitle.trim()) ||
    base.eyebrow;

  const title = (typeof raw.title === 'string' && raw.title.trim()) || base.title;
  const description =
    (typeof raw.description === 'string' && raw.description.trim()) || base.description;

  return {
    eyebrow,
    title,
    description,
    primaryButtonText:
      (typeof raw.primaryButtonText === 'string' && raw.primaryButtonText) ||
      (typeof raw.primaryCtaText === 'string' && raw.primaryCtaText) ||
      base.primaryButtonText,
    primaryButtonUrl:
      (typeof raw.primaryButtonUrl === 'string' && raw.primaryButtonUrl) ||
      (typeof raw.primaryCtaUrl === 'string' && raw.primaryCtaUrl) ||
      base.primaryButtonUrl,
    secondaryButtonText:
      (typeof raw.secondaryButtonText === 'string' && raw.secondaryButtonText) ||
      (typeof raw.secondaryCtaText === 'string' && raw.secondaryCtaText) ||
      base.secondaryButtonText,
    secondaryButtonUrl:
      (typeof raw.secondaryButtonUrl === 'string' && raw.secondaryButtonUrl) ||
      (typeof raw.secondaryCtaUrl === 'string' && raw.secondaryCtaUrl) ||
      base.secondaryButtonUrl,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : typeof raw.image === 'string' ? raw.image : base.imageUrl,
    imageAlt: typeof raw.imageAlt === 'string' && raw.imageAlt ? raw.imageAlt : base.imageAlt,
    imageUrlMobile: typeof raw.imageUrlMobile === 'string' ? raw.imageUrlMobile : base.imageUrlMobile,
    backgroundVariant:
      raw.backgroundVariant === 'default' || raw.backgroundVariant === 'white' || raw.backgroundVariant === 'muted'
        ? raw.backgroundVariant
        : base.backgroundVariant,
    stats:
      legacyStats && legacyStats.length > 0
        ? legacyStats
            .filter((s) => s.value.trim() || s.label.trim())
            .sort((a, b) => a.order - b.order)
        : base.stats,
  };
}

export function sortedEnabledStats(settings: AboutPlatformSettings): AboutPlatformStat[] {
  return settings.stats
    .filter((s) => s.enabled && s.value.trim() && !DEMO_STAT_LABEL_BLOCK.test(s.label))
    .sort((a, b) => a.order - b.order)
    .slice(0, 3);
}

export function aboutPlatformStatHref(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes('квартир') || l.includes('объект')) return '/catalog';
  if (l.includes('жк') || l.includes('комплекс')) return '/catalog?type=apartments';
  if (l.includes('регион')) return '/catalog';
  return null;
}

export function aboutPlatformSectionBg(variant: AboutPlatformBackground): string {
  if (variant === 'white') return 'bg-background';
  if (variant === 'default') return 'bg-background';
  return 'bg-muted/40';
}
