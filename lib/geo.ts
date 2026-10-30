import { KYZYLKUM_BOX } from "./data";

export function toDMS(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const a = Math.abs(value);
  const d = Math.floor(a);
  const mFull = (a - d) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${d}°${String(m).padStart(2, "0")}'${s.padStart(4, "0")}"${hemi}`;
}

export function toDecimalLabel(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? "E" : "W"}`;
}

export function utmZone(lat: number, lng: number): string {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const letters = "CDEFGHJKLMNPQRSTUVWX";
  const band = lat >= 84 ? "X" : lat < -80 ? "C" : letters[Math.floor((lat + 80) / 8)];
  return `${zone}${band}`;
}

/** Full WGS84 → UTM easting/northing (Krüger series). */
export function toUTM(lat: number, lng: number): { zone: string; e: number; n: number } {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const zoneNum = Math.floor((lng + 180) / 6) + 1;
  const lon0 = ((zoneNum - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const phi = (lat * Math.PI) / 180, lam = (lng * Math.PI) / 180;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lam - lon0);
  const M = a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi
    - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi)
    + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi)
    - ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const e = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  let n = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (lat < 0) n += 10000000;
  return { zone: utmZone(lat, lng), e, n };
}

/** Haversine distance in km */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371.0088, r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Decode Terrarium RGB to metres */
export function terrariumElevation(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

// ---------------- coordinate parsing ----------------
const DMS_RE = /(\d{1,3})\s*[°d]\s*(\d{1,2})\s*['′m]\s*(\d{1,2}(?:\.\d+)?)\s*(?:"|″|''|s)?\s*([NSEW])/gi;

export function parseDMSPair(raw: string): { lat: number; lng: number } | null {
  const hits = [...raw.matchAll(DMS_RE)];
  if (hits.length < 2) return null;
  const conv = (m: RegExpMatchArray) => {
    const v = +m[1] + +m[2] / 60 + +m[3] / 3600;
    return /[SW]/i.test(m[4]) ? -v : v;
  };
  const vals = hits.slice(0, 2).map((m) => ({ v: conv(m), hemi: m[4].toUpperCase() }));
  const lat = vals.find((x) => x.hemi === "N" || x.hemi === "S");
  const lng = vals.find((x) => x.hemi === "E" || x.hemi === "W");
  if (!lat || !lng) return null;
  return { lat: lat.v, lng: lng.v };
}

export function parseDecimalPair(raw: string): { lat: number; lng: number } | null {
  const m = raw.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

// ---------------- taxonomy (IPNI-style fuzzy match) ----------------
/** Edit distance with two rolling rows (O(min) memory, no per-call matrix allocation) and an early exit once every cell exceeds `max`. */
export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (a.length < b.length) [a, b] = [b, a];
  if (a.length - b.length > max) return max + 1;
  let prev = new Uint16Array(b.length + 1), cur = new Uint16Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/** Reference names for typo repair; filled from the loaded GBIF records. */
export const REFERENCE_TAXA: { name: string; binomial: string }[] = [];
const MATCH_CACHE = new Map<string, { name: string; distance: number; exact: boolean } | null>(); // same typo appears on many rows
export function setReferenceTaxa(items: { binomial: string; authority: string }[]) {
  REFERENCE_TAXA.length = 0;
  MATCH_CACHE.clear();
  const seen = new Set<string>();
  for (const i of items) if (!seen.has(i.binomial)) { seen.add(i.binomial); REFERENCE_TAXA.push({ name: `${i.binomial} ${i.authority}`.trim(), binomial: i.binomial }); }
}

/** Used by the import worker, which receives the reference list from the page instead of the GBIF records. */
export function setReferenceNames(items: { name: string; binomial: string }[]) {
  REFERENCE_TAXA.length = 0;
  MATCH_CACHE.clear();
  for (const i of items) REFERENCE_TAXA.push(i);
}

export function matchTaxon(input: string): { name: string; distance: number; exact: boolean } | null {
  const key = input.trim().toLowerCase();
  const hit = MATCH_CACHE.get(key);
  if (hit !== undefined) return hit;
  const q = key.split(/\s+/).slice(0, 2).join(" ");
  let out: { name: string; distance: number; exact: boolean } | null = null;
  if (q) {
    let best: { name: string; distance: number } | null = null;
    for (const t of REFERENCE_TAXA) {
      const d = levenshtein(q, t.binomial.toLowerCase(), best ? best.distance : 3);
      if (!best || d < best.distance) best = { name: t.name, distance: d };
    }
    if (best && best.distance <= 3) out = { ...best, exact: best.distance === 0 && key === best.name.toLowerCase() };
  }
  MATCH_CACHE.set(key, out);
  return out;
}

// ---------------- import pipeline ----------------
export type IssueKind = "dms" | "inverted" | "taxon" | "elevation";
export interface Issue { kind: IssueKind; message: string }
export interface ImportRow {
  id: number;
  taxon: string;
  collector: string;
  date: string;
  coordsRaw: string;
  lat: number | null;
  lng: number | null;
  elevation: number | null;
  locality: string;
  issues: Issue[];
}

// Rough Central-Asia plausibility fence (Uzbekistan + neighbours)
const FENCE = { minLat: 36, maxLat: 47, minLng: 55, maxLng: 75 };
const inFence = (lat: number, lng: number) => lat >= FENCE.minLat && lat <= FENCE.maxLat && lng >= FENCE.minLng && lng <= FENCE.maxLng;
const inKyzylkum = (lat: number, lng: number) =>
  lng >= KYZYLKUM_BOX.minLng && lng <= KYZYLKUM_BOX.maxLng && lat >= KYZYLKUM_BOX.minLat && lat <= KYZYLKUM_BOX.maxLat;

export function analyseRow(row: Omit<ImportRow, "issues" | "lat" | "lng"> & { lat?: number | null; lng?: number | null }): ImportRow {
  const issues: Issue[] = [];
  let lat = row.lat ?? null, lng = row.lng ?? null;
  const raw = row.coordsRaw ?? "";
  if (lat == null || lng == null) {
    const dms = parseDMSPair(raw);
    if (dms) {
      lat = dms.lat; lng = dms.lng;
      issues.push({ kind: "dms", message: `DMS format → ${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    } else {
      const dec = parseDecimalPair(raw);
      if (dec) { lat = dec.lat; lng = dec.lng; }
    }
  }
  if (lat != null && lng != null && !inFence(lat, lng) && inFence(lng, lat)) {
    issues.push({ kind: "inverted", message: `Lat/Lng inverted: (${lat}, ${lng}) is outside the Central-Asia geo-fence` });
  }
  const m = matchTaxon(row.taxon);
  if (m && !m.exact) issues.push({ kind: "taxon", message: `"${row.taxon}" → "${m.name}" (IPNI, edit distance ${m.distance})` });
  if (row.elevation != null && lat != null && lng != null) {
    const [la, ln] = issues.some((i) => i.kind === "inverted") ? [lng, lat] : [lat, lng];
    if (inKyzylkum(la, ln) && row.elevation > KYZYLKUM_BOX.maxElev)
      issues.push({ kind: "elevation", message: `${row.elevation} m is impossible in Kyzylkum (max ≈ ${KYZYLKUM_BOX.maxElev} m)` });
  }
  return { ...row, lat, lng, elevation: row.elevation, issues };
}

export function fixIssue(row: ImportRow, kind: IssueKind): ImportRow {
  const r = { ...row, issues: row.issues.filter((i) => i.kind !== kind) };
  if (kind === "inverted" && r.lat != null && r.lng != null) [r.lat, r.lng] = [r.lng, r.lat];
  if (kind === "taxon") { const m = matchTaxon(row.taxon); if (m) r.taxon = m.name; }
  if (kind === "elevation" && r.elevation != null) {
    // Most common legacy error: value entered in feet or with an extra digit; clamp to plausible local DEM maximum.
    r.elevation = Math.min(Math.round(r.elevation / 10), KYZYLKUM_BOX.maxElev);
  }
  return r;
}

export function fixAll(rows: ImportRow[]): ImportRow[] {
  const order: IssueKind[] = ["inverted", "dms", "taxon", "elevation"];
  return rows.map((r) => order.reduce((acc, k) => (acc.issues.some((i) => i.kind === k) ? fixIssue(acc, k) : acc), r));
}

export const SAMPLE_LEGACY: Omit<ImportRow, "issues" | "lat" | "lng">[] = [
  { id: 1, taxon: "Tulipa greigii Regel", collector: "A.I. Vvedensky", date: "1932-05-02", coordsRaw: `41°38'15.0"N 69°54'10.2"E`, elevation: 1520, locality: "Chimgan, upper Ugam" },
  { id: 2, taxon: "Allium pskemense B.Fedtsch.", collector: "A.I. Vvedensky", date: "1932-06-14", coordsRaw: "69.8521, 41.2410", elevation: 2100, locality: "Pskem valley" },
  { id: 3, taxon: "Tulipa greigi", collector: "M.G. Popov", date: "1928-04-22", coordsRaw: "41.5483, 70.0148", elevation: 1430, locality: "Chatkal foothill" },
  { id: 4, taxon: "Haloxylon ammodendron (C.A.Mey.) Bunge ex Fenzl", collector: "M.G. Popov", date: "1929-10-03", coordsRaw: "41.0872, 63.2245", elevation: 3500, locality: "Central Kyzylkum dunes" },
  { id: 5, taxon: "Ungernia victoris Vved.", collector: "P.K. Zakirov", date: "1957-09-09", coordsRaw: `38°39'40.3"N 67°55'02.6"E`, elevation: 1180, locality: "Hissar, Kyzylsu gorge" },
  { id: 6, taxon: "Fritilaria eduardii", collector: "E.A. Regel", date: "1883-05-30", coordsRaw: "38.7421, 68.8517", elevation: 1650, locality: "Hissar range" },
  { id: 7, taxon: "Rheum maximowiczii Losinsk.", collector: "P.K. Zakirov", date: "1958-07-11", coordsRaw: "68.4129, 39.3318", elevation: 2780, locality: "Zeravshan range" },
  { id: 8, taxon: "Ferula assa-foetida L.", collector: "M.G. Popov", date: "1925-05-21", coordsRaw: "40.2214, 64.5821", elevation: 310, locality: "Kyzylkum, takyr" },
];
