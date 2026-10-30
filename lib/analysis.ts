import { Specimen } from "./data";

export type Category = "lost" | "new" | "up" | "down" | "stable";

export interface SpeciesChange {
  binomial: string;
  family: string;
  nA: number;
  nB: number;
  shareA: number;
  shareB: number;
  category: Category;
  /** change in share, in percentage points */
  delta: number;
  byDecade: Record<number, number>;
}

export interface DecadeStat { decade: number; records: number; species: number }

export const decadeOf = (y: number) => (y < 1900 ? 1890 : Math.floor(y / 10) * 10);

export function decadeStats(specs: Specimen[]): DecadeStat[] {
  const map = new Map<number, { n: number; sp: Set<string> }>();
  for (const s of specs) {
    if (!s.year) continue;
    const d = decadeOf(s.year);
    const e = map.get(d) ?? { n: 0, sp: new Set<string>() };
    e.n++; e.sp.add(s.binomial); map.set(d, e);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([decade, e]) => ({ decade, records: e.n, species: e.sp.size }));
}

export interface Period { from: number; to: number }

export function compare(specs: Specimen[], A: Period, B: Period): { rows: SpeciesChange[]; totalA: number; totalB: number } {
  const inP = (s: Specimen, p: Period) => s.year >= p.from && s.year <= p.to;
  const a = specs.filter((s) => s.year && inP(s, A));
  const b = specs.filter((s) => s.year && inP(s, B));
  const totalA = a.length, totalB = b.length;
  const info = new Map<string, { family: string; nA: number; nB: number; dec: Record<number, number> }>();
  const touch = (s: Specimen) => info.get(s.binomial) ?? (info.set(s.binomial, { family: s.family, nA: 0, nB: 0, dec: {} }), info.get(s.binomial)!);
  for (const s of a) touch(s).nA++;
  for (const s of b) touch(s).nB++;
  for (const s of specs) if (s.year) { const e = info.get(s.binomial); if (e) { const d = decadeOf(s.year); e.dec[d] = (e.dec[d] ?? 0) + 1; } }
  const rows: SpeciesChange[] = [];
  for (const [binomial, e] of info) {
    const shareA = totalA ? e.nA / totalA : 0, shareB = totalB ? e.nB / totalB : 0;
    let category: Category = "stable";
    if (e.nA >= 2 && e.nB === 0) category = "lost";
    else if (e.nA === 0 && e.nB >= 2) category = "new";
    else if (e.nA + e.nB >= 4 && shareA > 0 && shareB / shareA >= 1.5) category = "up";
    else if (e.nA + e.nB >= 4 && shareB > 0 && shareA / shareB >= 1.5) category = "down";
    else if (e.nA + e.nB >= 4 && shareA > 0 && shareB === 0) category = "down";
    else if (e.nA + e.nB >= 4 && shareB > 0 && shareA === 0) category = "up";
    rows.push({ binomial, family: e.family, nA: e.nA, nB: e.nB, shareA, shareB, category, delta: (shareB - shareA) * 100, byDecade: e.dec });
  }
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || y.nA + y.nB - (x.nA + x.nB));
  return { rows, totalA, totalB };
}

// viridis-like colour ramp for decades
const STOPS: [number, [number, number, number]][] = [[1850, [68, 1, 84]], [1920, [59, 82, 139]], [1960, [33, 145, 140]], [1990, [94, 201, 98]], [2025, [253, 231, 37]]];
export function yearColor(y: number): string {
  const v = Math.max(1850, Math.min(2025, y));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [y0, c0] = STOPS[i], [y1, c1] = STOPS[i + 1];
    if (v <= y1) { const t = (v - y0) / (y1 - y0); return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(",")})`; }
  }
  return "rgb(253,231,37)";
}
export const RAMP_CSS = `linear-gradient(90deg, ${STOPS.map(([y, c]) => `rgb(${c.join(",")}) ${Math.round(((y - 1850) / 175) * 100)}%`).join(", ")})`;

export type ColorMode = "decade" | "iucn" | "change";
export const CHANGE_COLOR: Record<Category, string> = { lost: "#DC2626", down: "#EA580C", stable: "#9CA3AF", up: "#16A34A", new: "#0F766E" };
/** Marker colours for the map's "Conservation status" mode (also used by the legend). */
export const IUCN_MAP_COLOR: Record<string, string> = { CR: "#b91c1c", EN: "#ea580c", VU: "#ca8a04", NT: "#65a30d", LC: "#15803d", DD: "#475569", NE: "#94a3b8" };

/** Per-species trend between the periods before and from `split`. */
export function speciesTrend(specs: Specimen[], split: number): Map<string, Category> {
  const { rows } = compare(specs, { from: 1700, to: split - 1 }, { from: split, to: 2100 });
  return new Map(rows.map((r) => [r.binomial, r.category]));
}

export interface ChangeCell { lng: number; lat: number; score: number; lost: number; fresh: number; nA: number; nB: number; species: number }

/** 1° cells: species recorded only before `split` count as lost, only from `split` as new. score ∈ [-1, 1]. */
export function changeGrid(specs: Specimen[], split: number, size = 1, minRecords = 3): ChangeCell[] {
  const cells = new Map<string, { lng: number; lat: number; a: Map<string, number>; b: Map<string, number> }>();
  for (const s of specs) {
    if (!s.year || !isFinite(s.lat) || !isFinite(s.lng)) continue;
    const lng = Math.floor(s.lng / size) * size, lat = Math.floor(s.lat / size) * size;
    const k = `${lng}|${lat}`;
    const c = cells.get(k) ?? { lng, lat, a: new Map<string, number>(), b: new Map<string, number>() };
    const m = s.year < split ? c.a : c.b;
    m.set(s.binomial, (m.get(s.binomial) ?? 0) + 1);
    cells.set(k, c);
  }
  const out: ChangeCell[] = [];
  for (const c of cells.values()) {
    const nA = [...c.a.values()].reduce((x, y) => x + y, 0), nB = [...c.b.values()].reduce((x, y) => x + y, 0);
    if (nA + nB < minRecords) continue;
    const all = new Set([...c.a.keys(), ...c.b.keys()]);
    let lost = 0, fresh = 0;
    for (const sp of all) { const inA = c.a.has(sp), inB = c.b.has(sp); if (inA && !inB) lost++; else if (inB && !inA) fresh++; }
    out.push({ lng: c.lng, lat: c.lat, lost, fresh, nA, nB, species: all.size, score: (fresh - lost) / all.size });
  }
  return out;
}
