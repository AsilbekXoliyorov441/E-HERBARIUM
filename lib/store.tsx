"use client";
import { createContext, useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fromGbif, GbifRecord, IUCN, Specimen } from "@/lib/data";
import { setReferenceTaxa } from "@/lib/geo";
import { availableCounts, loadMore, md5 } from "@/lib/gbif";
import type { PlotPoint } from "@/components/MapView";
import type { ColorMode } from "@/lib/analysis";
import { groupSpecies } from "@/lib/species";
import type { Species } from "@/lib/species";

// Start downloading the dataset as soon as this module is evaluated (before React hydrates), without competing with the LCP image in <head>.
type DataFile = { records: GbifRecord[]; speciesPool?: number[]; generated?: string };
let dataPromise: Promise<DataFile> | null = null;
const loadData = () => (dataPromise ??= fetch("/data/gbif-specimens.json").then((r) => r.json() as Promise<DataFile>));
if (typeof window !== "undefined") setTimeout(() => { loadData().catch(() => { dataPromise = null; }); }, 0);

export type Tab = "home" | "atlas" | "dynamics" | "import" | "specimen";

export function pointInPoly(pt: [number, number], poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

type Years = [number, number];
type Poly = [number, number][] | null;

// The state is split into three contexts by how often it changes, so e.g. the time-lapse (years tick) does not re-render
// components that only need navigation or the dataset.
interface DataState {
  all: Specimen[];
  pool: number[];
  loadMsg: string;
  loadingMore: boolean;
  /** snapshot size/date and what GBIF holds for our region (null until fetched) */
  meta: { generated: string; base: number };
  available: { region: number; loadable: number } | null;
  countries: string[];
  /** one entry per species (memoised once for all search UIs) */
  species: Species[];
  loadMoreRecords: () => Promise<void>;
}
interface FilterState {
  q: string; setQ: (v: string) => void;
  iucn: IUCN[]; setIucn: React.Dispatch<React.SetStateAction<IUCN[]>>;
  country: string; setCountry: (v: string) => void;
  years: Years; setYears: (v: Years) => void;
  poly: Poly; setPoly: (v: Poly) => void;
  plotted: PlotPoint[]; setPlotted: (v: PlotPoint[]) => void;
  colorBy: ColorMode; setColorBy: (v: ColorMode) => void;
  split: number; setSplit: (v: number) => void;
  filtered: Specimen[];
  downloadCsv: () => void;
  showChangeOnMap: (split: number) => void;
  showSpeciesOnMap: (binomial: string) => void;
}
interface UiState {
  tab: Tab;
  searchOpen: boolean; setSearchOpen: (v: boolean) => void;
  dataOpen: boolean; setDataOpen: (v: boolean) => void;
  selected: string | null; setSelected: (v: string | null) => void;
  go: (tab: Tab) => void;
  openSpecimen: (id: string) => void;
}
type AppState = DataState & FilterState & UiState;

const DataCtx = createContext<DataState | null>(null);
const FilterCtx = createContext<FilterState | null>(null);
const UiCtx = createContext<UiState | null>(null);
const need = <T,>(v: T | null, name: string): T => { if (!v) throw new Error(`${name} outside AppProvider`); return v; };

export const useData = () => need(useContext(DataCtx), "useData");
export const useFilters = () => need(useContext(FilterCtx), "useFilters");
export const useUi = () => need(useContext(UiCtx), "useUi");
export const useSpecies = () => useData().species;
/** Everything at once (subscribes to all three contexts). Prefer the narrower hooks in hot components. */
export const useApp = (): AppState => {
  const d = useData(), f = useFilters(), u = useUi();
  return useMemo(() => ({ ...d, ...f, ...u }), [d, f, u]);
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = pathname.startsWith("/atlas") ? "atlas" : pathname.startsWith("/dynamics") ? "dynamics" : pathname.startsWith("/import") ? "import" : pathname.startsWith("/specimen") ? "specimen" : "home";

  const [all, setAll] = useState<Specimen[]>([]);
  const [pool, setPool] = useState<number[]>([]);
  const [loadMsg, setLoadMsg] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [iucn, setIucn] = useState<IUCN[]>([]);
  const [country, setCountry] = useState("All");
  const [years, setYears] = useState<Years>([1840, 2026]);
  const [poly, setPoly] = useState<Poly>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [plotted, setPlotted] = useState<PlotPoint[]>([]);
  const [colorBy, setColorBy] = useState<ColorMode>("decade");
  const [split, setSplit] = useState(1970);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [meta, setMeta] = useState({ generated: "", base: 0 });
  const [available, setAvailable] = useState<{ region: number; loadable: number } | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected; // lets `go` stay referentially stable

  useEffect(() => {
    loadData()
      .then((d) => {
        const recs = d.records.map(fromGbif); setAll(recs); setReferenceTaxa(recs); setPool(d.speciesPool ?? []);
        setMeta({ generated: d.generated ?? "", base: recs.length });
        try { const c = sessionStorage.getItem("gbif-available"); if (c) { setAvailable(JSON.parse(c)); return; } } catch { /* no storage */ }
        // the "available on GBIF" count is secondary: ask for it a few seconds later so it never competes with images
        setTimeout(() => availableCounts(d.speciesPool ?? []).then((a) => { if (a) { setAvailable(a); try { sessionStorage.setItem("gbif-available", JSON.stringify(a)); } catch { /* ignore */ } } }), 3500);
      })
      .catch(() => setLoadMsg("GBIF"));
  }, []);

  // grouping specimens into species is cheap (~1 ms per 1k specimens), so it is memoised here once instead of in each search component
  const species = useMemo(() => groupSpecies(all), [all]);

  const countries = useMemo(() => Array.from(new Set(all.map((s) => s.country))).sort(), [all]);

  // typing in the atlas search stays responsive: filtering follows a deferred copy of the query
  const dq = useDeferredValue(q);
  const filtered = useMemo(() => {
    const tt = dq.toLowerCase();
    return all.filter((s) => {
      if (tt && ![s.binomial, s.family, s.collector, s.tashBarcode, s.region, s.locality ?? "", s.institution ?? ""].some((v) => v.toLowerCase().includes(tt))) return false;
      if (iucn.length && !iucn.includes(s.iucn)) return false;
      if (country !== "All" && s.country !== country) return false;
      if (s.year && (s.year < years[0] || s.year > years[1])) return false;
      if (poly && !pointInPoly([s.lng, s.lat], poly)) return false;
      return true;
    });
  }, [all, dq, iucn, country, years, poly]);

  const go = useCallback((t: Tab) => {
    const sel = selectedRef.current;
    router.push(t === "home" ? "/" : t === "specimen" ? (sel ? `/specimen/${encodeURIComponent(sel)}` : "/specimen") : `/${t}`);
  }, [router]);
  const openSpecimen = useCallback((id: string) => { setSelected(id); router.push(`/specimen/${encodeURIComponent(id)}`); }, [router]);

  const downloadCsv = useCallback(() => {
    const cols: (keyof Specimen)[] = ["tashBarcode", "binomial", "authority", "family", "typeStatus", "iucn", "collector", "date", "year", "country", "region", "lat", "lng", "elevation", "locality", "institution", "license", "rightsHolder", "gbifUrl", "image"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...filtered.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "tash_specimens.csv"; a.click(); URL.revokeObjectURL(url);
  }, [filtered]);

  const loadMoreRecords = useCallback(async () => {
    if (loadingMore || !pool.length) return;
    setLoadingMore(true);
    try {
      const exclude = new Set(all.map((s) => s.gbifKey).filter((k): k is number => !!k));
      const recs = await loadMore(1000, exclude, pool, (n) => setLoadMsg(`${n} / 1000`));
      recs.forEach((r) => (r.mediaHash = md5(r.image)));
      setAll((prev) => [...prev, ...recs.map(fromGbif)]);
    } finally { setLoadingMore(false); setLoadMsg(""); }
  }, [loadingMore, pool, all]);

  const showChangeOnMap = useCallback((sp: number) => {
    setQ(""); setIucn([]); setCountry("All"); setPoly(null); setYears([1840, 2026]); setSplit(Math.min(2010, Math.max(1900, sp))); setColorBy("change"); router.push("/atlas");
  }, [router]);
  const showSpeciesOnMap = useCallback((binomial: string) => {
    setQ(binomial); setIucn([]); setCountry("All"); setPoly(null); setYears([1840, 2026]); setColorBy("decade"); router.push("/atlas");
  }, [router]);

  const dataValue = useMemo<DataState>(() => ({ all, pool, loadMsg, loadingMore, meta, available, countries, species, loadMoreRecords }), [all, pool, loadMsg, loadingMore, meta, available, countries, species, loadMoreRecords]);
  const filterValue = useMemo<FilterState>(() => ({ q, setQ, iucn, setIucn, country, setCountry, years, setYears, poly, setPoly, plotted, setPlotted, colorBy, setColorBy, split, setSplit, filtered, downloadCsv, showChangeOnMap, showSpeciesOnMap }), [q, iucn, country, years, poly, plotted, colorBy, split, filtered, downloadCsv, showChangeOnMap, showSpeciesOnMap]);
  const uiValue = useMemo<UiState>(() => ({ tab, searchOpen, setSearchOpen, dataOpen, setDataOpen, selected, setSelected, go, openSpecimen }), [tab, searchOpen, dataOpen, selected, go, openSpecimen]);

  return (
    <UiCtx.Provider value={uiValue}>
      <DataCtx.Provider value={dataValue}>
        <FilterCtx.Provider value={filterValue}>{children}</FilterCtx.Provider>
      </DataCtx.Provider>
    </UiCtx.Provider>
  );
}
