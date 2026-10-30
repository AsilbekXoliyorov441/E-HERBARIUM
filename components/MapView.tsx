"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Specimen, REGIONS, UZ_BORDER } from "@/lib/data";
import { toDMS, toUTM, utmZone } from "@/lib/geo";
import { RAMP_CSS, ColorMode, CHANGE_COLOR, IUCN_MAP_COLOR, changeGrid, speciesTrend, yearColor } from "@/lib/analysis";
import { useLang } from "@/lib/i18n";

import { AnimatePresence, motion } from "framer-motion";
import MapHoverCard, { HoverInfo } from "@/components/MapHoverCard";
import { ChevronDown, ChevronUp, Compass, Crosshair, Home, Layers, MapPin, Minus, Mountain, Navigation, PenTool, Plus, Trash2 } from "lucide-react";

export type BaseLayer = "satellite" | "topo" | "dark" | "light";
export interface PlotPoint { id: string; lat: number; lng: number; label: string }

interface Props {
  specimens: Specimen[];
  selectedId: string | null;
  focus: Specimen | null;
  active: boolean;
  onSelect: (id: string) => void;
  onPolygon: (poly: [number, number][] | null) => void;
  plotted: PlotPoint[];
  colorBy: ColorMode;
  split: number;
}

const TILES: Record<BaseLayer, { tiles: string[]; attribution: string; maxzoom: number; label: string }> = {
  satellite: { tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri World Imagery", maxzoom: 14, label: "Satellite" },
  topo: { tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], attribution: "© OpenTopoMap (CC-BY-SA)", maxzoom: 14, label: "Topographic" },
  dark: { tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"], attribution: "© CARTO © OSM", maxzoom: 19, label: "Dark" },
  light: { tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"], attribution: "© CARTO © OSM", maxzoom: 19, label: "Light" },
};

const EMPTY_GRID: import("@/lib/analysis").ChangeCell[] = [];
const PANEL = "rounded-2xl bg-white shadow-[0_8px_28px_rgba(6,40,29,.28)] ring-1 ring-black/10";
const BASE_LABEL: Record<BaseLayer, { uz: string; en: string }> = { satellite: { uz: "Sun’iy yo‘ldosh", en: "Satellite" }, topo: { uz: "Topografik", en: "Topo" }, dark: { uz: "Qorong‘i", en: "Dark" }, light: { uz: "Yorug‘", en: "Light" } };

function ToolBtn({ icon: Icon, label, onClick, on = false, tone = "green", chevron = false }: { icon: React.ElementType; label: string; onClick: () => void; on?: boolean; tone?: "green" | "cyan" | "rose"; chevron?: boolean }) {
  const active = tone === "cyan" ? "bg-cyan-700 text-white" : "bg-[#14573a] text-white";
  const idle = tone === "rose" ? "bg-white text-rose-700 hover:bg-rose-50" : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-900";
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick} aria-pressed={on} className={`${on ? active : idle} flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold shadow-[0_8px_28px_rgba(6,40,29,.22)] ring-1 ring-black/10 transition-colors`}>
      <Icon size={15} aria-hidden /><span className="hidden sm:inline">{label}</span>{chevron && <ChevronDown size={13} className={`transition-transform ${on ? "rotate-180" : ""}`} />}
    </motion.button>
  );
}
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} title={label} aria-label={label} className="grid h-10 w-10 place-items-center border-b border-slate-100 text-slate-700 transition last:border-0 hover:bg-emerald-50 hover:text-emerald-900 active:bg-emerald-100">{children}</button>;
}

const IUCN_COLOR = IUCN_MAP_COLOR;

function inPoly(pt: [number, number], poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export { inPoly };

const toFC = (specs: Specimen[], colorBy: ColorMode, trend?: Map<string, import("@/lib/analysis").Category>) => ({
  type: "FeatureCollection" as const,
  features: specs.map((s) => ({
    type: "Feature" as const,
    properties: { id: s.id, name: s.binomial, color: colorBy === "change" ? CHANGE_COLOR[trend?.get(s.binomial) ?? "stable"] : colorBy === "decade" && s.year ? yearColor(s.year) : IUCN_COLOR[s.iucn] ?? "#64748b" },
    geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
  })),
});

export default function MapView({ specimens, selectedId, focus, active, onSelect, onPolygon, plotted, colorBy, split }: Props) {
  const { t, lang } = useLang();
  const colorRef = useRef(colorBy);
  colorRef.current = colorBy;
  const splitRef = useRef(split);
  splitRef.current = split;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const drawRef = useRef<{ on: boolean; pts: [number, number][] }>({ on: false, pts: [] });
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverId = useRef<string | null>(null);
  const [base, setBase] = useState<BaseLayer>("satellite");
  const [terrain, setTerrain] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [hasPoly, setHasPoly] = useState(false);
  const [hud, setHud] = useState({ lat: 41.548291, lng: 70.014822, elev: null as number | null });
  const [profile, setProfile] = useState<number[]>([]);
  const specsRef = useRef(specimens);
  specsRef.current = specimens;

  const updateProfile = useCallback(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    const cv = m.getCanvas();
    const w = cv.clientWidth, h = cv.clientHeight;
    const out: number[] = [];
    for (let i = 0; i <= 60; i++) {
      const ll = m.unproject([w * (0.05 + (0.9 * i) / 60), h * 0.55]);
      out.push(m.queryTerrainElevation(ll) ?? 0);
    }
    setProfile(out);
  }, []);

  const syncDraw = useCallback(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    const pts = drawRef.current.pts;
    const src = m.getSource("draw") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: [
        ...(pts.length > 2 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [[...pts, pts[0]]] } }] : []),
        ...(pts.length > 1 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: pts } }] : []),
        ...pts.map((p) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: p } })),
      ],
    });
  }, []);

  // init
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const style: maplibregl.StyleSpecification = {
      version: 8,
      glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
      sources: {
        base: { type: "raster", tiles: TILES.satellite.tiles, tileSize: 256, maxzoom: TILES.satellite.maxzoom, attribution: TILES.satellite.attribution },
        dem: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 15, encoding: "terrarium", attribution: "AWS Terrain Tiles" },
      },
      layers: [{ id: "base", type: "raster", source: "base" }],
    };
    const map = new maplibregl.Map({
      container: el.current, style, center: [67.5, 42.5], zoom: 3.55, pitch: 0, bearing: 0, maxPitch: 85, maxZoom: 15,
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __map: maplibregl.Map }).__map = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      map.setTerrain({ source: "dem", exaggeration: 1.6 });
      map.setSky({ "sky-color": "#6fa8dc", "sky-horizon-blend": 0.5, "horizon-color": "#f3e9d8", "horizon-fog-blend": 0.6, "fog-color": "#e9dfcb", "fog-ground-blend": 0.2, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 10, 1, 12, 0] });
      map.addSource("uz", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [UZ_BORDER] } } });
      map.addLayer({ id: "uz-fill", type: "fill", source: "uz", paint: { "fill-color": "#B45309", "fill-opacity": 0.05 } });
      map.addLayer({ id: "uz-line", type: "line", source: "uz", paint: { "line-color": "#f4c26b", "line-width": 1.6, "line-dasharray": [3, 2] } });
      map.addSource("borders", { type: "geojson", data: "/data/borders.geojson" });
      map.addLayer({ id: "borders-casing", type: "line", source: "borders", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#000", "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.5, 10, 6] } });
      map.addLayer({ id: "borders-line", type: "line", source: "borders", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffd23f", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 10, 3] } });
      map.addSource("change", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "change-fill", type: "fill", source: "change", layout: { visibility: "none" }, paint: { "fill-color": ["interpolate", ["linear"], ["get", "score"], -1, "#b91c1c", -0.4, "#f87171", 0, "#e5e7eb", 0.4, "#86efac", 1, "#15803d"], "fill-opacity": 0.55 } });
      map.addLayer({ id: "change-line", type: "line", source: "change", layout: { visibility: "none" }, paint: { "line-color": "#ffffff", "line-opacity": 0.55, "line-width": 0.8 } });
      map.addSource("specimens", { type: "geojson", data: toFC(specsRef.current, colorRef.current),  });
      map.addLayer({ id: "sp-halo", type: "circle", source: "specimens", paint: { "circle-radius": 10, "circle-color": ["get", "color"], "circle-opacity": 0.3, "circle-pitch-alignment": "viewport" } });
      map.addLayer({ id: "sp-dot", type: "circle", source: "specimens", paint: { "circle-radius": 5.5, "circle-color": ["get", "color"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.4, "circle-pitch-alignment": "viewport" } });
      map.addLayer({ id: "sp-label", type: "symbol", source: "specimens", minzoom: 8, layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.4], "text-anchor": "top", "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#fff", "text-halo-color": "#0F3D23", "text-halo-width": 1.5 } });
      map.addSource("plotted", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "plot-dot", type: "circle", source: "plotted", paint: { "circle-radius": 7, "circle-color": "#22d3ee", "circle-stroke-color": "#fff", "circle-stroke-width": 2, "circle-pitch-alignment": "viewport" } });
      map.addSource("draw", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "draw-fill", type: "fill", source: "draw", filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#22d3ee", "fill-opacity": 0.18 } });
      map.addLayer({ id: "draw-line", type: "line", source: "draw", filter: ["==", "$type", "LineString"], paint: { "line-color": "#22d3ee", "line-width": 2 } });
      map.addLayer({ id: "draw-pt", type: "circle", source: "draw", filter: ["==", "$type", "Point"], paint: { "circle-radius": 4, "circle-color": "#fff", "circle-stroke-color": "#0891b2", "circle-stroke-width": 2 } });
      readyRef.current = true;
      (map.getSource("specimens") as maplibregl.GeoJSONSource).setData(toFC(specsRef.current, colorRef.current));
      updateProfile();
    });

    let hudRaf = 0;
    map.on("mousemove", (e) => {
      if (hudRaf) return;
      hudRaf = requestAnimationFrame(() => { hudRaf = 0; setHud({ lat: e.lngLat.lat, lng: e.lngLat.lng, elev: map.queryTerrainElevation(e.lngLat) }); });
    });
    let pt: ReturnType<typeof setTimeout>;
    map.on("moveend", () => { clearTimeout(pt); pt = setTimeout(updateProfile, 400); });
    map.once("idle", updateProfile);
    map.on("click", (e) => {
      if (drawRef.current.on) {
        drawRef.current.pts.push([e.lngLat.lng, e.lngLat.lat]);
        syncDraw();
        return;
      }
      const f = map.queryRenderedFeatures(e.point, { layers: ["sp-dot", "sp-halo"] })[0];
      if (!f && map.getLayoutProperty("change-fill", "visibility") === "visible") {
        const c = map.queryRenderedFeatures(e.point, { layers: ["change-fill"] })[0];
        if (c) {
          const p = c.properties as Record<string, number>;
          new maplibregl.Popup({ closeButton: true, maxWidth: "240px" }).setLngLat(e.lngLat).setHTML(`<div style="font:12px Inter,system-ui,sans-serif;line-height:1.5;color:#16231c"><b>${p.species} species · ${p.nA + p.nB} records</b><br/><span style="color:#b91c1c">Only before: ${p.lost}</span> · <span style="color:#15803d">Only after: ${p.fresh}</span><br/>Records before / after: ${p.nA} / ${p.nB}</div>`).addTo(map);
          return;
        }
      }
      if (f) {
        const id = f.properties!.id as string;
        onSelectRef.current(id);
        const s = specsRef.current.find((x) => x.id === id);
        if (s) map.flyTo({ center: [s.lng, s.lat], zoom: 12.5, pitch: 50, bearing: 20, duration: 2800, essential: true });
      }
    });
    map.on("dblclick", (e) => {
      if (!drawRef.current.on) return;
      e.preventDefault();
      const pts = drawRef.current.pts;
      drawRef.current.on = false;
      setDrawing(false);
      map.getCanvas().style.cursor = "";
      if (pts.length >= 3) { setHasPoly(true); onPolygonRef.current([...pts]); }
      else { drawRef.current.pts = []; syncDraw(); }
    });
    // hover preview: small delay so sweeping the cursor across the map doesn't flicker cards
    const clearHover = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); hoverTimer.current = null; hoverId.current = null; setHover(null); };
    map.on("mouseenter", "sp-dot", () => { if (!drawRef.current.on) map.getCanvas().style.cursor = "pointer"; });
    map.on("mousemove", "sp-dot", (e) => {
      if (drawRef.current.on) return;
      const f = e.features?.[0];
      const id = f?.properties?.id as string | undefined;
      if (!id || id === hoverId.current) return;
      hoverId.current = id;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => {
        const sp = specsRef.current.find((x) => x.id === id);
        if (!sp || hoverId.current !== id) return;
        const p = map.project([sp.lng, sp.lat]);
        setHover({ s: sp, x: p.x, y: p.y, w: map.getContainer().clientWidth });
      }, 90);
    });
    map.on("mouseleave", "sp-dot", () => { if (!drawRef.current.on) map.getCanvas().style.cursor = ""; clearHover(); });
    map.on("movestart", clearHover);
    map.on("click", clearHover);
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); map.remove(); mapRef.current = null; readyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    let raf = 0;
    const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; setBearing(m.getBearing()); }); };
    m.on("rotate", on);
    return () => { m.off("rotate", on); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;
  const onPolygonRef = useRef(onPolygon); onPolygonRef.current = onPolygon;

  // data sync
  // "change" colouring is computed only in that mode and memoised on the filtered set
  const trend = useMemo(() => (colorBy === "change" ? speciesTrend(specimens, split) : undefined), [specimens, colorBy, split]);
  const grid = useMemo(() => (colorBy === "change" ? changeGrid(specimens, split) : EMPTY_GRID), [specimens, colorBy, split]);
  useEffect(() => {
    const push = () => {
      const m = mapRef.current; if (!m || !readyRef.current) return false;
      (m.getSource("specimens") as maplibregl.GeoJSONSource).setData(toFC(specimens, colorBy, trend));
      (m.getSource("change") as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: grid.map((c) => ({ type: "Feature" as const, properties: { score: c.score, lost: c.lost, fresh: c.fresh, nA: c.nA, nB: c.nB, species: c.species }, geometry: { type: "Polygon" as const, coordinates: [[[c.lng, c.lat], [c.lng + 1, c.lat], [c.lng + 1, c.lat + 1], [c.lng, c.lat + 1], [c.lng, c.lat]]] } })),
      });
      const vis = colorBy === "change" ? "visible" : "none";
      m.setLayoutProperty("change-fill", "visibility", vis); m.setLayoutProperty("change-line", "visibility", vis);
      return true;
    };
    if (push()) return;
    const t = setInterval(() => { if (push()) clearInterval(t); }, 300);
    return () => clearInterval(t);
  }, [specimens, colorBy, trend, grid]);

  useEffect(() => {
    const m = mapRef.current;
    const apply = () => (m?.getSource("plotted") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: plotted.map((p) => ({ type: "Feature", properties: { label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
    });
    if (readyRef.current) apply();
    if (plotted.length && m) {
      const b = new maplibregl.LngLatBounds();
      plotted.forEach((p) => b.extend([p.lng, p.lat]));
      m.fitBounds(b, { padding: 120, pitch: 55, duration: 2600, maxZoom: 10 });
    }
  }, [plotted]);

  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    const s = TILES[base];
    const src = m.getSource("base") as maplibregl.RasterTileSource;
    // swap raster source tiles by rebuilding it
    m.removeLayer("base"); m.removeSource("base");
    m.addSource("base", { type: "raster", tiles: s.tiles, tileSize: 256, maxzoom: s.maxzoom, attribution: s.attribution });
    m.addLayer({ id: "base", type: "raster", source: "base" }, "uz-fill");
    void src;
  }, [base]);

  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    m.setTerrain(terrain ? { source: "dem", exaggeration: 1.6 } : null);
    if (!terrain) m.easeTo({ pitch: 0, bearing: 0 }); else m.easeTo({ pitch: 45, bearing: -10 });
  }, [terrain]);

  // HTML marker for the selected specimen: always on top of terrain, and shown even if the current filters hide it
  const focusMarker = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    focusMarker.current?.remove(); focusMarker.current = null;
    if (!focus) return;
    const el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:none";
    el.innerHTML = `<span style="margin-bottom:4px;padding:2px 8px;border-radius:999px;background:#0F3D23;color:#fff;font:600 12px Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.5)">${focus.binomial.replace(/[<>&]/g, "")}</span><span style="position:relative;display:block;width:22px;height:22px"><span style="position:absolute;inset:-10px;border-radius:50%;background:rgba(255,210,63,.35);border:3px solid #ffd23f"></span><span style="position:absolute;inset:0;border-radius:50%;background:#e11d48;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6)"></span></span>`;
    focusMarker.current = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, 11] }).setLngLat([focus.lng, focus.lat]).addTo(m);
    if (active) {
      m.resize();
      m.flyTo({ center: [focus.lng, focus.lat], zoom: 12.5, pitch: 50, bearing: 20, duration: 2800, essential: true });
    }
    return () => { focusMarker.current?.remove(); focusMarker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.id, active]);

  const startDraw = () => {
    drawRef.current = { on: true, pts: [] };
    setDrawing(true); setHasPoly(false); onPolygon(null); syncDraw();
    mapRef.current?.getCanvas().style.setProperty("cursor", "crosshair");
  };
  const clearDraw = () => { drawRef.current = { on: false, pts: [] }; setDrawing(false); setHasPoly(false); onPolygon(null); syncDraw(); if (mapRef.current) mapRef.current.getCanvas().style.cursor = ""; };

  const fly = (c: [number, number], z: number) => mapRef.current?.flyTo({ center: c, zoom: z, pitch: 60, bearing: -15, duration: 2400, essential: true });

  const utm = toUTM(hud.lat, hud.lng);
  const pmin = profile.length ? Math.min(...profile) : 0;
  const pmax = profile.length ? Math.max(...profile) : 1;
  const path = profile.map((v, i) => `${i === 0 ? "M" : "L"}${(i / 60) * 300},${58 - ((v - pmin) / Math.max(1, pmax - pmin)) * 50}`).join(" ");

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1d12]">
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      <AnimatePresence>{hover && <MapHoverCard key={hover.s.id} info={hover} />}</AnimatePresence>

      {/* top-left: basemap + tools */}
      <div className="absolute left-3 top-3 z-40 flex flex-col items-start gap-2">
        <div className={`${PANEL} flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`} role="group" aria-label="Basemap">
          <Layers size={14} className="mx-1.5 text-slate-400" aria-hidden />
          {(Object.keys(TILES) as BaseLayer[]).map((k) => (
            <button key={k} onClick={() => setBase(k)} aria-pressed={base === k} className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition sm:text-[13px] ${base === k ? "bg-[#14573a] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{BASE_LABEL[k][lang]}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ToolBtn on={terrain} onClick={() => setTerrain((v) => !v)} icon={Mountain} label={lang === "uz" ? "3D relyef" : "3D terrain"} />
          <ToolBtn on={drawing} onClick={drawing ? clearDraw : startDraw} icon={PenTool} label={drawing ? (lang === "uz" ? "Bekor qilish" : "Cancel") : t("atlas.polygon")} tone="cyan" />
          {hasPoly && <ToolBtn onClick={clearDraw} icon={Trash2} label={t("atlas.clear")} tone="rose" />}
          <div className="relative">
            <ToolBtn on={regionsOpen} onClick={() => setRegionsOpen((v) => !v)} icon={Compass} label={t("atlas.flyto")} chevron />
            <AnimatePresence>
              {regionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRegionsOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.14 }} className={`${PANEL} absolute left-0 top-full z-20 mt-2 max-h-[60vh] w-[270px] overflow-y-auto p-1.5`}>
                    {(["UZ", "ASIA"] as const).map((g) => (
                      <div key={g}>
                        <div className="px-2.5 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">{g === "UZ" ? (lang === "uz" ? "O‘zbekiston" : "Uzbekistan") : (lang === "uz" ? "Markaziy Osiyo" : "Central Asia")}</div>
                        {REGIONS.filter((r) => r.group === g).map((r) => (
                          <button key={r.name} onClick={() => { fly(r.center, r.zoom); setRegionsOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"><MapPin size={13} className="shrink-0 text-emerald-600" />{r.name}</button>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* drawing guide: unmistakable mode banner */}
      <AnimatePresence>
        {drawing && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="absolute bottom-[190px] left-3 right-3 z-40 flex items-center justify-between gap-3 rounded-full bg-cyan-700 py-2 pl-4 pr-2 text-[13px] font-semibold text-white shadow-xl lg:bottom-auto lg:left-1/2 lg:right-auto lg:top-3 lg:-translate-x-1/2 lg:text-[13.5px]">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" /></span>
            {lang === "uz" ? "Nuqtalarni bosing · tugatish uchun ikki marta bosing" : "Click to add points · double-click to finish"}
            <button onClick={clearDraw} className="rounded-full bg-white/20 px-3 py-1 text-[12.5px] hover:bg-white/30">{lang === "uz" ? "Bekor" : "Cancel"}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* right: zoom + compass */}
      <div className={`${PANEL} absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col overflow-hidden lg:flex`}>
        <IconBtn label={lang === "uz" ? "Kattalashtirish" : "Zoom in"} onClick={() => mapRef.current?.zoomIn({ duration: 300 })}><Plus size={17} /></IconBtn>
        <IconBtn label={lang === "uz" ? "Kichiklashtirish" : "Zoom out"} onClick={() => mapRef.current?.zoomOut({ duration: 300 })}><Minus size={17} /></IconBtn>
        <IconBtn label={lang === "uz" ? "Shimolga burish" : "Reset north"} onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: terrain ? 45 : 0, duration: 600 })}><Navigation size={16} style={{ transform: `rotate(${-bearing}deg)` }} className="text-[#14573a] transition-transform" /></IconBtn>
        <IconBtn label={lang === "uz" ? "Butun hudud" : "Whole region"} onClick={() => mapRef.current?.flyTo({ center: [67.5, 42.5], zoom: 3.55, pitch: 0, bearing: 0, duration: 1600 })}><Home size={16} /></IconBtn>
      </div>

      {/* bottom-left: cursor coordinates (expand for DMS/UTM) */}
      <div className={`${PANEL} absolute bottom-8 left-3 z-20 hidden text-[12.5px] lg:block`}>
        <button onClick={() => setHudOpen((v) => !v)} aria-expanded={hudOpen} title={t("hud.title")} className="flex items-center gap-3 px-3 py-2 font-mono text-slate-700">
          <Crosshair size={14} className="text-emerald-700" aria-hidden />
          <span className="tabular-nums">{Math.abs(hud.lat).toFixed(5)}° {hud.lat >= 0 ? "N" : "S"}, {Math.abs(hud.lng).toFixed(5)}° {hud.lng >= 0 ? "E" : "W"}</span>
          <span className="text-slate-300">|</span>
          <span className="tabular-nums">{hud.elev == null ? "—" : `${Math.round(hud.elev)} m`}</span>
          <ChevronUp size={13} className={`text-slate-400 transition-transform ${hudOpen ? "" : "rotate-180"}`} />
        </button>
        <AnimatePresence initial={false}>
          {hudOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-0.5 border-t border-slate-100 px-3 py-2 font-mono text-slate-600">
                <div><span className="text-slate-400">DMS </span>{toDMS(hud.lat, "lat")} {toDMS(hud.lng, "lng")}</div>
                <div><span className="text-slate-400">UTM </span>{utmZone(hud.lat, hud.lng)} {Math.round(utm.e)}E {Math.round(utm.n)}N</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom-right: elevation profile */}
      <div className={`${PANEL} absolute bottom-8 right-3 z-20 hidden w-[250px] px-3 pb-2 pt-2 lg:block`}>
        <div className="flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wide text-slate-400"><span className="inline-flex items-center gap-1.5"><Mountain size={12} aria-hidden />{lang === "uz" ? "Balandlik profili" : "Elevation profile"}</span><span className="tabular-nums normal-case text-slate-600">{Math.round(pmin)}–{Math.round(pmax)} m</span></div>
        <svg viewBox="0 0 300 62" className="mt-1 h-12 w-full">
          {path && <path d={`${path} L300,62 L0,62 Z`} fill="#1b8a3e" fillOpacity="0.18" />}
          {path && <path d={path} fill="none" stroke="#1b7a45" strokeWidth="1.8" strokeLinejoin="round" />}
        </svg>
        <div className="flex justify-between text-[11px] text-slate-400"><span>{lang === "uz" ? "g‘arb" : "west"}</span><span>{lang === "uz" ? "sharq" : "east"}</span></div>
      </div>
    </div>
  );
}
