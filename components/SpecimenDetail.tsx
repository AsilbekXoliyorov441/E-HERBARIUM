"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Calendar, ChevronLeft, ChevronRight, Download, ExternalLink, Globe2, Home, Info, Landmark, Leaf, Link2, MapPin, Maximize2, MoreHorizontal, Move, Network, ScanLine, Share2, Sprout, TreeDeciduous, Waypoints, ZoomIn, ZoomOut } from "lucide-react";
import { Specimen, thumbUrl } from "@/lib/data";
import { toDMS, toUTM, utmZone } from "@/lib/geo";
import { useLang } from "@/lib/i18n";
import SpecimenCard from "@/components/SpecimenCard";
import Flag from "@/components/Flag";
import type { Tab } from "@/lib/store";

type TabKey = "details" | "ident" | "loc" | "related";
type Taxo = { kingdom?: string; phylum?: string; class?: string; order?: string; family?: string; genus?: string };

const L = {
  specimens: { uz: "Namunalar", en: "Specimens" },
  verified: { uz: "GBIF orqali nashr etilgan", en: "Published via GBIF" },
  share: { uz: "Ulashish", en: "Share" },
  download: { uz: "Yuklab olish", en: "Download" },
  copied: { uz: "Havola nusxalandi", en: "Link copied" },
  year: { uz: "Yig‘ilgan yil", en: "Collected" },
  country: { uz: "Davlat", en: "Country" },
  catalogue: { uz: "Katalog raqami", en: "Catalogue no." },
  resolution: { uz: "Rasm o‘lchami", en: "Image resolution" },
  gbifRec: { uz: "GBIF yozuvi", en: "GBIF record" },
  zoomIn: { uz: "Kattalashtirish", en: "Zoom in" },
  zoomOut: { uz: "Kichraytirish", en: "Zoom out" },
  reset: { uz: "Asl holat", en: "Reset" },
  dragHint: { uz: "Sichqoncha g‘ildiragi — zoom, sudrash — siljitish", en: "Scroll to zoom, drag to pan" },
  loadingOrig: { uz: "Asl rasm yuklanmoqda…", en: "Loading original…" },
  noImage: { uz: "Rasm mavjud emas", en: "No image available" },
  srcRes: { uz: "Aniqlik asl skaner bilan cheklangan", en: "Detail is limited by the original scan" },
  openGbif: { uz: "GBIF’da ochish", en: "Open on GBIF" },
  details: { uz: "Tafsilotlar", en: "Details" },
  ident: { uz: "Aniqlash", en: "Identification" },
  loc: { uz: "Joylashuv", en: "Location" },
  related: { uz: "O‘xshash", en: "Related" },
  basic: { uz: "Asosiy ma’lumot", en: "Basic Information" },
  sci: { uz: "Ilmiy nomi", en: "Scientific name" },
  family: { uz: "Oila", en: "Family" },
  genus: { uz: "Turkum", en: "Genus" },
  type: { uz: "Tip holati", en: "Type status" },
  iucn: { uz: "IUCN holati", en: "IUCN status" },
  collector: { uz: "Yig‘uvchi", en: "Collector" },
  date: { uz: "Yig‘ilgan sana", en: "Collection date" },
  locality: { uz: "Joy", en: "Locality" },
  coords: { uz: "Koordinata", en: "Coordinates" },
  inst: { uz: "Muassasa", en: "Institution" },
  herb: { uz: "Gerbariy raqami", en: "Herbarium number" },
  colloc: { uz: "Yig‘ish joyi", en: "Collection & Location" },
  region: { uz: "Hudud", en: "Region" },
  exact: { uz: "Aniq joy", en: "Exact locality" },
  elev: { uz: "Balandlik", en: "Elevation" },
  viewMap: { uz: "Xaritada ko‘rish", en: "View on map" },
  desc: { uz: "Tavsif", en: "Description" },
  tax: { uz: "Taksonomiya", en: "Taxonomy" },
  kingdom: { uz: "Dunyo", en: "Kingdom" },
  division: { uz: "Bo‘lim", en: "Division" },
  class: { uz: "Sinf", en: "Class" },
  order: { uz: "Tartib", en: "Order" },
  species: { uz: "Tur", en: "Species" },
  partOf: { uz: "Bu namuna quyidagi to‘plamga kiradi:", en: "This specimen is part of the" },
  actions: { uz: "Amallar", en: "Actions" },
  hires: { uz: "Yuqori sifatli yuklash", en: "Download high resolution" },
  relSp: { uz: "O‘xshash namunalar", en: "Related specimens" },
  all: { uz: "Hammasi", en: "View all" },
  zone: { uz: "UTM zona", en: "UTM zone" },
  none: { uz: "Ma’lumot yo‘q", en: "No data" },
} as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white shadow-[0_1px_8px_rgba(16,60,40,.07)] ring-1 ring-emerald-900/5 ${className}`}>{children}</div>;
}
function Heading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return <h3 className="flex items-center gap-2.5 text-[17px] font-bold text-[#0e3b29]"><Icon size={16} className="text-[#1b8a3e]" strokeWidth={1.8} />{children}</h3>;
}
function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-3 text-[15px] sm:grid-cols-[130px_1fr] sm:gap-y-[14px]">
      {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-[13px] text-ink/45 sm:text-[15px]">{k}</dt><dd className="mb-3 min-w-0 break-words font-medium text-ink/80 sm:mb-0">{v}</dd></div>))}
    </dl>
  );
}

/** 3×3 Esri topo tiles centred on the point – a static mini-map without another map instance. */
function MiniMap({ lat, lng, onClick, label }: { lat: number; lng: number; onClick: () => void; label: string }) {
  const z = 8, n = 2 ** z;
  const fx = ((lng + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy), S = 256;
  const ox = 95 - (fx - tx + 1) * S, oy = 60 - (fy - ty + 1) * S;
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push([dx, dy]);
  return (
    <div className="relative h-[120px] w-[190px] shrink-0 overflow-hidden rounded-lg bg-[#dfe9df]">
      <div className="absolute" style={{ width: S * 3, height: S * 3, left: ox, top: oy }}>
        {tiles.map(([dx, dy]) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${dx}${dy}`} alt="" referrerPolicy="no-referrer" src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${ty + dy}/${(tx + dx + n) % n}`} className="absolute select-none" style={{ left: (dx + 1) * S, top: (dy + 1) * S, width: S, height: S }} draggable={false} />
        ))}
      </div>
      <MapPin className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full fill-[#14573a] text-white drop-shadow" size={26} />
      <button onClick={onClick} className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[14px] font-semibold text-ink/75 shadow">{label} <ExternalLink size={9} /></button>
    </div>
  );
}

function ZoomViewer({ s, onNat }: { s: Specimen; onNat: (n: { w: number; h: number } | null) => void }) {
  const { lang } = useLang();
  const t = (k: keyof typeof L) => L[k][lang];
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [orig, setOrig] = useState(false);
  const [origReady, setOrigReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);
  const preview = thumbUrl(s, 1200);
  const src = orig && origReady ? s.image : preview;

  useEffect(() => { setK(1); setOff({ x: 0, y: 0 }); setOrig(false); setOrigReady(false); setFailed(false); onNat(null); }, [s.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clamp = (nk: number, o: { x: number; y: number }) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return o;
    const mx = (r.width * (nk - 1)) / 2, my = (r.height * (nk - 1)) / 2;
    return { x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) };
  };
  const zoomTo = (nk: number, cx = 0, cy = 0) => {
    nk = Math.max(1, Math.min(10, nk));
    setK((pk) => { setOff((o) => clamp(nk, { x: cx - ((cx - o.x) / pk) * nk, y: cy - ((cy - o.y) / pk) * nk })); return nk; });
    if (nk > 1.5 && s.image) setOrig(true);
  };
  useEffect(() => {
    const el = box.current; if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomTo(k * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // preload the original once the user starts zooming
  useEffect(() => {
    if (!orig || !s.image) return;
    const im = new window.Image();
    im.referrerPolicy = "no-referrer";
    im.onload = () => { setOrigReady(true); onNat({ w: im.naturalWidth, h: im.naturalHeight }); };
    im.src = s.image;
  }, [orig, s.image]); // eslint-disable-line react-hooks/exhaustive-deps

  const btn = "grid h-11 w-11 place-items-center sm:h-8 sm:w-8 rounded-md bg-white/95 text-ink/75 shadow hover:bg-white";
  return (
    <div>
      <div ref={box} className="relative h-[60vh] max-h-[560px] min-h-[320px] touch-none select-none lg:h-[520px] lg:max-h-none overflow-hidden rounded-lg bg-[#e9e1cf]" style={{ cursor: k > 1 ? (drag.current ? "grabbing" : "grab") : "zoom-in" }}
        onPointerDown={(e) => { pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k }; drag.current = null; return; } drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch.current && pts.current.size >= 2) { const [a, b] = [...pts.current.values()]; zoomTo(pinch.current.k * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d)); return; } const d = drag.current; if (d && k > 1) setOff(clamp(k, { x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y })); }}
        onPointerUp={(e) => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; drag.current = null; }}
        onPointerCancel={(e) => { pts.current.delete(e.pointerId); pinch.current = null; drag.current = null; }}
        onDoubleClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); zoomTo(k > 1 ? 1 : 3, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2); }}>
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={s.binomial} referrerPolicy="no-referrer" draggable={false} onError={() => setFailed(true)}
            className="h-full w-full object-contain" style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${k})`, transformOrigin: "center", transition: drag.current ? "none" : "transform .12s ease-out" }} />
        ) : <div className="grid h-full place-items-center text-[16px] text-ink/50">{t("noImage")}</div>}
        {orig && !origReady && k > 1.5 && <span className="absolute left-2.5 top-2.5 rounded-md bg-[#0b2e20]/75 px-2 py-0.5 text-[14px] font-semibold text-white">{t("loadingOrig")}</span>}
        <span className="absolute left-2.5 bottom-2.5 rounded-md bg-[#0b2e20]/75 px-2 py-0.5 text-[14px] font-semibold text-white">{k.toFixed(1)}×</span>
        <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <button aria-label={t("zoomIn")} title={t("zoomIn")} onClick={() => zoomTo(k * 1.5)} className={btn}><ZoomIn size={16} /></button>
          <button aria-label={t("zoomOut")} title={t("zoomOut")} onClick={() => zoomTo(k / 1.5)} className={btn}><ZoomOut size={16} /></button>
          <button aria-label={t("reset")} title={t("reset")} onClick={() => zoomTo(1)} className={btn}><Maximize2 size={15} /></button>
        </div>
      </div>
      <p className="mt-2.5 flex items-start gap-1.5 text-[14px] leading-snug text-ink/50"><Move size={11} className="mt-px shrink-0" />{t("dragHint")}. {t("srcRes")}.</p>
      {s.rightsHolder || s.license ? <p className="mt-1 text-[14px] leading-snug text-ink/40">© {s.rightsHolder || s.institution} · {s.license?.replace(/^https?:\/\//, "")}</p> : null}
    </div>
  );
}

export default function SpecimenDetail({ specimen: s, all, onOpen, onSelect, onShowOnMap }: { specimen: Specimen; all: Specimen[]; onOpen: (tab: Tab) => void; onSelect: (id: string) => void; onShowOnMap: (id: string) => void }) {
  const { lang } = useLang();
  const t = (k: keyof typeof L) => L[k][lang];
  const [tab, setTab] = useState<TabKey>("details");
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [taxo, setTaxo] = useState<Taxo>({});
  const rail = useRef<HTMLDivElement>(null);
  const genus = s.binomial.split(" ")[0];

  useEffect(() => { setTab("details"); setMenu(false); }, [s.id]);
  useEffect(() => {
    let off = false;
    setTaxo({});
    fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(s.binomial)}&kingdom=Plantae`).then((r) => r.json()).then((d) => { if (!off) setTaxo(d); }).catch(() => {});
    return () => { off = true; };
  }, [s.binomial]);

  const related = useMemo(() => {
    const seen = new Set<string>([s.binomial]);
    const score = (x: Specimen) => (x.binomial.split(" ")[0] === genus ? 2 : x.family === s.family ? 1 : 0);
    return all.filter((x) => x.real && x.image && score(x) > 0 && !seen.has(x.binomial) && seen.add(x.binomial)).sort((a, b) => score(b) - score(a)).slice(0, 12);
  }, [all, s, genus]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };
  const share = async () => { try { await navigator.clipboard.writeText(s.gbifUrl || window.location.href); flash(t("copied")); } catch { flash(s.gbifUrl || ""); } };
  const dl = () => {
    const rows: [string, unknown][] = [["binomial", s.binomial], ["authority", s.authority], ["family", s.family], ["catalogue", s.tashBarcode], ["collector", s.collector], ["date", s.date], ["country", s.country], ["locality", s.locality ?? s.region], ["lat", s.lat], ["lng", s.lng], ["elevation", s.elevation], ["institution", s.institution], ["gbif", s.gbifUrl]];
    const csv = rows.map((r) => r[0]).join(",") + "\n" + rows.map((r) => `"${String(r[1] ?? "").replace(/"/g, '""')}"`).join(",");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); a.download = `${s.binomial.replace(/\s+/g, "_")}.csv`; a.click();
  };

  const inst = s.institution || (s.real ? "—" : "TASH");
  const cat = s.catalog || s.tashBarcode;
  const place = s.locality || s.region || "—";
  const date = s.date || (s.year ? String(s.year) : "—");
  const coords = `${s.lat.toFixed(6)}°, ${s.lng.toFixed(6)}°`;
  const utm = toUTM(s.lat, s.lng);
  const dash = <span className="text-ink/35">—</span>;
  const elev = s.elevation ? `${s.elevation} m` : dash;

  const stats = [
    { icon: Calendar, k: t("year"), v: s.year ? String(s.year) : "—", d: s.date || "" },
    { icon: Globe2, k: t("country"), v: <span className="inline-flex items-center gap-2"><Flag country={s.country} />{s.country || "—"}</span>, d: s.region && s.region !== s.country ? s.region : "" },
    { icon: Landmark, k: t("inst"), v: inst, d: cat ? `${t("catalogue")} ${cat}` : "" },
    { icon: ScanLine, k: t("resolution"), v: nat ? `${nat.w}×${nat.h}` : "—", d: nat ? "px · original" : (lang === "uz" ? "zoom qilganda aniqlanadi" : "measured on zoom") },
  ];
  const tabs: [TabKey, string, React.ElementType][] = [["details", t("details"), Info], ["ident", t("ident"), Sprout], ["loc", t("loc"), MapPin], ["related", t("related"), Network]];

  const panes: Record<TabKey, React.ReactNode> = {
    details: (
      <>
        <Heading icon={Leaf}>{t("basic")}</Heading>
        <div className="mt-5 grid gap-x-10 gap-y-0 md:grid-cols-2">
          <KV rows={[[t("sci"), `${s.binomial}${s.authority ? " " + s.authority : ""}`], [t("family"), s.family], [t("genus"), genus], [t("type"), s.typeStatus && s.typeStatus !== "—" ? s.typeStatus : dash], [t("iucn"), s.iucn === "NE" ? dash : s.iucn]]} />
          <KV rows={[[t("collector"), s.collector], [t("date"), date], [t("locality"), s.country], [t("coords"), coords], [t("inst"), inst], [t("herb"), cat]]} />
        </div>
      </>
    ),
    ident: (
      <>
        <Heading icon={Sprout}>{t("ident")}</Heading>
        <div className="mt-5"><KV rows={[[t("sci"), `${s.binomial}${s.authority ? " " + s.authority : ""}`], [t("family"), s.family], [t("genus"), genus], [t("type"), s.typeStatus && s.typeStatus !== "—" ? s.typeStatus : dash], [t("iucn"), s.iucn === "NE" ? dash : s.iucn], ["GBIF", s.gbifUrl ? <a href={s.gbifUrl} target="_blank" rel="noreferrer" className="text-[#14573a] underline">{s.gbifKey}</a> : dash]]} /></div>
      </>
    ),
    loc: (
      <>
        <Heading icon={MapPin}>{t("loc")}</Heading>
        <div className="mt-5"><KV rows={[[t("coords"), coords], ["DMS", `${toDMS(s.lat, "lat")} ${toDMS(s.lng, "lng")}`], ["UTM", `${utmZone(s.lat, s.lng)} ${Math.round(utm.e)}E ${Math.round(utm.n)}N`], [t("elev"), elev], [t("locality"), place], [t("region"), s.region || s.country]]} /></div>
      </>
    ),
    related: (
      <>
        <Heading icon={Network}>{t("related")}</Heading>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {related.slice(0, 4).map((r) => (<SpecimenCard key={r.id} s={r} onOpen={() => onSelect(r.id)} />))}
        </div>
      </>
    ),
  };

  const taxRows: [string, string][] = [[t("kingdom"), taxo.kingdom || "Plantae"], [t("division"), taxo.phylum || "—"], [t("class"), taxo.class || "—"], [t("order"), taxo.order || "—"], [t("family"), taxo.family || s.family], [t("genus"), taxo.genus || genus], [t("species"), `${s.binomial}${s.authority ? " " + s.authority : ""}`]];
  const description = lang === "uz"
    ? `${(s.binomial + (s.authority ? " " + s.authority : "")).replace(/\.$/, "")} o‘simligining gerbariy varag‘i. ${s.collector !== "unknown" ? `${s.collector} tomonidan ` : ""}${date !== "—" ? `${date} sanada ` : ""}${s.country} hududida yig‘ilgan. Namuna ${inst} to‘plamida saqlanadi.`
    : `Herbarium sheet of ${(s.binomial + (s.authority ? " " + s.authority : "")).replace(/\.$/, "")}. ${s.collector !== "unknown" ? `Collected by ${s.collector}` : "Collected"}${date !== "—" ? ` on ${date}` : ""} in ${s.country}. The specimen is held in the ${inst} collection${s.real ? " and shared through GBIF" : ""}.`;

  return (
    <div className="min-h-full bg-gradient-to-b from-[#eef5f1] to-[#f4f8f6] pb-8 sm:pb-10">
      <div className="mx-auto max-w-[1680px] px-3 pt-3 sm:px-6 sm:pt-5 lg:px-[66px]">
        {/* breadcrumb + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex min-w-0 items-center gap-1.5 text-[14px] text-ink/55 sm:gap-2 sm:text-[15px]">
            <button onClick={() => onOpen("home")} aria-label="Home" className="grid h-8 w-8 shrink-0 place-items-center hover:text-ink sm:h-auto sm:w-auto"><Home size={14} /></button><ChevronRight size={12} className="shrink-0" />
            <button onClick={() => onOpen("atlas")} className="shrink-0 hover:text-ink">{t("specimens")}</button><ChevronRight size={12} className="shrink-0" />
            <span className="min-w-0 truncate text-ink/70">{s.binomial}{s.authority ? ` ${s.authority}` : ""}</span>
          </nav>
          <div className="relative flex items-center gap-2 sm:gap-2.5">
            <button onClick={share} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 py-2 text-[15px] sm:min-h-0 sm:flex-none font-semibold text-ink/75 hover:bg-slate-50"><Share2 size={14} />{t("share")}</button>
            <button onClick={dl} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#14573a] px-5 py-2 text-[15px] sm:min-h-0 sm:flex-none font-semibold text-white hover:bg-[#0e4a30]"><Download size={14} />{t("download")}</button>
            <button onClick={() => setMenu((m) => !m)} aria-label="More" className="grid h-11 w-11 shrink-0 sm:h-8 sm:w-8 place-items-center rounded-lg border border-ink/15 bg-white text-ink/65 hover:bg-slate-50"><MoreHorizontal size={15} /></button>
            {menu && (
              <div className="absolute right-0 top-11 z-30 w-48 rounded-lg bg-white p-1 text-[15px] shadow-xl ring-1 ring-black/10">
                <button onClick={() => { share(); setMenu(false); }} className="flex w-full items-center gap-2 rounded px-3 py-2 hover:bg-emerald-50"><Link2 size={13} />{t("share")}</button>
                {s.gbifUrl && <a href={s.gbifUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded px-3 py-2 hover:bg-emerald-50"><ExternalLink size={13} />GBIF</a>}
                <a href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded px-3 py-2 hover:bg-emerald-50"><MapPin size={13} />Google Maps</a>
              </div>
            )}
            {toast && <span className="absolute right-0 top-11 z-30 rounded-md bg-[#14573a] px-3 py-1.5 text-[15px] text-white shadow">{toast}</span>}
          </div>
        </div>

        {/* title + stats */}
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_680px]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff1e6] px-3 py-1 text-[14px] font-semibold text-[#14573a]"><BadgeCheck size={14} className="fill-[#1b8a3e] text-white" />{t("verified")}</span>
            <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight break-words sm:text-[36px] lg:text-[42px] text-[#0b2e20]"><i>{s.binomial}</i>{s.authority && <span className="ml-2 text-[18px] font-normal sm:text-[28px] text-ink/50">{s.authority}</span>}</h1>
            <p className="mt-1 break-words text-[14px] text-ink/50 sm:text-[16px]">{inst} {cat}{s.gbifKey ? ` · GBIF ${s.gbifKey}` : ""} · {s.family}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[s.family, genus, s.country, s.year ? String(s.year) : ""].filter(Boolean).map((c) => <span key={c} className="inline-flex items-center gap-2 rounded-full bg-[#dbeee2] px-3.5 py-1.5 text-[14px] font-medium text-[#14573a]">{c === s.country && <Flag country={c} />}{c}</span>)}
            </div>
          </div>
          <Card className="grid grid-cols-2 divide-ink/10 !bg-[#e6f1ea]/70 sm:grid-cols-4 sm:divide-x">
            {stats.map(({ icon: Icon, k, v, d }) => (
              <div key={k} className="min-w-0 px-3.5 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center gap-2 text-[14px] font-medium text-ink/65"><Icon size={15} className="text-[#14573a]" />{k}</div>
                <div className="mt-2 line-clamp-2 break-words text-[17px] font-bold leading-snug text-[#0e3b29]" title={typeof v === "string" ? v : s.country}>{v}</div>
                <div className="mt-0.5 truncate text-[14px] text-ink/45">{d || "\u00a0"}</div>
              </div>
            ))}
          </Card>
        </div>

        {/* 3 columns */}
        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)_360px]">
          <Card className="min-w-0 self-start p-2 sm:p-3"><ZoomViewer s={s} onNat={setNat} /></Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <div className="flex gap-1 overflow-x-auto border-b border-ink/10 px-2 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
                {tabs.map(([k, label, Icon]) => (
                  <button key={k} onClick={() => setTab(k)} className={`relative flex min-h-[48px] shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-4 text-[15px] font-semibold transition ${tab === k ? "text-[#0e5a37]" : "text-ink/55 hover:text-ink/80"}`}>
                    <Icon size={14} />{label}{tab === k && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded bg-[#1b8a3e]" />}
                  </button>
                ))}
              </div>
              <div className="min-h-[200px] overflow-hidden p-4 sm:min-h-[260px] sm:p-6"><AnimatePresence mode="wait" initial={false}><motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>{panes[tab]}</motion.div></AnimatePresence></div>
            </Card>
            <Card className="p-4 sm:p-6">
              <Heading icon={MapPin}>{t("colloc")}</Heading>
              <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 flex-1 sm:min-w-[260px]"><KV rows={[[t("region"), s.country], [t("exact"), place], [t("coords"), coords], [t("elev"), elev]]} /></div>
                <MiniMap lat={s.lat} lng={s.lng} onClick={() => onShowOnMap(s.id)} label={t("viewMap")} />
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-2 lg:grid lg:grid-cols-3 lg:items-start 2xl:col-span-1 2xl:flex 2xl:flex-col">
            <Card className="p-5"><Heading icon={Info}>{t("desc")}</Heading><p className="mt-3 text-[15px] leading-relaxed text-ink/65">{description}</p></Card>
            <Card className="p-5">
              <Heading icon={TreeDeciduous}>{t("tax")}</Heading>
              <div className="mt-4"><KV rows={taxRows} /></div>
              <a href={s.gbifUrl || "#"} target={s.gbifUrl ? "_blank" : undefined} rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-lg bg-[#e3f1e9] p-3 text-[14px] text-ink/65">
                <Leaf size={18} className="shrink-0 text-[#1b8a3e]" />
                <span className="flex-1 leading-snug">{t("partOf")}<br />{inst} {lang === "uz" ? "" : "collection"}</span>
                <ArrowRight size={14} />
              </a>
            </Card>
            <Card className="p-5">
              <Heading icon={Waypoints}>{t("actions")}</Heading>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <a href={s.image || undefined} target="_blank" rel="noreferrer" download className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-ink/15 px-2 py-2.5 text-center text-[14px] font-semibold text-ink/75 hover:bg-slate-50"><Download size={13} />{t("hires")}</a>
                <a href={s.gbifUrl || undefined} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-ink/15 px-2 py-2.5 text-center text-[14px] font-semibold text-ink/75 hover:bg-slate-50"><ExternalLink size={13} />{t("openGbif")}</a>
              </div>
            </Card>
          </div>
        </div>

        {/* related */}
        <Card className="mt-4 p-4 sm:mt-5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
            <Heading icon={Network}>{t("relSp")}</Heading>
            <div className="flex items-center gap-3">
              <button aria-label="prev" onClick={() => rail.current?.scrollBy({ left: -500, behavior: "smooth" })} className="hidden h-6 w-6 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-black/10 sm:grid"><ChevronLeft size={14} /></button>
              <button aria-label="next" onClick={() => rail.current?.scrollBy({ left: 500, behavior: "smooth" })} className="hidden h-6 w-6 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-black/10 sm:grid"><ChevronRight size={14} /></button>
              <button onClick={() => onOpen("atlas")} className="flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-[#14573a] sm:min-h-0">{t("all")} <ArrowRight size={12} /></button>
            </div>
          </div>
          <div ref={rail} key={s.id} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-5 pt-2 sm:gap-5 sm:pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {related.map((r, i) => (
              <SpecimenCard key={r.id} s={r} index={i} className="w-[78vw] max-w-[290px] shrink-0 snap-start sm:w-[290px]" onOpen={() => onSelect(r.id)} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
