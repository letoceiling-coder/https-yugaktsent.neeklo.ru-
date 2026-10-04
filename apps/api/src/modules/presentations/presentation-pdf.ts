import type { ListingPresentationPayload } from './presentation.types';

/** Фирменный зелёный ЮгАкцента; раньше здесь был синий чужого бренда. */
export const PDF_BRAND_COLOR = '#174F44';
export const PDF_GRAPHITE = '#1A1D21';
export const PDF_TEXT_DARK = '#111827';
export const PDF_TEXT_MUTED = '#6B7280';
export const PDF_BORDER = '#E5E7EB';
export const PDF_SURFACE = '#F4F7F6';

/** Реквизиты бренда для шапки и подвала PDF; берём из настроек сайта. */
export type PdfBrand = {
  name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
};

/** «12 500 000 ₽» — без копеек и с неразрывными пробелами разрядов. */
export function formatPdfMoney(value: number): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.trunc(value))} ₽`;
}

/** Строка контактов компании для подвала: только заполненные поля. */
export function formatPdfBrandContacts(brand: PdfBrand): string {
  return [brand.phone, brand.email, brand.siteUrl].filter(Boolean).join('   ·   ');
}

export type PdfAgentContact = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export function formatPdfFooterContact(contact: PdfAgentContact | null): string | null {
  if (!contact) return null;
  const parts = [contact.name, contact.phone, contact.email].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function formatPdfHeaderAgentLine(contact: PdfAgentContact | null): string | null {
  if (!contact) return null;
  const name = contact.name?.trim();
  const phone = contact.phone?.trim();
  if (name && phone) return `${name}\n${phone}`;
  return name ?? phone ?? contact.email?.trim() ?? null;
}

/** Yandex static map image (no API key). ll = lon,lat */
export function yandexStaticMapImageUrl(lat: number, lng: number, size: [number, number] = [500, 180]): string {
  const [w, h] = size;
  const ll = `${lng},${lat}`;
  const pt = `${lng},${lat},pm2rdm`;
  return `https://static-maps.yandex.ru/1.x/?lang=ru_RU&ll=${encodeURIComponent(ll)}&size=${w},${h}&z=15&l=map&pt=${encodeURIComponent(pt)}`;
}

export type PdfParamRow = { label: string; value: string };

export function listingPdfParamRows(p: ListingPresentationPayload): PdfParamRow[] {
  const rows: PdfParamRow[] = [{ label: 'Тип', value: p.kindLabel }];
  if (p.subtitle) rows.push({ label: 'Параметры', value: p.subtitle });
  if (p.price != null && Number.isFinite(p.price)) {
    rows.push({
      label: 'Цена',
      value: `${new Intl.NumberFormat('ru-RU').format(Math.trunc(p.price))} ₽`,
    });
  }
  if (p.region) rows.push({ label: 'Регион', value: p.region });
  if (p.district) rows.push({ label: 'Район', value: p.district });
  if (p.address) rows.push({ label: 'Адрес', value: p.address });
  if (p.builder) rows.push({ label: 'Продавец', value: p.builder });
  if (p.blockName) rows.push({ label: 'ЖК', value: p.blockName });
  return rows;
}

export function resolveGeoPoint(input: {
  lat?: unknown;
  lng?: unknown;
  blockLat?: unknown;
  blockLng?: unknown;
}): { lat: number; lng: number } | null {
  const lat = input.lat != null ? Number(input.lat) : input.blockLat != null ? Number(input.blockLat) : NaN;
  const lng = input.lng != null ? Number(input.lng) : input.blockLng != null ? Number(input.blockLng) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Заголовок Content-Disposition для имени файла с кириллицей.
 *
 * В заголовки HTTP можно писать только latin-1, поэтому слаг вроде
 * «жк-хозяин-морей» ронял ответ с ERR_INVALID_CHAR, и кнопка «Презентация
 * PDF» отдавала 500 у всех комплексов с русским адресом. По RFC 5987
 * настоящее имя уходит в filename*, а в filename кладём безопасный запасной.
 */
export function pdfContentDisposition(name: string, fallback: string): string {
  const safeFallback =
    fallback
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '') || 'presentation';
  const encoded = encodeURIComponent(`${name}.pdf`).replace(/['()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${safeFallback}.pdf"; filename*=UTF-8''${encoded}`;
}
