"use client";
import dynamic from "next/dynamic";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronUp, ExternalLink, Info, Leaf, MapPinned, MousePointerClick, Palette, Pause, Play, ShieldAlert, TrendingUp, X } from "lucide-react";
import { IUCN, Specimen, thumbUrl } from "@/lib/data";
import { toDMS } from "@/lib/geo";
import { CHANGE_COLOR, decadeStats, IUCN_MAP_COLOR, RAMP_CSS, yearColor } from "@/lib/analysis";
import { useLang } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import AtlasSidebar from "@/components/AtlasSidebar";
import { IUCN_INFO, IucnChip } from "@/components/SpecimenCard";
import Flag from "@/components/Flag";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-emerald-deep text-[15px] text-paper/70">…</div> });

const IUCN_BG: Record<IUCN, string> = { CR: "bg-red-700", EN: "bg-orange-600", VU: "bg-yellow-600", NT: "bg-lime-600", LC: "bg-green-700", DD: "bg-slate-500", NE: "bg-slate-400" };
const MODES = [
  { id: "decade" as const, icon: Calendar },
  { id: "iucn" as const, icon: ShieldAlert },
  { id: "change" as const, icon: TrendingUp },
];
const licenseName = (u?: string) => (u ? u.replace(/^https?:\/\/creativecommons.org\/(licenses|publicdomain)\//, "CC ").replace(/\/(legalcode)?$/, "").replace("zero/1.0", "0") : "—");

// Stays mounted in the root layout so the map and filters survive page changes; only hidden off /atlas.
export default function AtlasView({ active }: { active: boolean }) {
  const { t, lang } = useLang();
  const { all, pool, loadMsg, loadingMore, q, setQ, iucn, setIucn, country, setCountry, years, setYears, poly, setPoly, selected, setSelected, plotted, colorBy, setColorBy, split, setSplit, countries, filtered, openSpecimen, loadMoreRecords } = useApp();
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // collapsed on phones, opened on desktop
  useEffect(() => { if (window.matchMedia("(min-width: 1024px)").matches) setPanelOpen(true); }, []);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hist = useMemo(() => decadeStats(filtered.filter((s) => s.real)), [filtered]);
  const maxH = Math.max(1, ...hist.map((h) => h.records));

  // time-lapse
  useEffect(() => {
    if (!playing) { if (playRef.current) clearInterval(playRef.current); return; }
    let y = 1890;
    setYears([1840, y]);
    playRef.current = setInterval(() => {
      y += 5;
      if (y >= 2025) { setYears([1840, 2026]); setPlaying(false); return; }
      setYears([1840, y]);
    }, 650);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing]);

  const iucnCount = useMemo(() => { const m: Record<string, number> = {}; filtered.forEach((x) => { m[x.iucn] = (m[x.iucn] ?? 0) + 1; }); return m; }, [filtered]);
  const uz = lang === "uz";
  const modeLabel = { decade: uz ? "Yig‘ilgan yil" : "Year collected", iucn: uz ? "Himoya holati" : "Conservation status", change: uz ? "Davrlar o‘zgarishi" : "Change over time" } as const;
  const U = uz ? {
    panel: "Nuqtalar rangi va vaqt", q: "Nuqta rangi nimani bildiradi?", old: "eski namunalar", new: "yangi namunalar",
    explain: {
      decade: "Har bir nuqta — bitta gerbariy namunasi. Rangi namuna qaysi yilda yig‘ilganini ko‘rsatadi: to‘q binafsha — eng eski, sariq — eng yangi.",
      iucn: "Har bir nuqta — bitta namuna. Rangi o‘simlikning yo‘qolib ketish xavfini (IUCN Qizil kitob bahosi) ko‘rsatadi: qizil — xavf yuqori, yashil — xavf yo‘q. Raqam — hozir xaritadagi nuqtalar soni.",
      change: "Har bir nuqta — bitta namuna. Rangi shu turning vaqt o‘tishi bilan kamayganini yoki ko‘payganini ko‘rsatadi: tur eski va yangi davrdagi namunalar soni bo‘yicha solishtiriladi.",
    },
    ch: { lost: ["Yo‘qolgan", "oldin topilgan, endi topilmagan"], down: ["Kamaymoqda", "avvalgidan kam uchraydi"], stable: ["Barqaror", "deyarli o‘zgarmagan"], up: ["Ko‘paymoqda", "avvalgidan ko‘p uchraydi"], new: ["Yangi paydo bo‘lgan", "oldin topilmagan, endi topilgan"] },
    split: "Eski va yangi davr chegarasi", splitHint: (y: number) => `${y}-yilgacha yig‘ilganlar — eski davr, ${y}-yildan keyin — yangi davr.`,
    time: "Vaqt bo‘yicha ko‘rsating", play: "Namunalarni yillar bo‘yicha birin-ketin ko‘rsatish", playing: "Ijro etilmoqda… to‘xtatish uchun bosing", specimens: "ta namuna ko‘rinmoqda",
    legendClick: "Rangni bossangiz, xaritada faqat shu holatdagilar qoladi.", earlier: "Eski davr", later: "Yangi davr", histHint: "ustunni bosing", showAll: "Barcha yillarni ko‘rsatish",
  } : {
    panel: "Marker colour & time", q: "What does the marker colour mean?", old: "older specimens", new: "newer specimens",
    explain: {
      decade: "Each dot is one herbarium specimen. Its colour shows the year it was collected: dark purple is oldest, yellow is newest.",
      iucn: "Each dot is one specimen. Its colour shows how threatened the plant is (IUCN Red List): red is high risk, green is low risk. The number is how many dots are on the map now.",
      change: "Each dot is one specimen. Its colour shows whether that plant became rarer or more common over time, comparing the earlier and later period.",
    },
    ch: { lost: ["Disappeared", "found before, not found since"], down: ["Declining", "less common than before"], stable: ["Stable", "about the same"], up: ["Increasing", "more common than before"], new: ["Newly appeared", "not found before, found now"] },
    split: "Earlier / later period boundary", splitHint: (y: number) => `Specimens before ${y} are the earlier period, from ${y} on the later period.`,
    time: "Show over time", play: "Reveal specimens year by year", playing: "Playing… click to stop", specimens: "specimens shown",
    legendClick: "Click a colour to keep only that status on the map.", earlier: "Earlier", later: "Later", histHint: "click a bar", showAll: "Show all years",
  };
  const sel: Specimen | undefined = all.find((s) => s.id === selected);
  const rows = (s: Specimen): [string, string][] => [[lang === "uz" ? "Katalog" : "Catalogue", s.tashBarcode], [lang === "uz" ? "Yig‘uvchi" : "Collector", `${s.collector}${s.date ? ", " + s.date : ""}`], [lang === "uz" ? "Koordinata" : "Coordinates", `${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`], ["DMS", `${toDMS(s.lat, "lat")} ${toDMS(s.lng, "lng")}`], ...(s.elevation ? ([[lang === "uz" ? "Balandlik" : "Elevation", `${s.elevation} m`]] as [string, string][]) : []), [lang === "uz" ? "Joy" : "Locality", s.locality || s.region], ["IUCN", s.iucn === "NE" ? (lang === "uz" ? "baholanmagan" : "not evaluated") : s.iucn], [lang === "uz" ? "Rasm litsenziyasi" : "Image licence", `${licenseName(s.license)}${s.rightsHolder ? " · " + s.rightsHolder : ""}`]];

  return (
    <div className={`absolute inset-0 flex ${active ? "" : "invisible"}`}>
      <AtlasSidebar />

      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0">{<MapView specimens={filtered} selectedId={selected} focus={sel ?? null} active={active} onSelect={setSelected} onPolygon={setPoly} plotted={plotted} colorBy={colorBy} split={split} />}</div>

        {/* right: what the marker colour means + time-lapse */}
        <div className="absolute left-3 right-3 top-[100px] z-20 overflow-hidden lg:left-auto lg:right-3 lg:top-3 lg:w-[360px] rounded-2xl bg-white shadow-[0_18px_50px_-12px_rgba(6,40,29,.5)] ring-1 ring-black/10">
          <button onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen} className="relative flex w-full items-center justify-between gap-2 bg-gradient-to-r from-[#0a3a2a] to-[#14573a] px-4 py-3 text-left text-white">
            <span className="inline-flex items-center gap-2 text-[14px] font-bold"><Palette size={16} aria-hidden />{U.panel}</span>
            <span className="inline-flex items-center gap-2"><span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-white/20">{modeLabel[colorBy]}</span><ChevronUp size={15} className={`transition-transform ${panelOpen ? "" : "rotate-180"}`} /></span>
          </button>
          <AnimatePresence initial={false}>
            {panelOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <div className="max-h-[48dvh] space-y-4 overflow-y-auto px-4 pb-4 pt-3.5 lg:max-h-none lg:overflow-visible">
                  {/* 1. choose what the colour shows */}
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#14573a] text-[11px] text-white">1</span>{U.q}</div>
                    <div className="grid grid-cols-3 gap-2" role="group">
                      {MODES.map(({ id, icon: Icon }) => {
                        const on = colorBy === id;
                        return (
                          <motion.button key={id} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setColorBy(id)} aria-pressed={on} className={`relative flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center transition-colors ${on ? "text-[#0e3b29]" : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                            {on && <motion.span layoutId="mode-bg" className="absolute inset-0 rounded-xl bg-emerald-50 shadow-[0_6px_18px_-6px_rgba(27,122,69,.55)] ring-2 ring-[#1b7a45]" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                            <Icon size={16} className="relative" aria-hidden />
                            <span className="relative text-[11.5px] font-bold leading-tight">{modeLabel[id]}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={colorBy} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="space-y-3">
                      <p className="flex gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] leading-snug text-emerald-950"><Info size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />{U.explain[colorBy]}</p>

                      {colorBy === "decade" && (
                        <div>
                          <div className="relative h-3.5 rounded-full shadow-inner" style={{ background: RAMP_CSS }}>
                            <motion.span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-slate-900/80 shadow-md" animate={{ left: `${Math.min(100, Math.max(0, ((Math.min(years[1], 2025) - 1850) / 175) * 100))}%` }} transition={{ type: "spring", stiffness: 180, damping: 22 }} />
                          </div>
                          <div className="mt-1.5 flex justify-between text-[12px] font-bold tabular-nums text-slate-700"><span>1850</span><span>1900</span><span>1950</span><span>2025</span></div>
                          <div className="flex justify-between text-[12px] text-slate-600"><span>← {U.old}</span><span>{U.new} →</span></div>
                        </div>
                      )}

                      {colorBy === "iucn" && (
                        <div>
                          <ul className="grid gap-1">
                            {(["CR", "EN", "VU", "NT", "LC", "DD", "NE"] as IUCN[]).map((k, i) => {
                              const on = iucn.includes(k), dim = iucn.length > 0 && !on;
                              return (
                                <motion.li key={k} initial={{ opacity: 0, x: 10 }} animate={{ opacity: dim ? 0.45 : 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                                  <button onClick={() => setIucn((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))} aria-pressed={on} className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${on ? "bg-emerald-50 ring-1 ring-emerald-300" : "hover:bg-slate-50"}`}>
                                    <span className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white transition-transform group-hover:scale-125" style={{ background: IUCN_MAP_COLOR[k], boxShadow: "0 0 0 1px rgba(0,0,0,.18)" }} />
                                    <b className="w-7 text-slate-800">{k}</b>
                                    <span className="min-w-0 flex-1 truncate text-slate-600">{IUCN_INFO[k][lang]}</span>
                                    <span className="rounded-full bg-slate-100 px-1.5 text-[11.5px] font-semibold tabular-nums text-slate-500">{iucnCount[k] ?? 0}</span>
                                  </button>
                                </motion.li>
                              );
                            })}
                          </ul>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-600"><MousePointerClick size={12} />{U.legendClick}</p>
                        </div>
                      )}

                      {colorBy === "change" && (
                        <>
                          <ul className="grid gap-1.5">
                            {(["lost", "down", "stable", "up", "new"] as const).map((k, i) => (
                              <motion.li key={k} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-2.5 text-[12.5px]">
                                <span className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white" style={{ background: CHANGE_COLOR[k], boxShadow: "0 0 0 1px rgba(0,0,0,.18)" }} />
                                <span className="leading-tight"><b className="text-slate-800">{U.ch[k][0]}</b> <span className="text-slate-500">— {U.ch[k][1]}</span></span>
                              </motion.li>
                            ))}
                          </ul>
                          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <div className="flex items-center justify-between text-[12.5px] font-bold text-slate-800"><span>{U.split}</span><motion.span key={split} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="rounded-md bg-slate-900 px-2 py-0.5 tabular-nums text-white">{split}</motion.span></div>
                            <p className="mb-2 mt-0.5 text-[11.5px] leading-snug text-slate-500">{U.splitHint(split)}</p>
                            <input type="range" min={1900} max={2010} step={10} value={split} onChange={(e) => setSplit(+e.target.value)} className="split-range w-full" style={{ background: `linear-gradient(90deg, #6366F1 ${((split - 1900) / 110) * 100}%, #14573A ${((split - 1900) / 110) * 100}%)` }} />
                            <div className="mt-1.5 flex justify-between text-[11px] font-semibold"><span className="text-indigo-600">{U.earlier}</span><span className="text-[#14573a]">{U.later}</span></div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* 2. time */}
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-800"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#14573a] text-[11px] text-white">2</span>{U.time}</div>
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {playing && <span className="absolute inset-0 animate-ping rounded-full bg-[#1b8a3e]/40" />}
                        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setPlaying((p) => !p)} aria-label={playing ? t("atlas.pause") : t("atlas.play")} className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#2fa855] to-[#14573a] text-white shadow-lg transition hover:brightness-110">{playing ? <Pause size={20} /> : <Play size={20} className="translate-x-[1px]" />}</motion.button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold leading-tight text-slate-700">{playing ? U.playing : U.play}</div>
                        <div className="mt-0.5 flex items-baseline gap-2"><span className="text-[26px] font-extrabold leading-none tabular-nums text-[#0e3b29]">{years[1] > 2025 ? 2025 : years[1]}</span><span className="text-[12px] text-slate-500">{filtered.length.toLocaleString()} {U.specimens}</span></div>
                      </div>
                    </div>
                    <div className="relative mt-3">
                      <svg viewBox="0 0 280 38" className="h-10 w-full" role="group" aria-label={U.time}>
                        {hist.map((h) => { const w = 280 / 15, x = (h.decade < 1900 ? 0 : (h.decade - 1890) / 10) * w, bh = Math.max(3, (h.records / maxH) * 32); return (
                          <rect key={h.decade} x={x + 1} y={36 - bh} width={w - 2} height={bh} rx={2.5} fill={yearColor(h.decade + 5)} opacity={h.decade <= years[1] ? 1 : 0.22} className="cursor-pointer transition-opacity hover:opacity-100" onClick={() => { setPlaying(false); setYears([1840, Math.min(2026, h.decade + 9)]); }}><title>{h.decade < 1900 ? "<1900" : `${h.decade}s`}: {h.records}</title></rect>
                        ); })}
                        <motion.rect y={0} width={1.6} height={38} fill="#0F172A" animate={{ x: (Math.max(1890, Math.min(years[1], 2030)) - 1890) / 10 * (280 / 15) }} transition={{ type: "spring", stiffness: 160, damping: 24 }} />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-500"><span>1890</span><span>{U.histHint}</span><span>2020</span></div>
                    <AnimatePresence>{years[1] < 2026 && !playing && (
                      <motion.button initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onClick={() => setYears([1840, 2026])} className="mt-2 w-full rounded-lg bg-white py-1.5 text-[12.5px] font-semibold text-[#14573a] ring-1 ring-emerald-300 hover:bg-emerald-50">{U.showAll}</motion.button>
                    )}</AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* selected specimen */}
        <AnimatePresence>
          {sel && (
            <motion.div key={sel.id} initial={{ opacity: 0, x: -24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -16 }} transition={{ type: "spring", stiffness: 340, damping: 30 }} className="absolute inset-x-0 bottom-0 z-40 flex max-h-[78%] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-18px_44px_-10px_rgba(6,40,29,.5)] ring-1 ring-black/5 sm:inset-x-auto sm:left-3 sm:bottom-auto sm:top-[112px] sm:max-h-[calc(100%-10rem)] sm:w-[340px] sm:rounded-2xl">
              <div className="relative h-[130px] shrink-0 overflow-hidden bg-[#efe6d0] sm:h-[170px]">
                {sel.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbUrl(sel, 600)} alt={sel.binomial} decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover object-top" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
                <div className="absolute inset-0 bg-gradient-to-t from-[#04251a]/85 via-[#04251a]/10 to-transparent" />
                <button onClick={() => setSelected(null)} className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60" aria-label="close"><X size={16} /></button>
                <span className="absolute left-3 top-3"><IucnChip code={sel.iucn} compact /></span>
                <div className="absolute inset-x-4 bottom-3">
                  <div className="truncate text-[19px] font-bold italic leading-tight text-white">{sel.binomial}</div>
                  <div className="truncate text-[13px] text-white/80">{sel.authority} {sel.authority && "· "}{sel.family}</div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1.5 pr-2.5"><Flag country={sel.country} />{sel.country}</span>
                  {sel.year ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{sel.year}</span> : null}
                </div>
                <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 text-[13.5px]">
                  {rows(sel).map(([k, v]) => (<Fragment key={k}><dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt><dd className="break-words text-slate-800">{v}</dd></Fragment>))}
                </dl>
              </div>
              <div className="shrink-0 space-y-2 border-t border-slate-100 bg-slate-50/70 p-3">
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => openSpecimen(sel.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14573a] py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0e4a30]"><Leaf size={15} />{lang === "uz" ? "Namuna sahifasini ochish" : "Open specimen page"}</motion.button>
                <div className="grid grid-cols-2 gap-2 text-[13px] font-semibold text-slate-700">
                  <a href={`https://www.google.com/maps?q=${sel.lat},${sel.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 hover:border-emerald-600 hover:text-emerald-800"><MapPinned size={14} />{t("atlas.gmaps")}</a>
                  {sel.gbifUrl ? <a href={sel.gbifUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 hover:border-emerald-600 hover:text-emerald-800"><ExternalLink size={14} />{t("atlas.gbif")}</a> : <span />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
