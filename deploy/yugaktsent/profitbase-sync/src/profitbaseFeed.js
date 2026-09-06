import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const HUMAN_STATUS_MAP = {
  свободно: "available",
  free: "available",
  available: "available",
  продано: "sold",
  sold: "sold",
  забронировано: "reserved",
  reserved: "reserved",
  "постоянная бронь": "reserved",
  "закрыто для продажи": "closed",
  "не для продажи": "closed",
};

function text(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return value["#text"] ?? null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function num(value) {
  const raw = typeof value === "object" ? text(value) : value;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(String(raw).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

function customFields(offer) {
  const raw = offer["custom-field"];
  if (!raw) return {};
  const list = Array.isArray(raw) ? raw : [raw];
  const out = {};
  for (const item of list) {
    const name = text(item?.name);
    if (!name) continue;
    out[name] = text(item?.value);
  }
  return out;
}

function normalizeStatus(offer) {
  const code = (text(offer.status) ?? "").toUpperCase();
  if (code.startsWith("AVAILABLE")) return "available";
  if (code.startsWith("SOLD")) return "sold";
  if (code.startsWith("BOOKED")) return "reserved";
  if (code.startsWith("UNAVAILABLE")) return "closed";

  const human = (text(offer["status-humanized"]) ?? "").toLowerCase().trim();
  return HUMAN_STATUS_MAP[human] ?? "available";
}

function offerImages(offer) {
  const images = offer.image;
  if (!images) return [];
  const list = Array.isArray(images) ? images : [images];
  const seen = new Set();
  return list
    .map((img) =>
      typeof img === "string"
        ? { url: img, type: null }
        : { url: text(img), type: img["@_type"] ?? null },
    )
    .filter((img) => {
      if (!img.url || seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });
}

export function normalizeOffer(offer) {
  const externalId = text(offer["@_internal-id"]) ?? text(offer.number) ?? text(offer.id);
  if (!externalId) return null;

  const custom = customFields(offer);
  const area = num(offer.area?.value ?? offer.area) ?? num(offer["living-space"]?.value);

  return {
    externalId: String(externalId),
    number: text(offer.number),
    rooms: num(offer.rooms) ?? (String(offer.studio).toLowerCase() === "true" ? 0 : null),
    floor: num(offer.floor),
    area,
    livingArea: num(offer["living-space"]?.value),
    kitchenArea: num(offer["kitchen-space"]?.value),
    terraceArea: num(custom["Площадь террасы, м2"] ?? custom["Площадь террасы"]),
    price: num(offer.price?.value ?? offer.price),
    pricePerMeter: num(offer["price-meter"]?.value ?? offer["price-meter"]),
    status: normalizeStatus(offer),
    propertyTypeLabel: text(offer.property_type),
    windowView: text(offer["window-view"]),
    description: text(offer.description),
    complexName: text(offer.object?.name) ?? custom.Комплекс,
    buildingName: text(offer.house?.name) ?? custom.Корпус,
    buildingSection: text(offer["building-section"]) ?? custom.Секция,
    floorsTotal: num(offer.house?.["floors-total"]),
    completionQuarter: text(offer.house?.["ready-quarter"]) ?? custom["Срок сдачи"],
    builtYear: num(offer.house?.["built-year"]),
    buildingState: text(offer.house?.["building-state"]),
    layoutType: custom["Тип планировки"],
    features: custom.Особенности,
    custom,
    images: offerImages(offer),
  };
}

export function parseProfitbaseXml(xml) {
  const doc = parser.parse(xml);
  const root = doc["realty-feed"] ?? doc.feed ?? doc;
  const rawOffers = root?.offers?.offer ?? root?.offer ?? [];
  const offers = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
  return offers.map(normalizeOffer).filter(Boolean);
}

export async function fetchProfitbaseFeed(feedUrl) {
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Failed to download feed ${feedUrl}: HTTP ${res.status}`);
  const xml = await res.text();
  return parseProfitbaseXml(xml);
}
