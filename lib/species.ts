import type { Specimen } from "@/lib/data";

export interface Species {
  binomial: string; family: string; authority: string; rep: Specimen; count: number;
  minYear: number; maxYear: number; countries: string[]; iucn: Specimen["iucn"]; haystack: string;
}

/** Group specimens into one entry per species (representative image, year range, countries, IUCN). */
export function groupSpecies(all: Specimen[]): Species[] {
  const m = new Map<string, Species & { cset: Set<string> }>();
  for (const s of all) {
    let g = m.get(s.binomial);
    if (!g) { g = { binomial: s.binomial, family: s.family, authority: s.authority, rep: s, count: 0, minYear: 9999, maxYear: 0, countries: [], cset: new Set(), iucn: s.iucn, haystack: "" }; m.set(s.binomial, g); }
    g.count++;
    if (s.year) { g.minYear = Math.min(g.minYear, s.year); g.maxYear = Math.max(g.maxYear, s.year); }
    if (s.country) g.cset.add(s.country);
    if (!g.rep.image && s.image) g.rep = s;
    if (g.iucn === "NE" && s.iucn !== "NE") g.iucn = s.iucn;
  }
  return Array.from(m.values()).map((g) => ({ ...g, countries: Array.from(g.cset), haystack: [g.binomial, g.family, g.authority, ...g.cset].join(" ").toLowerCase() })).sort((a, b) => b.count - a.count);
}
