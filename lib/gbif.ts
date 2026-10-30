import { GbifRecord } from "./data";

export const COUNTRIES = ["UZ", "KZ", "KG", "TJ", "TM"];
export const DECADES = [1850, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const API = "https://api.gbif.org/v1/occurrence/search";
const LICENSES = ["CC0_1_0", "CC_BY_4_0", "CC_BY_NC_4_0"];

const rnd = (n: number) => Math.floor(Math.random() * n);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<any | null> {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(1200 * (i + 1));
  }
  return null;
}

function base(extra: Record<string, string>, species?: number[]) {
  const p = new URLSearchParams({ kingdomKey: "6", basisOfRecord: "PRESERVED_SPECIMEN", mediaType: "StillImage", hasCoordinate: "true", hasGeospatialIssue: "false", ...extra });
  COUNTRIES.forEach((c) => p.append("country", c));
  LICENSES.forEach((l) => p.append("license", l));
  species?.forEach((k) => p.append("speciesKey", String(k)));
  return `${API}?${p}`;
}

/** The ~N most frequently recorded species in the region (so species recur across decades). */
export async function topSpecies(n = 150): Promise<number[]> {
  const j = await get(base({ limit: "0", facet: "speciesKey", facetLimit: String(n), "year": "1850,2025" }));
  return (j?.facets?.[0]?.counts ?? []).map((c: { name: string }) => +c.name);
}

/** How many records GBIF holds for our region/filters (all species), and how many of those the "load more" button can draw from. */
export async function availableCounts(species: number[]): Promise<{ region: number; loadable: number } | null> {
  const [a, b] = await Promise.all([get(base({ limit: "0", year: "1850,2025" })), get(base({ limit: "0", year: "1850,2025" }, species))]);
  if (!a || typeof a.count !== "number") return null;
  return { region: a.count, loadable: typeof b?.count === "number" ? b.count : a.count };
}

export function toRecord(o: any, countryFallback = ""): GbifRecord | null {
  const img = (o.media || []).find((m: any) => m.type === "StillImage" && m.identifier && /^https?:/.test(m.identifier));
  const sp = o.species || o.scientificName;
  if (!img || !sp || o.decimalLatitude == null || o.decimalLongitude == null || !o.year) return null;
  return {
    gbifKey: o.key, binomial: sp, scientificName: o.scientificName, family: o.family || "", collector: o.recordedBy || "",
    date: o.eventDate ? String(o.eventDate).slice(0, 10) : "", year: o.year, country: o.country || countryFallback, region: o.stateProvince || "",
    locality: o.locality || "", lat: o.decimalLatitude, lng: o.decimalLongitude, elevation: o.elevation != null ? Math.round(o.elevation) : null,
    iucn: o.iucnRedListCategory || null, typeStatus: Array.isArray(o.typeStatus) && o.typeStatus.length ? o.typeStatus[0] : null,
    institution: o.institutionCode || "", catalogNumber: o.catalogNumber || "", image: img.identifier, mediaHash: "", license: img.license || o.license || "",
    rightsHolder: img.rightsHolder || o.rightsHolder || "", gbifUrl: `https://www.gbif.org/occurrence/${o.key}`,
  };
}

/**
 * Fetches `total` new records spread evenly over the decades, restricted to frequently recorded species
 * so that species can be compared between periods. Used by the "Load 1000 more" button.
 */
export async function loadMore(total: number, exclude: Set<number>, species: number[], onProgress?: (n: number) => void): Promise<GbifRecord[]> {
  const out: GbifRecord[] = [];
  const perBin = Math.ceil(total / DECADES.length);
  for (const d of DECADES) {
    const y0 = d, y1 = d === 1850 ? 1899 : d + 9;
    const url = (offset: number, limit = 300) => base({ year: `${y0},${y1}`, limit: String(limit), offset: String(offset) }, species);
    const first = await get(url(0, 0));
    if (!first || !first.count) continue;
    const maxOff = Math.max(0, Math.min(first.count - 300, 9000));
    let got = 0, tries = 0;
    const perSp = new Map<string, number>();
    while (got < perBin && tries < 6) {
      tries++;
      const j = await get(url(rnd(maxOff + 1)));
      if (!j) continue;
      for (const o of j.results.sort(() => Math.random() - 0.5)) {
        if (got >= perBin) break;
        const r = toRecord(o);
        if (!r || exclude.has(r.gbifKey)) continue;
        if ((perSp.get(r.binomial) ?? 0) >= 3) continue;
        perSp.set(r.binomial, (perSp.get(r.binomial) ?? 0) + 1);
        exclude.add(r.gbifKey); out.push(r); got++;
      }
    }
    onProgress?.(out.length);
  }
  return out;
}

/** md5 for the GBIF image-cache path (browser-side, small implementation) */
export function md5(str: string): string {
  const rh = (n: number) => { let s = "", j; for (j = 0; j <= 3; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16); return s; };
  const ad = (x: number, y: number) => { const l = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff); };
  const rl = (n: number, c: number) => (n << c) | (n >>> (32 - c));
  const cm = (q: number, a: number, b: number, x: number, s: number, t: number) => ad(rl(ad(ad(a, q), ad(x, t)), s), b);
  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cm((b & c) | (~b & d), a, b, x, s, t);
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cm((b & d) | (c & ~d), a, b, x, s, t);
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cm(b ^ c ^ d, a, b, x, s, t);
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cm(c ^ (b | ~d), a, b, x, s, t);
  const bytes = new TextEncoder().encode(str);
  const nblk = ((bytes.length + 8) >> 6) + 1;
  const x = new Array(nblk * 16).fill(0);
  for (let i = 0; i < bytes.length; i++) x[i >> 2] |= bytes[i] << ((i % 4) * 8);
  x[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
  x[nblk * 16 - 2] = bytes.length * 8;
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    const S = [[7, 12, 17, 22], [5, 9, 14, 20], [4, 11, 16, 23], [6, 10, 15, 21]];
    const T: number[] = []; for (let k = 0; k < 64; k++) T.push(Math.floor(Math.abs(Math.sin(k + 1)) * 4294967296) | 0);
    for (let k = 0; k < 64; k++) {
      const r = k >> 4; let f: number, g: number;
      if (r === 0) { f = (b & c) | (~b & d); g = k; } else if (r === 1) { f = (b & d) | (c & ~d); g = (5 * k + 1) % 16; } else if (r === 2) { f = b ^ c ^ d; g = (3 * k + 5) % 16; } else { f = c ^ (b | ~d); g = (7 * k) % 16; }
      const tmp = d; d = c; c = b; b = ad(b, rl(ad(ad(a, f), ad(x[i + g], T[k])), S[r][k % 4])); a = tmp;
    }
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  void ff; void gg; void hh; void ii;
  return rh(a) + rh(b) + rh(c) + rh(d);
}
