import { create } from 'zustand';
import { normalizeAboutPlatformSettings } from '@/shared/lib/about-platform-cms';
import { normalizeHelpSelectionSettings } from '@/shared/lib/help-selection-cms';
import { normalizePlatformToolsSettings } from '@/shared/lib/platform-tools-cms';
import { defaultPublicBrandName, replaceLegacyBrandDeep } from '@/shared/lib/site-brand-text';

// ============================================================
// Content Store — единый контентный слой для управления данными
// страниц через админ-панель. Хранение в localStorage.
// ============================================================

const CONTENT_KEY = 'cms_content';

// --- Types ---

export interface SectionConfig {
  id: string;
  type: string;
  label: string;
  position: number;
  is_active: boolean;
  settings: Record<string, any>;
}

export interface PageContent {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  og_image: string;
  status: 'draft' | 'published';
  sections: SectionConfig[];
}

// --- Default content matching current hardcoded frontend ---

const defaultHomeContent: PageContent = {
  slug: '/',
  title: 'Главная',
  meta_title: 'ЮгАкцент — новостройки и недвижимость в Анапе',
  meta_description: 'Каталог новостроек и квартир в Анапе. Подбор, карта, консультация специалистов ЮгАкцент.',
  og_image: '',
  status: 'published',
  sections: [
    { id: 'home-hero', type: 'hero', label: 'Hero секция', position: 0, is_active: true, settings: { title: 'ЮгАкцент', subtitle: 'Новостройки и вторичка Юга России', searchPlaceholder: 'Поиск по сайту', buttonText: 'Показать объекты', location: 'Анапа', tabs: ['Квартиры', 'Паркинги', 'Дома с участками', 'Участки', 'Коммерция'] } },
    { id: 'home-categories', type: 'category_tiles', label: 'Плитки категорий', position: 1, is_active: true, settings: { items: [
      { name: 'Новостройки', link: '/catalog' },
      { name: 'Вторичная\nнедвижимость', link: '/catalog' },
      { name: 'Аренда', link: '/catalog' },
      { name: 'Дома', link: '/catalog' },
      { name: 'Участки', link: '/catalog' },
      { name: 'Ипотека', link: '/catalog' },
      { name: 'Квартиры', link: '/catalog' },
      { name: 'Паркинги', link: '/catalog' },
      { name: 'Коммерческая\nнедвижимость', link: '/catalog' },
      { name: 'Подобрать\nобъект', link: '/catalog' },
    ] } },
    { id: 'home-new-listings', type: 'new_listings', label: 'Новые объявления', position: 2, is_active: true, settings: { title: 'Новые объявления', promoText: '100 000 +', promoLabel: 'объектов', promoButton: 'Узнать больше' } },
    { id: 'home-catalog-zhk', type: 'catalog_zhk', label: 'Каталог ЖК', position: 3, is_active: true, settings: { title: 'Каталог ЖК в', location: 'Москве' } },
    { id: 'home-quiz', type: 'quiz', label: 'Квиз', position: 4, is_active: true, settings: { title: 'Подберем объект под Ваш запрос', bannerTitle: 'Подберем\nза 5 минут' } },
    { id: 'home-hot', type: 'property_grid', label: 'Горячие предложения', position: 5, is_active: true, settings: { title: 'Горячие предложения', gridType: 'hot' } },
    { id: 'home-start', type: 'property_grid', label: 'Старт продаж', position: 6, is_active: true, settings: { title: 'Старт продаж', gridType: 'start' } },
    { id: 'home-about', type: 'about_platform', label: 'О компании', position: 7, is_active: true, settings: {} },
    { id: 'home-help', type: 'help_selection', label: 'Помощь с выбором', position: 8, is_active: true, settings: {
      title: 'Поможем подобрать недвижимость',
      description: 'Подберём квартиры, дома и ЖК под ваш бюджет и задачи.',
      buttonText: 'Получить консультацию',
      buttonUrl: '#consult',
      backgroundVariant: 'soft-blue',
    } },
    { id: 'home-features', type: 'additional_features', label: 'Инструменты', position: 9, is_active: true, settings: {
      title: 'Инструменты',
      items: [
        { id: 't1', icon: 'user-search', title: 'Индивидуальный подбор', description: 'Подберём под запрос', link: '/selection', enabled: true, order: 0 },
        { id: 't2', icon: 'building2', title: 'Вся недвижимость', description: 'Каталог объектов', link: '/catalog', enabled: true, order: 1 },
        { id: 't3', icon: 'user-circle', title: 'Личный кабинет', description: 'Избранное и заявки', link: '/login', enabled: true, order: 2 },
      ],
    } },
    { id: 'home-news', type: 'latest_news', label: 'Последние новости', position: 10, is_active: true, settings: { title: 'Последние новости' } },
    { id: 'home-contacts', type: 'contacts', label: 'Контакты', position: 11, is_active: true, settings: { title: 'Свяжитесь с нами', phone1: '+7 (4) 333 44 11', phone2: '+7 (4) 333 66 12', email: 'info@yugaktsent.ru', address: 'Анапа', socials: ['VK', 'TG', 'YT', 'OK'] } },
    { id: 'home-footer', type: 'footer', label: 'Подвал', position: 12, is_active: true, settings: { columns: [
      { title: 'Покупка', items: ['Новостройки', 'Вторичка', 'Коттеджи', 'Участки', 'Коммерция'] },
      { title: 'Аренда', items: ['Квартиры', 'Дома', 'Офисы', 'Склады', 'Помещения'] },
      { title: 'Ипотека', items: ['Калькулятор', 'Банки-партнеры', 'Программы', 'Рефинансирование'] },
      { title: 'Компания', items: ['О нас', 'Контакты', 'Карьера', 'Блог', 'Партнерам'] },
    ], copyright: '© 2026 ЮгАкцент. Все права защищены.' } },
  ],
};

const defaultCatalogContent: PageContent = {
  slug: '/catalog',
  title: 'Каталог',
  meta_title: 'Каталог недвижимости — ЮгАкцент',
  meta_description: 'Все объекты недвижимости в одном каталоге.',
  og_image: '',
  status: 'published',
  sections: [
    { id: 'cat-search', type: 'catalog_search', label: 'Поиск и фильтры', position: 0, is_active: true, settings: {} },
    { id: 'cat-grid', type: 'catalog_grid', label: 'Сетка объектов', position: 1, is_active: true, settings: {} },
    { id: 'cat-hot', type: 'property_grid', label: 'Горячие предложения', position: 2, is_active: true, settings: { title: 'Горячие предложения', gridType: 'hot' } },
    { id: 'cat-quiz', type: 'quiz', label: 'Квиз', position: 3, is_active: true, settings: {} },
    { id: 'cat-about', type: 'about_platform', label: 'О платформе', position: 4, is_active: true, settings: {} },
    { id: 'cat-features', type: 'additional_features', label: 'Дополнительные возможности', position: 5, is_active: true, settings: {} },
    { id: 'cat-news', type: 'latest_news', label: 'Последние новости', position: 6, is_active: true, settings: {} },
    { id: 'cat-contacts', type: 'contacts', label: 'Контакты', position: 7, is_active: true, settings: {} },
  ],
};

const defaultCatalogZhkContent: PageContent = {
  slug: '/catalog-zhk',
  title: 'Каталог ЖК',
  meta_title: 'Каталог ЖК — ЮгАкцент',
  meta_description: 'Каталог жилых комплексов в Москве.',
  og_image: '',
  status: 'published',
  sections: [
    { id: 'czhk-filters', type: 'catalog_filters', label: 'Фильтры', position: 0, is_active: true, settings: {} },
    { id: 'czhk-grid', type: 'zhk_grid', label: 'Сетка ЖК', position: 1, is_active: true, settings: {} },
    { id: 'czhk-start', type: 'property_grid', label: 'Старт продаж', position: 2, is_active: true, settings: { title: 'Старт продаж', gridType: 'start' } },
    { id: 'czhk-about', type: 'about_platform', label: 'О платформе', position: 3, is_active: true, settings: {} },
    { id: 'czhk-features', type: 'additional_features', label: 'Дополнительные возможности', position: 4, is_active: true, settings: {} },
    { id: 'czhk-news', type: 'latest_news', label: 'Последние новости', position: 5, is_active: true, settings: {} },
    { id: 'czhk-contacts', type: 'contacts', label: 'Контакты', position: 6, is_active: true, settings: {} },
  ],
};

const defaultNewsContent: PageContent = {
  slug: '/news',
  title: 'Новости',
  meta_title: 'Новости — ЮгАкцент',
  meta_description: 'Последние новости рынка недвижимости.',
  og_image: '',
  status: 'published',
  sections: [
    { id: 'news-grid', type: 'news_grid', label: 'Сетка новостей', position: 0, is_active: true, settings: {} },
    { id: 'news-quiz', type: 'quiz', label: 'Квиз', position: 1, is_active: true, settings: {} },
    { id: 'news-about', type: 'about_platform', label: 'О платформе', position: 2, is_active: true, settings: {} },
    { id: 'news-features', type: 'additional_features', label: 'Дополнительные возможности', position: 3, is_active: true, settings: {} },
    { id: 'news-contacts', type: 'contacts', label: 'Контакты', position: 4, is_active: true, settings: {} },
  ],
};

const defaultPages: PageContent[] = [
  defaultHomeContent,
  defaultCatalogContent,
  defaultCatalogZhkContent,
  defaultNewsContent,
];

// --- Load / Save ---

const migratePages = (pages: PageContent[]): PageContent[] => {
  const brand = defaultPublicBrandName();
  const normalized = pages.map((page) => ({
    ...page,
    sections: page.sections.map((s) => {
      if (s.type === 'about_platform') {
        return { ...s, settings: normalizeAboutPlatformSettings(s.settings) as Record<string, unknown> };
      }
      if (s.type === 'help_selection') {
        return { ...s, settings: normalizeHelpSelectionSettings(s.settings) as Record<string, unknown> };
      }
      if (s.type === 'additional_features') {
        return { ...s, settings: normalizePlatformToolsSettings(s.settings) as Record<string, unknown> };
      }
      return s;
    }),
  }));
  return replaceLegacyBrandDeep(normalized, brand);
};

const loadContent = (): PageContent[] => {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) return migratePages(JSON.parse(raw));
  } catch {}
  return migratePages(defaultPages);
};

const saveContent = (pages: PageContent[]) => {
  try { localStorage.setItem(CONTENT_KEY, JSON.stringify(pages)); } catch {}
};

// --- Store ---

interface ContentState {
  pages: PageContent[];

  getPageContent: (slug: string) => PageContent | undefined;
  getActiveSections: (slug: string) => SectionConfig[];
  getSectionSettings: (slug: string, sectionId: string) => Record<string, any> | undefined;

  updatePageMeta: (slug: string, meta: Partial<Pick<PageContent, 'title' | 'meta_title' | 'meta_description' | 'og_image' | 'status'>>) => void;
  toggleSection: (slug: string, sectionId: string) => void;
  reorderSections: (slug: string, fromIndex: number, toIndex: number) => void;
  updateSectionSettings: (slug: string, sectionId: string, settings: Record<string, any>) => void;
  updateSectionLabel: (slug: string, sectionId: string, label: string) => void;

  addPage: (page: PageContent) => void;
  removePage: (slug: string) => void;

  persist: () => void;
  resetToDefaults: () => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  pages: loadContent(),

  getPageContent: (slug) => get().pages.find(p => p.slug === slug),

  getActiveSections: (slug) => {
    const page = get().pages.find(p => p.slug === slug);
    if (!page) return [];
    return page.sections
      .filter(s => s.is_active)
      .sort((a, b) => a.position - b.position);
  },

  getSectionSettings: (slug, sectionId) => {
    const page = get().pages.find(p => p.slug === slug);
    if (!page) return undefined;
    return page.sections.find(s => s.id === sectionId)?.settings;
  },

  updatePageMeta: (slug, meta) => {
    set(state => ({
      pages: state.pages.map(p => p.slug === slug ? { ...p, ...meta } : p),
    }));
    get().persist();
  },

  toggleSection: (slug, sectionId) => {
    set(state => ({
      pages: state.pages.map(p => p.slug === slug ? {
        ...p,
        sections: p.sections.map(s => s.id === sectionId ? { ...s, is_active: !s.is_active } : s),
      } : p),
    }));
    get().persist();
  },

  reorderSections: (slug, fromIndex, toIndex) => {
    set(state => ({
      pages: state.pages.map(p => {
        if (p.slug !== slug) return p;
        const sorted = [...p.sections].sort((a, b) => a.position - b.position);
        const [moved] = sorted.splice(fromIndex, 1);
        sorted.splice(toIndex, 0, moved);
        return {
          ...p,
          sections: sorted.map((s, i) => ({ ...s, position: i })),
        };
      }),
    }));
    get().persist();
  },

  updateSectionSettings: (slug, sectionId, settings) => {
    set(state => ({
      pages: state.pages.map(p => p.slug === slug ? {
        ...p,
        sections: p.sections.map(s => s.id === sectionId ? { ...s, settings: { ...s.settings, ...settings } } : s),
      } : p),
    }));
    get().persist();
  },

  updateSectionLabel: (slug, sectionId, label) => {
    set(state => ({
      pages: state.pages.map(p => p.slug === slug ? {
        ...p,
        sections: p.sections.map(s => s.id === sectionId ? { ...s, label } : s),
      } : p),
    }));
    get().persist();
  },

  addPage: (page) => {
    set(state => ({ pages: [...state.pages, page] }));
    get().persist();
  },

  removePage: (slug) => {
    set(state => ({ pages: state.pages.filter(p => p.slug !== slug) }));
    get().persist();
  },

  persist: () => saveContent(get().pages),

  resetToDefaults: () => {
    set({ pages: defaultPages });
    saveContent(defaultPages);
  },
}));
