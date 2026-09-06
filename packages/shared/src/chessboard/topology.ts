import type { ChessboardApartmentInput } from './types.js';
import { apartmentNumber, layoutFingerprint } from './matrix-core.js';
import { minCostAssignment } from './matching.js';
import { layoutGroupKey, mirroredPlanSignaturesForLayout } from './mirror.js';
import { planSignature, stableFloorOrder, verticalMatchScore } from './signature.js';

/** Max vertical match score to treat apartments as one architectural shaft link. */
export const VERTICAL_LINK_MAX_SCORE = 5;

export type ArchitecturalShaft = {
  shaftId: string;
  shaftIndex: number;
  label: string;
  primaryFingerprint: string;
  primaryPlanSignature: string | null;
  mirroredPlanSignatures: string[];
  layoutGroupKey: string;
  floorsPresent: number[];
  apartmentIds: string[];
};

export type FloorTemplateSlot = {
  shaftId: string;
  shaftIndex: number;
  apartmentId: string | null;
  isPlaceholder: boolean;
};

export type FloorTemplate = {
  floor: number;
  slots: FloorTemplateSlot[];
};

export type BuildingTopologyGraph = {
  sectionCount: number;
  shafts: ArchitecturalShaft[];
  floorTemplates: FloorTemplate[];
  /** apartmentId → shaftId */
  apartmentToShaft: Record<string, string>;
};

type UnionFind = {
  find: (id: string) => string;
  union: (a: string, b: string) => void;
};

function makeUnionFind(ids: string[]): UnionFind {
  const parent = new Map<string, string>();
  for (const id of ids) parent.set(id, id);

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = id;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (ra.localeCompare(rb) < 0) parent.set(rb, ra);
    else parent.set(ra, rb);
  };

  return { find, union };
}

function groupByFloor(apartments: ChessboardApartmentInput[]): Map<number, ChessboardApartmentInput[]> {
  const byFloor = new Map<number, ChessboardApartmentInput[]>();
  for (const apt of apartments) {
    const floor = apt.floor;
    if (floor == null || floor <= 0 || floor > 200) continue;
    const list = byFloor.get(floor) ?? [];
    list.push(apt);
    byFloor.set(floor, list);
  }
  return byFloor;
}

function referenceFloor(byFloor: Map<number, ChessboardApartmentInput[]>): number {
  const floors = [...byFloor.keys()].sort((a, b) => a - b);
  let bestFloor = floors[0] ?? 1;
  let bestCount = -1;
  for (const floor of floors) {
    const count = byFloor.get(floor)!.length;
    // Tie-break: prefer higher floor (typical chessboard "widest" row for column order).
    if (count > bestCount || (count === bestCount && floor > bestFloor)) {
      bestCount = count;
      bestFloor = floor;
    }
  }
  return bestFloor;
}

function greedyLinkAdjacentFloors(
  lower: ChessboardApartmentInput[],
  upper: ChessboardApartmentInput[],
  uf: UnionFind,
): void {
  const usedUpper = new Set<number>();
  for (const la of lower) {
    let bestIdx = -1;
    let bestScore = VERTICAL_LINK_MAX_SCORE + 1;
    for (let j = 0; j < upper.length; j += 1) {
      if (usedUpper.has(j)) continue;
      const s = verticalMatchScore(la, upper[j]!);
      if (s <= bestScore) {
        bestScore = s;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0 && bestScore <= VERTICAL_LINK_MAX_SCORE) {
      usedUpper.add(bestIdx);
      uf.union(la.id, upper[bestIdx]!.id);
    }
  }
}

function linkAdjacentFloors(
  lower: ChessboardApartmentInput[],
  upper: ChessboardApartmentInput[],
  uf: UnionFind,
): void {
  if (!lower.length || !upper.length) return;

  const n = Math.max(lower.length, upper.length);
  if (n > 60 || lower.length * upper.length > 3600) {
    greedyLinkAdjacentFloors(lower, upper, uf);
    return;
  }

  const cost = lower.map((la) =>
    upper.map((ub) => {
      const s = verticalMatchScore(la, ub);
      if (s > VERTICAL_LINK_MAX_SCORE) return 1e6;
      return s + la.id.localeCompare(ub.id) * 1e-9;
    }),
  );

  const assignment = minCostAssignment(cost);
  for (let i = 0; i < lower.length; i += 1) {
    const j = assignment[i]!;
    if (j < 0 || j >= upper.length) continue;
    if (cost[i]![j]! > VERTICAL_LINK_MAX_SCORE) continue;
    uf.union(lower[i]!.id, upper[j]!.id);
  }
}

function deriveShaftLabel(apartments: ChessboardApartmentInput[]): string {
  const counts = new Map<string, number>();
  for (const apt of apartments) {
    const key = layoutFingerprint(apt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.size) return '—';
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [rooms, area] = top[0].split('|');
  const r = Number(rooms);
  const prefix = r === 0 ? 'Студия' : `${r}-к.кв`;
  return `${prefix} ${area}м²`;
}

function sectionCountFrom(apartments: ChessboardApartmentInput[]): number {
  const sections = new Set<number>();
  for (const apt of apartments) {
    const s = apt.section ?? 1;
    if (s > 0) sections.add(s);
  }
  return sections.size || 1;
}

/**
 * Builds real shaft entities (connected vertical stacks) via union-find on
 * optimal adjacent-floor assignments — no greedy column placement.
 */
export function buildBuildingTopology(
  apartments: ChessboardApartmentInput[],
): BuildingTopologyGraph {
  if (!apartments.length) {
    return { sectionCount: 1, shafts: [], floorTemplates: [], apartmentToShaft: {} };
  }

  const byFloor = groupByFloor(apartments);
  const sortedFloors = [...byFloor.keys()].sort((a, b) => a - b);
  const ids = apartments.map((a) => a.id);
  const uf = makeUnionFind(ids);

  for (let i = 0; i < sortedFloors.length - 1; i += 1) {
    const low = sortedFloors[i]!;
    const high = sortedFloors[i + 1]!;
    linkAdjacentFloors(
      [...(byFloor.get(low) ?? [])].sort(stableFloorOrder),
      [...(byFloor.get(high) ?? [])].sort(stableFloorOrder),
      uf,
    );
  }

  const rawComponents = new Map<string, ChessboardApartmentInput[]>();
  for (const apt of [...apartments].sort((a, b) => a.id.localeCompare(b.id))) {
    const root = uf.find(apt.id);
    const list = rawComponents.get(root) ?? [];
    list.push(apt);
    rawComponents.set(root, list);
  }

  const components = new Map<string, ChessboardApartmentInput[]>();
  for (const list of rawComponents.values()) {
    const key = [...list].map((a) => a.id).sort()[0]!;
    components.set(key, list);
  }

  const ref = referenceFloor(byFloor);

  /** Stable shaft entity ids (independent of input iteration order). */
  const componentKeys = [...components.keys()].sort((ka, kb) => ka.localeCompare(kb));

  const displayRank = (key: string): number => {
    const onRef = components.get(key)!.filter((a) => a.floor === ref).sort(stableFloorOrder)[0];
    if (onRef) return apartmentNumber(onRef);
    return 10_000 + Math.min(...components.get(key)!.map(apartmentNumber));
  };

  /** Left-to-right column order on reference floor (deterministic tie-break). */
  const displayOrder = [...componentKeys].sort(
    (ka, kb) => displayRank(ka) - displayRank(kb) || ka.localeCompare(kb),
  );

  void ref;

  const shaftIdByKey = new Map(
    componentKeys.map((key, idx) => [key, `shaft-${idx + 1}`] as const),
  );

  const shaftById = new Map<string, ArchitecturalShaft>();

  for (const key of componentKeys) {
    const apts = components.get(key)!;
    const fps = new Map<string, number>();
    for (const apt of apts) {
      const fp = layoutFingerprint(apt);
      fps.set(fp, (fps.get(fp) ?? 0) + 1);
    }
    const [primaryFingerprint] = [...fps.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
    const layoutKey = layoutGroupKey(apts[0]!);
    const floorsPresent = [...new Set(apts.map((a) => a.floor))].sort((a, b) => b - a);
    const plans = mirroredPlanSignaturesForLayout(apts, primaryFingerprint);
    const primaryPlan =
      apts.find((a) => layoutFingerprint(a) === primaryFingerprint && planSignature(a)) ??
      apts.find((a) => planSignature(a));
    const shaftId = shaftIdByKey.get(key)!;
    const entity: ArchitecturalShaft = {
      shaftId,
      shaftIndex: displayOrder.indexOf(key) + 1,
      label: deriveShaftLabel(apts),
      primaryFingerprint,
      primaryPlanSignature: primaryPlan ? planSignature(primaryPlan) || null : null,
      mirroredPlanSignatures: plans,
      layoutGroupKey: layoutKey,
      floorsPresent,
      apartmentIds: apts.map((a) => a.id).sort(),
    };
    shaftById.set(shaftId, entity);
  }

  const shafts = displayOrder.map((key) => shaftById.get(shaftIdByKey.get(key)!)!);

  const aptToShaftId = new Map<string, string>();
  for (const shaft of shaftById.values()) {
    for (const id of shaft.apartmentIds) aptToShaftId.set(id, shaft.shaftId);
  }

  const floorsDesc = [...sortedFloors].sort((a, b) => b - a);
  const floorTemplates: FloorTemplate[] = floorsDesc.map((floor) => {
    const onFloor = new Map(
      (byFloor.get(floor) ?? []).map((a) => [aptToShaftId.get(a.id)!, a] as const),
    );
    const slots: FloorTemplateSlot[] = shafts.map((shaft) => {
      const apt = onFloor.get(shaft.shaftId);
      return {
        shaftId: shaft.shaftId,
        shaftIndex: shaft.shaftIndex,
        apartmentId: apt?.id ?? null,
        isPlaceholder: !apt,
      };
    });
    return { floor, slots };
  });

  const apartmentToShaft: Record<string, string> = {};
  for (const [id, shaftId] of aptToShaftId) apartmentToShaft[id] = shaftId;

  return {
    sectionCount: sectionCountFrom(apartments),
    shafts,
    floorTemplates,
    apartmentToShaft,
  };
}

export function topologyArchitecturalSignature(shaft: ArchitecturalShaft): string {
  if (shaft.primaryPlanSignature) return `plan:${shaft.primaryPlanSignature}`;
  return `fp:${shaft.primaryFingerprint}`;
}
