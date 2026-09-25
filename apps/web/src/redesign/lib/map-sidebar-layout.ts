/** Fixed row geometry for map sidebar virtual list — tuned to sidebarRow + w-12 thumb layout */
export const MAP_SIDEBAR_ROW_HEIGHT = 104;
export const MAP_SIDEBAR_ROW_GAP = 4;
/** Extra rows rendered above/below viewport */
export const MAP_SIDEBAR_OVERSCAN = 8;

/** DEV-only overscan override via ?sidebar_overscan=4|8|12 — default unchanged in production */
export function resolveSidebarOverscan(): number {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const raw = new URLSearchParams(window.location.search).get('sidebar_overscan');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (n === 4 || n === 8 || n === 12) return n;
  }
  return MAP_SIDEBAR_OVERSCAN;
}

export function mapSidebarRowStride(): number {
  return MAP_SIDEBAR_ROW_HEIGHT + MAP_SIDEBAR_ROW_GAP;
}

/** Estimated visible rows from container height (for DOM reduction metric) */
export function estimateSidebarVisibleRows(viewportHeightPx: number): number {
  if (viewportHeightPx <= 0) return 0;
  return Math.ceil(viewportHeightPx / mapSidebarRowStride());
}
