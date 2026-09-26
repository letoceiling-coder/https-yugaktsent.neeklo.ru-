/**
 * Контакты подвала берутся только из настроек сайта (админка → Настройки).
 * Заглушек с чужими адресами и телефонами здесь нет: чего нет в CMS —
 * того нет и на сайте.
 */

export const FOOTER_CATALOG_LINKS = [
  { label: 'Новостройки', to: '/catalog?type=apartments&market=new' },
  { label: 'Вторичное жильё', to: '/catalog?type=apartments&market=secondary' },
  { label: 'Дома и участки', to: '/catalog?type=houses' },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { label: 'О нас', to: '/about' },
  { label: 'Наши агенты', to: '/agents' },
  { label: 'Контакты', to: '/contacts' },
] as const;
