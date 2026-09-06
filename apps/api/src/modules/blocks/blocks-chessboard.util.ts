import {
  buildChessboardBuildingMatrix,
  type ChessboardApartmentInput,
  type ChessboardBlockResponse,
} from '@lg/shared';
import { ListingKind, ListingStatus } from '@prisma/client';

const MIN_REASONABLE_PRICE_RUB = 100_000;

type ListingRow = {
  id: number;
  buildingId: number | null;
  price: { toNumber?: () => number } | number | string | null;
  status: ListingStatus;
  apartment: null | {
    floor: number | null;
    number: string | null;
    areaTotal: { toNumber?: () => number } | number | string | null;
    areaKitchen: { toNumber?: () => number } | number | string | null;
    planUrl: string | null;
    section?: number | null;
    roomType: { name: string | null; nameOne: string | null } | null;
    finishing: { name: string | null } | null;
  };
};

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'object' && v !== null && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roomsFromRoomTypeName(name: string | undefined | null): number {
  const n = (name ?? '').toLowerCase();
  if (n.includes('студ')) return 0;
  const m = n.match(/(\d)/);
  if (m) return Math.min(4, parseInt(m[1], 10));
  return 1;
}

function listingStatus(s: ListingStatus): ChessboardApartmentInput['status'] {
  if (s === ListingStatus.RESERVED) return 'reserved';
  if (s === ListingStatus.SOLD) return 'sold';
  return 'available';
}

function mapFinishing(name: string | undefined | null): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('чернов')) return 'черновая';
  if (n.includes('без отделк')) return 'без отделки';
  if (n.includes('под ключ')) return 'под ключ';
  return 'чистовая';
}

export function mapListingToChessboardInput(row: ListingRow): ChessboardApartmentInput | null {
  const apt = row.apartment;
  if (!apt) return null;
  const floor = apt.floor;
  if (floor == null || floor <= 0 || floor > 200) return null;
  const area = num(apt.areaTotal);
  if (area <= 0) return null;
  const price = num(row.price);
  const safePrice = price >= MIN_REASONABLE_PRICE_RUB ? price : 0;
  const kitchen = num(apt.areaKitchen);
  let rooms = roomsFromRoomTypeName(apt.roomType?.nameOne ?? apt.roomType?.name);
  if (!apt.roomType && kitchen <= 0 && area > 0 && area <= 35) {
    rooms = 0;
  }
  return {
    id: String(row.id),
    number: apt.number != null ? String(apt.number) : '',
    floor: apt.floor ?? 1,
    rooms,
    area,
    price: safePrice,
    pricePerMeter: safePrice > 0 ? Math.round(safePrice / area) : 0,
    finishing: mapFinishing(apt.finishing?.name),
    status: listingStatus(row.status),
    section: apt.section ?? 1,
    planImage: apt.planUrl?.trim() || null,
  };
}

export function buildBlockChessboardResponse(
  block: { id: number; slug: string; name: string; buildings: Array<{ id: number; name: string | null }> },
  listings: ListingRow[],
): ChessboardBlockResponse {
  const buildings = block.buildings.length
    ? block.buildings
    : [{ id: block.id, name: 'Корпус 1' }];

  const buildingMatrices = buildings.map((b, idx) => {
    const id = String(b.id);
    const apts = listings
      .filter((l) => (l.buildingId != null ? String(l.buildingId) === id : idx === 0))
      .map(mapListingToChessboardInput)
      .filter((x): x is ChessboardApartmentInput => x != null);
    return buildChessboardBuildingMatrix(id, b.name ?? `Корпус ${idx + 1}`, apts);
  });

  return {
    blockId: block.id,
    slug: block.slug,
    name: block.name,
    buildings: buildingMatrices,
  };
}

export const CHESSBOARD_LISTING_STATUSES: ListingStatus[] = [
  ListingStatus.ACTIVE,
  ListingStatus.RESERVED,
  ListingStatus.SOLD,
];

export const CHESSBOARD_LISTING_KIND = ListingKind.APARTMENT;
