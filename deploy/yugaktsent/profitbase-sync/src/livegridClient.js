import { File } from "node:buffer";

const OFFER_TO_LISTING = {
  available: { status: "ACTIVE", isPublished: true },
  reserved: { status: "RESERVED", isPublished: true },
  sold: { status: "SOLD", isPublished: false },
  closed: { status: "INACTIVE", isPublished: false },
};

export class LiveGridClient {
  constructor(baseUrl, email, password) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.email = email;
    this.password = password;
    this.token = null;
    this.regionId = null;
    this.blocksByName = new Map();
  }

  async login() {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Login failed: HTTP ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    this.token = data.accessToken;
    return this.token;
  }

  async api(path, { method = "GET", body } = {}) {
    if (!this.token) await this.login();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      await this.login();
      return this.api(path, { method, body });
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async loadFeedLinks() {
    const rows = await this.api("/admin/feed-links?enabled=1");
    return Array.isArray(rows) ? rows : [];
  }

  async markFeedSynced(feedLinkId, stats = {}) {
    return this.api(`/admin/feed-links/${feedLinkId}/mark-synced`, {
      method: "POST",
      body: stats,
    });
  }

  async refreshCatalogCache() {
    return this.api("/admin/feed-import/refresh-cache", { method: "POST", body: {} });
  }

  async ensureRegion() {
    const code = process.env.YUGAKTSENT_REGION_CODE || "anapa";
    const name = process.env.YUGAKTSENT_REGION_NAME || "Анапа";
    const lat = Number(process.env.YUGAKTSENT_MAP_LAT || 44.895);
    const lng = Number(process.env.YUGAKTSENT_MAP_LNG || 37.3163);

    const regions = await this.api("/admin/regions");
    const list = Array.isArray(regions) ? regions : regions?.data ?? [];
    let region = list.find((r) => r.code === code);
    if (!region) {
      region = await this.api("/admin/regions", {
        method: "POST",
        body: {
          code,
          name,
          isEnabled: true,
          mapCenterLat: lat,
          mapCenterLng: lng,
          publicSiteUrl: process.env.PUBLIC_SITE_URL || "https://yugaktsent.neeklo.ru",
        },
      });
      console.log(`[profitbase-sync] created region ${code} id=${region.id}`);
    }
    this.regionId = region.id;
    return region;
  }

  slugify(name) {
    return String(name)
      .toLowerCase()
      .replace(/&amp;/g, "and")
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "complex";
  }

  async ensureBlock(name) {
    if (this.blocksByName.has(name)) return this.blocksByName.get(name);
    const blocksResp = await this.api(`/admin/blocks?region_id=${this.regionId}&per_page=200`);
    const blocks = Array.isArray(blocksResp?.data)
      ? blocksResp.data
      : Array.isArray(blocksResp)
        ? blocksResp
        : blocksResp?.items ?? [];

    let block = blocks.find((b) => b.name === name);
    if (!block) {
      block = await this.api("/admin/blocks", {
        method: "POST",
        body: {
          regionId: this.regionId,
          name,
          slug: this.slugify(name),
          status: "BUILDING",
          dataSource: "MANUAL",
        },
      });
      console.log(`[profitbase-sync] created block "${name}" id=${block.id}`);
    }
    this.blocksByName.set(name, block);
    return block;
  }

  async uploadRemoteImage(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      (url.match(/\.png(\?|$)/i) ? "image/png" : "image/jpeg");
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const filename = `profitbase-${Date.now()}.${ext}`;
    const form = new FormData();
    form.append("file", new File([buf], filename, { type: contentType }));

    const uploadRes = await fetch(`${this.baseUrl}/admin/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      throw new Error(`upload failed: HTTP ${uploadRes.status} ${t.slice(0, 200)}`);
    }
    const data = await uploadRes.json();
    return data.url || data.publicUrl || data.path;
  }

  buildApartmentPayload(offer, blockId) {
    const vis = OFFER_TO_LISTING[offer.status] ?? OFFER_TO_LISTING.available;
    if (!offer.price || offer.price <= 0) return null;

    return {
      regionId: this.regionId,
      blockId,
      price: offer.price,
      status: vis.status,
      isPublished: vis.isPublished,
      apartment: {
        areaTotal: offer.area || offer.livingArea || 1,
        areaKitchen: offer.kitchenArea ?? undefined,
        floor: offer.floor ?? undefined,
        floorsTotal: offer.floorsTotal ?? undefined,
        marketSegment: "NEW_BUILDING",
        buildingName: offer.buildingName ?? undefined,
        number: offer.number ?? undefined,
      },
    };
  }

  async createListing(payload) {
    return this.api("/admin/listings/manual-apartment", {
      method: "POST",
      body: payload,
    });
  }

  async updateListing(listingId, payload) {
    return this.api(`/admin/listings/${listingId}/manual-apartment`, {
      method: "PATCH",
      body: payload,
    });
  }
}

export { OFFER_TO_LISTING };
