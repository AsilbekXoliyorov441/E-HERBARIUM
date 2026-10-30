"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Globe2, Hexagon, ShieldAlert, Loader2, RotateCcw, Search, SlidersHorizontal, X, CloudDownload } from "lucide-react";
import { IUCN } from "@/lib/data";
import { IUCN_MAP_COLOR } from "@/lib/analysis";
import { useLang } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import SpecimenCard, { IUCN_INFO } from "@/components/SpecimenCard";
import Flag from "@/components/Flag";
import Select from "@/components/Select";
import { DataStrip } from "@/components/DataPanel";

const PAGE = 40;
const Y0 = 1840, Y1 = 2026;
const SNAP_H = ["h-[170px]", "h-[55%]", "h-[90%]"] as const;
const CODES: IUCN[] = ["CR", "EN", "VU", "NT", "LC", "DD", "NE"];

export default function AtlasSidebar() {
  const { t, lang } = useLang();
  const { all, pool, loadMsg, loadingMore, q, setQ, iucn, setIucn, country, setCountry, years, setYears, poly, setPoly, selected, setSelected, countries, filtered, loadMoreRecords } = useApp();
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false); // filters start collapsed on phones, opened on desktop (effect below)
  const [snap, setSnap] = useState(0); // phone bottom sheet: 0 peek, 1 half, 2 full
  useEffect(() => { if (window.matchMedia("(min-width: 1024px)").matches) setOpen(true); }, []);
  const [scrolled, setScrolled] = useState(false);
  const [clip, setClip] = useState(false); // clip only while the filter block animates, so dropdowns can overflow it
  const L = lang === "uz"
    ? { title: "Namunalar", filters: "Filtrlar", status: "Himoya holati", country: "Davlat", years: "Yig‘ilgan yillar", reset: "Tozalash", results: "Natijalar", all: "Hammasi", area: "Chizilgan hudud", old: "oldingi" }
    : { title: "Specimens", filters: "Filters", status: "Conservation status", country: "Country", years: "Collection years", reset: "Reset", results: "Results", all: "All", area: "Drawn area", old: "earlier" };

  useEffect(() => setShown(PAGE), [q, iucn, country, years, poly]);

  const iucnCount = useMemo(() => { const m: Record<string, number> = {}; all.forEach((s) => { m[s.iucn] = (m[s.iucn] ?? 0) + 1; }); return m; }, [all]);

  const bins = useMemo(() => {
    const b = new Array(19).fill(0);
    all.forEach((s) => { if (s.year) b[Math.min(18, Math.max(0, Math.floor((s.year - Y0) / 10)))]++; });
    return b as number[];
  }, [all]);
  const maxBin = Math.max(1, ...bins);
  const pct = (y: number) => ((y - Y0) / (Y1 - Y0)) * 100;
  const setFrom = (v: number) => setYears([Math.max(Y0, Math.min(v, years[1])), years[1]]);
  const setTo = (v: number) => setYears([years[0], Math.min(Y1, Math.max(v, years[0]))]);
  const yearsActive = years[0] > Y0 || years[1] < Y1;
  const activeCount = (q ? 1 : 0) + iucn.length + (country !== "All" ? 1 : 0) + (yearsActive ? 1 : 0) + (poly ? 1 : 0);
  const resetAll = () => { setQ(""); setIucn([]); setCountry("All"); setYears([Y0, Y1]); setPoly(null); };
  const chip = (on: boolean) => `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold transition-all ${on ? "bg-[#14573a] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

  return (
    <aside
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-white shadow-[0_-12px_40px_-8px_rgba(6,40,29,.4)] transition-[height] duration-300 ease-out lg:static lg:z-auto lg:h-auto lg:w-[380px] lg:shrink-0 lg:rounded-none lg:border-r lg:border-emerald-900/10 lg:shadow-none ${SNAP_H[snap]}`}>
      {/* phone: draggable sheet handle (Material bottom sheet) */}
      <motion.div onPanEnd={(_, i) => { if (i.offset.y < -30) setSnap((v) => Math.min(2, v + 1)); else if (i.offset.y > 30) setSnap((v) => Math.max(0, v - 1)); }} onTap={() => setSnap((v) => (v === 2 ? 0 : v + 1))} style={{ touchAction: "none" }} className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5 lg:hidden" role="button" aria-label="Expand / collapse list">
        <span className="h-1.5 w-11 rounded-full bg-slate-300" />
      </motion.div>
      {/* header + search */}
      <div className="space-y-3 px-4 pb-3 pt-1 lg:pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[18px] font-bold text-[#0e3b29]">{L.title}</h2>
            <motion.span key={filtered.length} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-emerald-800">{filtered.length.toLocaleString()}<span className="font-medium text-emerald-700/60"> / {all.length.toLocaleString()}</span></motion.span>
          </div>
          <AnimatePresence>{activeCount > 0 && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={resetAll} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-50"><RotateCcw size={12} />{L.reset}</motion.button>
          )}</AnimatePresence>
        </div>
        <div className="hidden sm:block"><DataStrip /></div>
        <label className="group flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-2.5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1b7a45]/60">
          <Search size={16} className="shrink-0 text-slate-400 transition group-focus-within:text-[#1b7a45]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("atlas.search")} className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-slate-400" />
          {q && <button onClick={() => setQ("")} aria-label="clear" className="grid h-5 w-5 place-items-center rounded-full bg-slate-300/70 text-white hover:bg-slate-400"><X size={11} /></button>}
        </label>
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-[13px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800">
          <span className="inline-flex items-center gap-2"><SlidersHorizontal size={13} />{L.filters}{activeCount > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1b7a45] px-1 text-[11px] font-bold text-white">{activeCount}</span>}</span>
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* collapsible filters */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} onAnimationStart={() => setClip(true)} onAnimationComplete={() => setClip(false)} className={clip ? "overflow-hidden" : "overflow-visible"}>
            <div className="space-y-4 border-b border-slate-100 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <section>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">{L.status}</div>
                  <Select value={iucn[0] ?? ""} onChange={(v) => setIucn(v ? [v as IUCN] : [])} icon={<ShieldAlert size={15} />}
                    options={[{ value: "", label: L.all, icon: <ShieldAlert size={15} className="text-emerald-700" /> }, ...CODES.map((k) => ({ value: k, label: `${k} · ${IUCN_INFO[k][lang]}`, hint: `${iucnCount[k] ?? 0}`, icon: <span className="h-3.5 w-3.5 rounded-full" style={{ background: IUCN_MAP_COLOR[k] }} /> }))]} />
                </section>
                <section>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">{L.country}</div>
                  <Select value={country} onChange={setCountry} icon={<Globe2 size={15} />}
                    options={[{ value: "All", label: L.all, icon: <Globe2 size={15} className="text-emerald-700" /> }, ...countries.map((c) => ({ value: c, label: c, icon: <Flag country={c} /> }))]} />
                </section>
              </div>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">{L.years}</span>
                  <AnimatePresence>{yearsActive && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setYears([Y0, Y1])} className="text-[12px] font-semibold text-[#1b7a45] hover:underline">{L.reset}</motion.button>}</AnimatePresence>
                </div>
                <div className="flex h-10 items-end gap-[2px]" role="group" aria-label={L.years}>
                  {bins.map((n, i) => { const y = Y0 + i * 10, on = y + 10 > years[0] && y <= years[1]; return (
                    <button key={i} onClick={() => setYears([Math.max(Y0, y), Math.min(Y1, y + 9)])} title={`${y}–${y + 9}: ${n}`} className={`flex-1 rounded-t-sm transition-colors hover:bg-[#14573a] ${on ? "bg-[#2fa855]" : "bg-slate-200"}`} style={{ height: `${Math.max(8, (n / maxBin) * 100)}%` }} />
                  ); })}
                </div>
                <div className="dual-range mt-1">
                  <div className="absolute inset-x-0 top-[9px] h-1 rounded-full bg-slate-200" />
                  <div className="absolute top-[9px] h-1 rounded-full bg-[#1b7a45]" style={{ left: `${pct(years[0])}%`, right: `${100 - pct(years[1])}%` }} />
                  <input type="range" min={Y0} max={Y1} value={years[0]} aria-label="from" onChange={(e) => setFrom(+e.target.value)} />
                  <input type="range" min={Y0} max={Y1} value={years[1]} aria-label="to" onChange={(e) => setTo(+e.target.value)} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-slate-500">
                  <input type="number" min={Y0} max={Y1} value={years[0]} onChange={(e) => e.target.value && setFrom(+e.target.value)} aria-label="from year" className="w-[78px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center text-[13.5px] font-bold tabular-nums text-slate-800 outline-none focus:border-[#1b7a45] focus:ring-2 focus:ring-[#1b7a45]/20" />
                  <span className="h-px flex-1 bg-slate-200" />
                  <input type="number" min={Y0} max={Y1} value={years[1] > 2025 ? 2025 : years[1]} onChange={(e) => e.target.value && setTo(+e.target.value)} aria-label="to year" className="w-[78px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center text-[13.5px] font-bold tabular-nums text-slate-800 outline-none focus:border-[#1b7a45] focus:ring-2 focus:ring-[#1b7a45]/20" />
                </div>
              </section>

              {poly && <div className="flex items-center justify-between rounded-lg bg-cyan-50 px-3 py-2 text-[13px] font-semibold text-cyan-800"><span className="inline-flex items-center gap-2"><Hexagon size={14} />{L.area}</span><button onClick={() => setPoly(null)} aria-label="clear area" className="hover:text-cyan-950"><X size={14} /></button></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* results */}
      <div className={`flex items-center justify-between border-b px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400 transition-shadow ${scrolled ? "border-transparent shadow-[0_6px_10px_-8px_rgba(0,0,0,.3)]" : "border-slate-100"}`}>
        <span>{L.results}</span><span className="tabular-nums">{Math.min(shown, filtered.length)} / {filtered.length}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}>
        {filtered.slice(0, shown).map((s) => (
          <li key={s.id} style={{ contentVisibility: "auto", containIntrinsicSize: "92px" }}>
            <SpecimenCard s={s} variant="row" selected={selected === s.id} onOpen={() => setSelected(s.id)} />
          </li>
        ))}
        {filtered.length > shown && <li className="p-3"><button onClick={() => setShown((n) => n + PAGE)} className="w-full rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800">{t("atlas.more")} ({filtered.length - shown})</button></li>}
        {filtered.length === 0 && (
          <li className="px-6 py-14 text-center">
            <Search size={28} className="mx-auto text-slate-300" />
            <div className="mt-3 text-[14.5px] font-semibold text-slate-600">{t("atlas.noMatch")}</div>
            {activeCount > 0 && <button onClick={resetAll} className="mt-3 text-[13.5px] font-semibold text-[#1b7a45] hover:underline">{L.reset}</button>}
          </li>
        )}
      </ul>

    </aside>
  );
}
