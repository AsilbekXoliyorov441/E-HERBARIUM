"use client";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { animate, AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CalendarRange, ChevronDown, Globe2, ChevronLeft, ChevronRight, Download, HelpCircle, Leaf, LogIn, LogOut, Layers, LayoutGrid, Table2, ArrowUp, ArrowDown, ArrowUpDown, MapPin, Crosshair, Image as ImageIcon, Minus, MousePointerClick, Plus, Search, X, Settings2, ShieldAlert } from "lucide-react";
import { Specimen, thumbUrl } from "@/lib/data";
import { compare, decadeStats } from "@/lib/analysis";
import type { Category, SpeciesChange } from "@/lib/analysis";
import { useLang } from "@/lib/i18n";
import Flag from "@/components/Flag";
import Select from "@/components/Select";
import { DataStrip } from "@/components/DataPanel";
import { IucnChip } from "@/components/SpecimenCard";

type Cat = Exclude<Category, "stable">;
type SortKey = "delta" | "name" | "records" | "family" | "nA" | "nB";

/** Same colours as the map's "Change" mode, so the page and the map read the same way. */
const CATS: { id: Cat; color: string; soft: string; icon: typeof LogOut }[] = [
  { id: "lost", color: "#DC2626", soft: "#FEF2F2", icon: LogOut },
  { id: "down", color: "#EA580C", soft: "#FFF7ED", icon: ArrowDownRight },
  { id: "up", color: "#16A34A", soft: "#F0FDF4", icon: ArrowUpRight },
  { id: "new", color: "#0F766E", soft: "#F0FDFA", icon: LogIn },
];
const COLOR = Object.fromEntries(CATS.map((c) => [c.id, c.color])) as Record<Cat, string>;
const COL_A = "#6366F1", COL_B = "#14573A", COL_OFF = "#CBD5E1";
const DECADES = [1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const PAGE = 12;
const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
const km = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const PRESETS = [{ a: 1850, split: 1950, b: 2025 }, { a: 1850, split: 1970, b: 2025 }, { a: 1900, split: 1980, b: 2025 }, { a: 1920, split: 1990, b: 2025 }];

const L = {
  title: { uz: "O‘simliklar qanday o‘zgaryapti?", en: "How is the flora changing?" },
  lead: { uz: "Eski va yangi gerbariy namunalarini solishtirib, qaysi o‘simliklar kamayayotganini, qaysilari ko‘payayotganini ko‘ring.", en: "Compare older and newer herbarium specimens to see which plants are declining and which are increasing." },
  s1: { uz: "Ikki davrni tanlang", en: "Pick two time periods" },
  s1d: { uz: "Tizim shu ikki davrdagi namunalarni solishtiradi.", en: "The tool compares the specimens collected in these two periods." },
  s2: { uz: "Natijani o‘qing", en: "Read the result" },
  s2d: { uz: "Har bir o‘simlik to‘rt guruhdan biriga tushadi.", en: "Every plant falls into one of four groups." },
  s3: { uz: "Xaritada ko‘ring", en: "See it on the map" },
  s3d: { uz: "O‘zgarishni xaritada rangli nuqtalar bilan ko‘rsatamiz.", en: "We show the change on the map with coloured dots." },
  region: { uz: "Qaysi hudud?", en: "Which area?" },
  all: { uz: "Butun O‘rta Osiyo", en: "All Central Asia" },
  presets: { uz: "Tayyor tanlov", en: "Quick picks" },
  periodA: { uz: "A — oldingi davr", en: "A — earlier period" },
  periodB: { uz: "B — keyingi davr", en: "B — later period" },
  other: { uz: "Tanlanmagan yillar", en: "Not selected" },
  chartTitle: { uz: "Qaysi yillarda nechta namuna yig‘ilgan", en: "How many specimens were collected, by decade" },
  chartHint: { uz: "Har bir ustun — bir o‘nyillik. Rangi ustun qaysi davrga tushishini bildiradi.", en: "Each bar is one decade. Its colour shows which period it belongs to." },
  specimens: { uz: "namuna", en: "specimens" },
  splitYear: { uz: "Qaysi yildan boshlab “yangi davr” hisoblansin?", en: "From which year does the “later period” start?" },
  splitHint: { uz: "Shu yilgacha yig‘ilgan namunalar — eski davr (A), shundan keyin — yangi davr (B). Grafikdagi ustunni bosib ham tanlashingiz mumkin.", en: "Specimens collected before this year are the earlier period (A), the rest are the later period (B). You can also click a bar in the chart." },
  advanced: { uz: "Qo‘shimcha sozlamalar", en: "Advanced" },
  start: { uz: "A davr boshlanishi", en: "A starts" },
  end: { uz: "B davr tugashi", en: "B ends" },
  headline: { uz: "Natija", en: "Result" },
  lost: { uz: "Yo‘qolgan", en: "Disappeared" },
  lostD: { uz: "Oldin kamida 2 marta topilgan, endi bir marta ham topilmagan.", en: "Found at least twice in A, never found in B." },
  down: { uz: "Kamaymoqda", en: "Declining" },
  downD: { uz: "Hozir avvalgiga qaraganda kamida 1,5 marta kam uchraydi.", en: "Now at least 1.5× less common than before." },
  up: { uz: "Ko‘paymoqda", en: "Increasing" },
  upD: { uz: "Hozir avvalgiga qaraganda kamida 1,5 marta ko‘p uchraydi.", en: "Now at least 1.5× more common than before." },
  new: { uz: "Yangi paydo bo‘lgan", en: "Newly appeared" },
  newD: { uz: "Oldin topilmagan, endi kamida 2 marta topilgan.", en: "Not found in A, found at least twice in B." },
  species: { uz: "tur", en: "species" },
  clickFilter: { uz: "Pastdagi ro‘yxatni shu guruh bilan filtrlash", en: "Filter the list below by this group" },
  moversT: { uz: "Eng ko‘p o‘zgargan o‘simliklar", en: "Plants that changed the most" },
  moversD: { uz: "Bosing — xaritada shu o‘simlikning joylashuvi ochiladi.", en: "Click one to open its locations on the map." },
  tabLoss: { uz: "Kamayganlar", en: "Declining" },
  tabGain: { uz: "Ko‘payganlar", en: "Increasing" },
  famT: { uz: "Qaysi oilalarda o‘zgarish ko‘p?", en: "Which plant families changed most?" },
  famD: { uz: "Oila — bir-biriga yaqin o‘simliklar guruhi (masalan, Qo‘ng‘irbosh-doshlar).", en: "A family is a group of related plants (e.g. the daisy family)." },
  famLoss: { uz: "Kamaygan / yo‘qolgan", en: "Declining / disappeared" },
  famGain: { uz: "Ko‘paygan / yangi", en: "Increasing / new" },
  listT: { uz: "Barcha o‘zgargan o‘simliklar", en: "All plants that changed" },
  search: { uz: "Nomi yoki oilasi bo‘yicha qidirish…", en: "Search by name or family…" },
  sort: { uz: "Tartib", en: "Sort" },
  sDelta: { uz: "Eng katta o‘zgarish", en: "Biggest change" },
  sName: { uz: "Nomi (A–Z)", en: "Name (A–Z)" },
  sRecords: { uz: "Eng ko‘p namuna", en: "Most specimens" },
  plant: { uz: "O‘simlik", en: "Plant" },
  group: { uz: "Guruh", en: "Group" },
  story: { uz: "Nima o‘zgargan", en: "What changed" },
  share: { uz: "Ulushi", en: "Share" },
  onMap: { uz: "Xaritada", en: "On map" },
  empty: { uz: "Mos o‘simlik topilmadi.", en: "Nothing matches." },
  showing: { uz: "Ko‘rsatilmoqda", en: "Showing" },
  prev: { uz: "Oldingi", en: "Previous" },
  next: { uz: "Keyingi", en: "Next" },
  export: { uz: "CSV yuklash", en: "Download CSV" },
  mapBtn: { uz: "Xaritada ko‘rish", en: "Open on map" },
  mapCta: { uz: "Xaritada qizil va to‘q yashil nuqtalar — kamaygan va ko‘paygan joylar. Sichqoncha bilan har bir nuqtani ko‘rishingiz mumkin.", en: "On the map, red and green dots show where plants declined or increased. Hover any dot to inspect it." },
  how: { uz: "Bu qanday hisoblanadi?", en: "How is this calculated?" },
  method: { uz: "Nima uchun “ulush”?", en: "Why “share”?" },
  methodD: { uz: "Har bir davrda yig‘ilgan namunalar soni har xil. Shuning uchun “nechta topilgan” emas, “har 100 ta namunadan nechtasi shu o‘simlik” deb solishtiriladi.", en: "Different numbers of specimens were collected in each period, so we compare “out of every 100 specimens, how many were this plant” rather than raw counts." },
  limits: { uz: "Ehtiyot bo‘ling", en: "Be careful" },
  limitsD: { uz: "“Topilmagan” degani “yo‘qolgan” degani emas: bu o‘simlik shunchaki kam yig‘ilgan yoki raqamlashtirilmagan bo‘lishi mumkin. Natijalar rasmiy IUCN bahosi emas.", en: "“Not found” does not mean “extinct” — it may simply not have been collected or digitised. This is not an official IUCN assessment." },
  source: { uz: "Ma’lumot manbasi", en: "Data source" },
  sourceD: { uz: "GBIF.org namunalari (CC0 / CC BY / CC BY-NC). Rasm egalariga havola qiling.", en: "GBIF.org occurrence records (CC0 / CC BY / CC BY-NC). Please credit image owners." },
  basisT: { uz: "Bu natijalar qaysi ma’lumotga asoslangan?", en: "What data are these results based on?" },
  basisUsed: { uz: "ta namuna asosida hisoblandi", en: "specimens were used for this result" },
  basisFrom: { uz: "Hammasi GBIF.org (Global Biodiversity Information Facility) ochiq bazasidan olingan. Namunalarni dunyo gerbariylari yuborgan.", en: "All records come from the open GBIF.org database (Global Biodiversity Information Facility), contributed by herbaria worldwide." },
  fLoaded: { uz: "GBIF’dan yuklangan jami namunalar", en: "Total specimens loaded from GBIF" },
  fYear: { uz: "Shundan yig‘ilgan yili ma’lum", en: "…of which the collection year is known" },
  fRegion: { uz: "Tanlangan hudud bo‘yicha", en: "…in the selected area" },
  fUsed: { uz: "Tanlangan ikki davrga tushgan (hisobda ishlatilgan)", en: "…inside the two chosen periods (used)" },
  srcT: { uz: "Namunalar qaysi muassasadan kelgan", en: "Which institution each specimen comes from" },
  srcHint: { uz: "Hisobda ishlatilgan namunalar bo‘yicha. GBIF orqali yuborgan gerbariylar:", en: "Among the specimens used. Herbaria that contributed through GBIF:" },
  srcNone: { uz: "Muassasa ko‘rsatilmagan", en: "Institution not stated" },
  srcOther: { uz: "boshqa muassasalar", en: "other institutions" },
  inst: { uz: "ta muassasa", en: "institutions" },
  listSub: { uz: "Istalgan narsa bo‘yicha qidiring: nom, oila, yig‘uvchi, muassasa, joy yoki koordinata.", en: "Search by anything: name, family, collector, institution, place or coordinates." },
  searchAny: { uz: "Nom, oila, yig‘uvchi, muassasa, joy yoki koordinata (41.3, 69.2)…", en: "Name, family, collector, institution, place or coordinates (41.3, 69.2)…" },
  fAllGroups: { uz: "Hammasi", en: "All" },
  fCountry: { uz: "Davlat", en: "Country" },
  fFamily: { uz: "Oila", en: "Family" },
  fInst: { uz: "Muassasa", en: "Institution" },
  fStatus: { uz: "Himoya holati", en: "Conservation status" },
  anyOpt: { uz: "Hammasi", en: "Any" },
  onlyPhoto: { uz: "Faqat rasmli", en: "With photo only" },
  coordBtn: { uz: "Koordinata bo‘yicha", en: "By coordinates" },
  coordT: { uz: "Shu nuqta atrofidagi o‘simliklar", en: "Plants around this point" },
  coordD: { uz: "Kenglik va uzunlikni kiriting yoki “41.3, 69.2” ni birinchi maydonga qo‘ying. Shu nuqtadan tanlangan masofadagi namunalar topilgan o‘simliklar ko‘rsatiladi.", en: "Enter latitude and longitude, or paste “41.3, 69.2” into the first field. Plants with specimens within the chosen distance are shown." },
  lat: { uz: "Kenglik (lat)", en: "Latitude" },
  lng: { uz: "Uzunlik (lng)", en: "Longitude" },
  radius: { uz: "Masofa", en: "Distance" },
  clearAll: { uz: "Hammasini tozalash", en: "Clear all" },
  viewTable: { uz: "Jadval", en: "Table" },
  colNo: { uz: "№", en: "#" },
  colChange: { uz: "O‘zgarish", en: "Change" },
  colCountries: { uz: "Davlatlar", en: "Countries" },
  colSpecimens: { uz: "Namunalar", en: "Specimens" },
  colStatus: { uz: "Holati (IUCN)", en: "Status (IUCN)" },
  colChangeHint: { uz: "Har 100 namunadagi ulushning o‘zgarishi (B − A)", en: "Change in share per 100 specimens (B − A)" },
  viewGrid: { uz: "Kartalar", en: "Cards" },
  viewList: { uz: "Ro‘yxat", en: "List" },
  nSpec: { uz: "namuna", en: "specimens" },
  lowSample: { uz: "Tanlangan davrlarda namuna kam — natijalarga ehtiyot bo‘lib qarang.", en: "Few specimens in these periods — treat results with caution." },
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.1 }, transition: { duration: 0.6, ease: EASE } } as const;

function CountUp({ to, format }: { to: number; format: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 1, ease: EASE, onUpdate: (x) => setV(Math.round(x)) }); return () => c.stop(); }, [to]);
  return <>{format(v)}</>;
}

function Badge({ cat, label, iconOnlyMobile = false }: { cat: Cat; label: string; iconOnlyMobile?: boolean }) {
  const c = CATS.find((x) => x.id === cat)!;
  const Icon = c.icon;
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ color: c.color, background: c.soft, boxShadow: `inset 0 0 0 1px ${c.color}40` }} title={label}><Icon size={13} aria-hidden />{iconOnlyMobile ? <><span className="sr-only sm:not-sr-only">{label}</span></> : label}</span>;
}

/** One chart, one idea: specimens per decade, coloured by period A / B. */
function PeriodChart({ stats, from, split, to, t, lang, onPick }: { onPick: (decade: number) => void; stats: { decade: number; records: number }[]; from: number; split: number; to: number; t: (k: keyof typeof L) => string; lang: "uz" | "en" }) {
  const [hover, setHover] = useState<number | null>(null);
  const byD = new Map(stats.map((s) => [s.decade, s.records]));
  const max = Math.max(1, ...stats.map((s) => s.records));
  const W = 760, H = 150, left = 34, top = 14, bottom = 28;
  const bw = (W - left - 8) / DECADES.length;
  const ch = H - top - bottom;
  const periodOf = (d: number) => (d + 5 >= from && d + 5 < split ? "A" : d + 5 >= split && d + 5 <= to + 5 ? "B" : "-");
  const colorOf = (d: number) => ({ A: COL_A, B: COL_B, "-": COL_OFF }[periodOf(d)]);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const splitX = left + ((Math.min(Math.max(split, 1890), 2030) - 1890) / 10) * bw;
  return (
    <div>
    <div className={`-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 ${'[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}`}>
    <div className="relative min-w-[560px] sm:min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("chartTitle")} onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => { const y = top + ch - (v / max) * ch; return <g key={v}><line x1={left} x2={W - 8} y1={y} y2={y} stroke="#E2E8F0" /><text x={left - 6} y={y + 4} textAnchor="end" fontSize="12" fill="#64748B">{v}</text></g>; })}
        {DECADES.map((d, i) => {
          const v = byD.get(d) ?? 0, h = (v / max) * ch;
          return <motion.rect key={d} x={left + i * bw + 5} width={bw - 10} rx={4} fill={colorOf(d)} initial={{ y: top + ch, height: 0 }} animate={{ y: top + ch - h, height: h, opacity: hover === null || hover === i ? 1 : 0.55 }} transition={{ duration: 0.6, ease: EASE }} />;
        })}
        <line x1={splitX} x2={splitX} y1={top} y2={top + ch} stroke="#0F172A" strokeWidth="1.5" strokeDasharray="4 3" />
        <g transform={`translate(${Math.min(splitX, W - 96)},${top - 2})`}><rect width="88" height="20" rx="10" fill="#0F172A" /><text x="44" y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{split}</text></g>
        {DECADES.map((d, i) => <text key={d} x={left + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#475569">{d < 1900 ? "<1900" : `${d}s`}</text>)}
        {DECADES.map((d, i) => <rect key={d} x={left + i * bw} y={top} width={bw} height={ch + bottom} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHover(i)} onClick={() => onPick(d)} />)}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-1 rounded-lg bg-slate-900 px-3 py-2 text-[13px] text-white shadow-lg" style={{ left: `${Math.min(80, ((left + hover * bw + bw / 2) / W) * 100)}%` }}>
          <div className="font-semibold">{DECADES[hover] < 1900 ? "<1900" : `${DECADES[hover]}–${DECADES[hover] + 9}`}</div>
          <div><b>{byD.get(DECADES[hover]) ?? 0}</b> {t("specimens")}</div>
          <div className="text-[12px] text-white/70">{periodOf(DECADES[hover]) === "A" ? "A" : periodOf(DECADES[hover]) === "B" ? "B" : (lang === "uz" ? "tanlanmagan" : "not selected")}</div>
        </div>
      )}
    </div>
    </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-600">
        {[[COL_A, t("periodA")], [COL_B, t("periodB")], [COL_OFF, t("other")]].map(([c, l]) => <span key={l} className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded" style={{ background: c }} />{l}</span>)}
      </div>
    </div>
  );
}

function sentence(r: SpeciesChange, lang: "uz" | "en") {
  const f = (x: number) => (x * 100).toFixed(1);
  if (r.category === "lost") return lang === "uz" ? `A davrda ${r.nA} marta topilgan, B davrda bir marta ham topilmagan` : `Found ${r.nA}× in A, never in B`;
  if (r.category === "new") return lang === "uz" ? `A davrda topilmagan, B davrda ${r.nB} marta topilgan` : `Not found in A, found ${r.nB}× in B`;
  return lang === "uz" ? `Har 100 namunadan ${f(r.shareA)} tasi edi, endi ${f(r.shareB)} tasi` : `Was ${f(r.shareA)} of every 100 specimens, now ${f(r.shareB)}`;
}

const PlantThumb = memo(function PlantThumb({ s, size = 44 }: { s?: Specimen; size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#efe6d0] ring-1 ring-black/5" style={{ width: size * 0.8, height: size }}>
      {s?.image ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbUrl(s, 100)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} className="h-full w-full object-cover object-top" />) : <Leaf size={15} className="text-emerald-700/40" />}
    </span>
  );
}, (a, b) => a.s === b.s && a.size === b.size);

export default function DynamicsView({ all, onShowOnMap, onChangeMap, onOpenSpecimen }: { all: Specimen[]; onShowOnMap: (binomial: string) => void; onChangeMap: (split: number) => void; onOpenSpecimen: (id: string) => void }) {
  const { lang } = useLang();
  const t = (k: keyof typeof L) => L[k][lang];
  const [country, setCountry] = useState("All");
  const [split, setSplit] = useState(1970);
  const [from, setFrom] = useState(1850);
  const [to, setTo] = useState(2025);
  const [adv, setAdv] = useState(false);
  const [cat, setCat] = useState<Cat | "all">("all");
  const [tab, setTab] = useState<"loss" | "gain">("loss");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("delta");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const sortBy = (k: SortKey) => { if (k === sort) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir(k === "name" || k === "family" ? "asc" : "desc"); } setPage(0); };
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"grid" | "table">("table");
  // < md always shows cards; initialised in an effect so SSR/hydration stays on the desktop value
  const [isMd, setIsMd] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setIsMd(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const viewMode: "grid" | "table" = isMd ? view : "grid";
  const [fCountry, setFCountry] = useState("");
  const [fFamily, setFFamily] = useState("");
  const [fInst, setFInst] = useState("");
  const [fIucn, setFIucn] = useState("");
  const [onlyImg, setOnlyImg] = useState(false);
  const [coordOn, setCoordOn] = useState(false);
  const [latS, setLatS] = useState("");
  const [lngS, setLngS] = useState("");
  const [radius, setRadius] = useState(100);
  const stepSplit = (d: number) => { setSplit((v) => Math.min(to - 10, Math.max(from + 10, v + d))); setPage(0); };
  const num = (n: number) => n.toLocaleString(lang === "uz" ? "uz-UZ" : "en-US");

  const countries = useMemo(() => Array.from(new Set(all.filter((s) => s.real && s.country).map((s) => s.country))).sort(), [all]);
  const pool = useMemo(() => all.filter((s) => s.real && s.year && (country === "All" || s.country === country)), [all, country]);
  // comparison is cheap (a few ms for 10k specimens) so it is memoised on the main thread; the deferred copies keep slider drags smooth
  const dFrom = useDeferredValue(from), dSplit = useDeferredValue(split), dTo = useDeferredValue(to);
  const stats = useMemo(() => decadeStats(pool), [pool]);
  const { rows, totalA, totalB } = useMemo(() => compare(pool, { from: dFrom, to: dSplit - 1 }, { from: dSplit, to: dTo }), [pool, dFrom, dSplit, dTo]);
  const classified = useMemo(() => rows.filter((r) => r.category !== "stable"), [rows]);
  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c.id, classified.filter((r) => r.category === c.id).length])) as Record<Cat, number>, [classified]);
  const images = useMemo(() => { const m = new Map<string, Specimen>(); for (const x of pool) if (x.image && !m.has(x.binomial)) m.set(x.binomial, x); return m; }, [pool]);
  const splitPct = Math.round(((split - (from + 10)) / Math.max(1, to - 10 - (from + 10))) * 100);
  const basis = useMemo(() => {
    const real = all.filter((x) => x.real);
    const used = pool.filter((x) => x.year >= from && x.year <= to);
    const m = new Map<string, number>();
    for (const x of used) { const k = (x.institution || "").trim(); m.set(k, (m.get(k) ?? 0) + 1); }
    const rowsI = [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
    return { loaded: real.length, withYear: real.filter((x) => x.year).length, region: pool.length, used: used.length, inst: rowsI };
  }, [all, pool, from, to]);
  const lowSample = totalA < 30 || totalB < 30;
  const declined = counts.lost + counts.down, grew = counts.up + counts.new;

  const movers = useMemo(() => (tab === "loss" ? rows.filter((r) => r.category !== "stable" && r.delta < 0).sort((a, b) => a.delta - b.delta) : rows.filter((r) => r.category !== "stable" && r.delta > 0).sort((a, b) => b.delta - a.delta)).slice(0, 6), [rows, tab]);
  const families = useMemo(() => {
    const m = new Map<string, { loss: number; gain: number }>();
    for (const r of classified) { const e = m.get(r.family) ?? { loss: 0, gain: 0 }; if (r.category === "lost" || r.category === "down") e.loss++; else e.gain++; m.set(r.family, e); }
    return [...m.entries()].map(([family, e]) => ({ family, ...e })).sort((x, y) => y.loss + y.gain - (x.loss + x.gain)).slice(0, 6);
  }, [classified]);
  const famMax = Math.max(1, ...families.map((f) => Math.max(f.loss, f.gain)));

  // species -> its specimens inside the two chosen periods (drives every "search by anything" filter)
  const specIndex = useMemo(() => {
    const m = new Map<string, Specimen[]>();
    for (const x of pool) if (x.year >= from && x.year <= to) { const a = m.get(x.binomial); if (a) a.push(x); else m.set(x.binomial, [x]); }
    return m;
  }, [pool, from, to]);
  const opts = useMemo(() => {
    const c = new Set<string>(), f = new Set<string>(), i = new Set<string>(), k = new Set<string>();
    for (const r of classified) { f.add(r.family); for (const x of specIndex.get(r.binomial) ?? []) { if (x.country) c.add(x.country); if (x.institution) i.add(x.institution); k.add(x.iucn); } }
    const srt = (z: Set<string>) => [...z].sort((a, b) => a.localeCompare(b));
    return { countries: srt(c), families: srt(f), insts: srt(i), iucn: ["CR", "EN", "VU", "NT", "LC", "DD", "NE"].filter((x) => k.has(x)) };
  }, [classified, specIndex]);

  const qCoord = useMemo(() => { const m = q.match(COORD_RE); return m ? { lat: +m[1], lng: +m[2] } : null; }, [q]);
  const centre = useMemo(() => {
    if (qCoord) return qCoord;
    const la = parseFloat(latS), ln = parseFloat(lngS);
    return coordOn && Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null;
  }, [qCoord, coordOn, latS, lngS]);

  const filtersActive = (cat !== "all" ? 1 : 0) + (q.trim() ? 1 : 0) + (fCountry ? 1 : 0) + (fFamily ? 1 : 0) + (fInst ? 1 : 0) + (fIucn ? 1 : 0) + (onlyImg ? 1 : 0) + (coordOn && centre ? 1 : 0);
  const secondaryActive = (fCountry ? 1 : 0) + (fFamily ? 1 : 0) + (fInst ? 1 : 0) + (fIucn ? 1 : 0) + (onlyImg ? 1 : 0);
  const resetFilters = () => { setCat("all"); setQ(""); setFCountry(""); setFFamily(""); setFInst(""); setFIucn(""); setOnlyImg(false); setCoordOn(false); setLatS(""); setLngS(""); setPage(0); };

  const list = useMemo(() => {
    const needle = qCoord ? "" : q.trim().toLowerCase();
    const perSpec = !!(fCountry || fInst || fIucn || centre || needle);
    const l = classified.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (fFamily && r.family !== fFamily) return false;
      if (onlyImg && !images.has(r.binomial)) return false;
      if (!perSpec) return true;
      const speciesText = !!needle && (r.binomial.toLowerCase().includes(needle) || r.family.toLowerCase().includes(needle));
      return (specIndex.get(r.binomial) ?? []).some((x) => {
        if (fCountry && x.country !== fCountry) return false;
        if (fInst && x.institution !== fInst) return false;
        if (fIucn && x.iucn !== fIucn) return false;
        if (centre && km(centre.lat, centre.lng, x.lat, x.lng) > radius) return false;
        if (needle && !speciesText) return [x.collector, x.institution, x.country, x.region, x.locality, x.tashBarcode, x.catalog].some((v) => v && String(v).toLowerCase().includes(needle));
        return true;
      });
    });
    const cmp: Record<SortKey, (x: SpeciesChange, y: SpeciesChange) => number> = {
      delta: (x, y) => Math.abs(y.delta) - Math.abs(x.delta),
      name: (x, y) => x.binomial.localeCompare(y.binomial),
      records: (x, y) => y.nA + y.nB - (x.nA + x.nB),
      family: (x, y) => x.family.localeCompare(y.family) || x.binomial.localeCompare(y.binomial),
      nA: (x, y) => y.nA - x.nA,
      nB: (x, y) => y.nB - x.nB,
    };
    const natural: Record<SortKey, "asc" | "desc"> = { delta: "desc", name: "asc", records: "desc", family: "asc", nA: "desc", nB: "desc" };
    const out = [...l].sort(cmp[sort]);
    return dir === natural[sort] ? out : out.reverse();
  }, [classified, cat, q, qCoord, sort, dir, fCountry, fFamily, fInst, fIucn, onlyImg, centre, radius, specIndex, images]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const pageItems = list.slice(cur * PAGE, cur * PAGE + PAGE);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["species", "family", "category", `records_${from}_${split - 1}`, `records_${split}_${to}`, "share_A_pct", "share_B_pct", "delta_pp"];
    const body = list.map((r) => [r.binomial, r.family, r.category, r.nA, r.nB, (r.shareA * 100).toFixed(2), (r.shareB * 100).toFixed(2), r.delta.toFixed(2)].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `flora_change_${from}-${split}-${to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  // clicking a plant opens the single page of its best specimen (one with a photo if possible)
  const openPlant = (binomial: string) => { const sp = images.get(binomial) ?? specIndex.get(binomial)?.[0] ?? pool.find((x) => x.binomial === binomial); if (sp) onOpenSpecimen(sp.id); };
  const maxDelta = Math.max(0.5, ...list.map((x) => Math.abs(x.delta)));
  const SortTh = ({ k, label, right = false, title }: { k: SortKey; label: string; right?: boolean; title?: string }) => {
    const on = sort === k;
    const Icon = !on ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th scope="col" aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-3 ${right ? "text-right" : ""}`} title={title}>
        <button onClick={() => sortBy(k)} className={`inline-flex items-center gap-1 uppercase tracking-wide transition ${on ? "text-[#14573a]" : "hover:text-slate-800"} ${right ? "flex-row-reverse" : ""}`}>{label}<Icon size={12} className={on ? "" : "opacity-40"} /></button>
      </th>
    );
  };
  const card = "min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)]";
  const chip = (on: boolean) => `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold transition ${on ? "bg-[#14573a] text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`;
  const StepHead = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#14573a] text-[13.5px] font-bold text-white">{n}</span>
      <div className="min-w-0"><h2 className="text-[16.5px] font-bold leading-tight text-slate-900">{title}</h2><p className="hidden text-[13px] text-slate-500 sm:block">· {desc}</p></div>
    </div>
  );

  return (
    <div className="bg-slate-50 pb-6">
      {/* compact hero */}
      <section className="relative isolate overflow-hidden bg-[#06281d] bg-cover bg-center" style={{ backgroundImage: "url(/bg-hero.webp)" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#06281d]/92 via-[#0a3a2a]/80 to-[#0c4a33]/60" />
        <div className="relative mx-auto grid max-w-[1680px] items-center gap-3 px-4 py-4 sm:gap-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-[66px]">
          <div className="text-white">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight sm:text-[26px] md:text-[30px]">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-[13.5px] sm:text-[14.5px] leading-snug text-emerald-50/85">{t("lead")}</p>
          </div>
          <ol className={`-mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-0.5 text-[13px] font-semibold text-white sm:mx-0 sm:flex-wrap sm:gap-2.5 sm:overflow-visible sm:px-0 sm:text-[14px] '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'`}>
            {[t("s1"), t("s2"), t("s3")].map((s, i) => (<li key={s} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full bg-white/10 py-1 pl-1 pr-3.5 ring-1 ring-white/15 backdrop-blur"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[13px] font-bold text-[#14573a]">{i + 1}</span>{s}</li>))}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-[1680px] space-y-4 px-4 py-4 sm:px-6 lg:px-[66px]">
        {/* STEP 1 */}
        <section className={`${card} p-3 sm:p-4`}>
          <StepHead n={1} title={t("s1")} desc={t("s1d")} />
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[14px] font-bold text-slate-900">{t("chartTitle")} <span className="text-[12.5px] font-normal text-slate-500">· {t("chartHint")}</span></div>
              <PeriodChart stats={stats} from={from} split={split} to={to} t={t} lang={lang} onPick={(d) => { setSplit(Math.min(to - 10, Math.max(from + 10, d < 1900 ? 1900 : d))); setPage(0); }} />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">{t("region")}</div>
                  <Select value={country} onChange={(c) => { setCountry(c); setPage(0); }} icon={<Globe2 size={16} />}
                    options={[{ value: "All", label: t("all"), icon: <Globe2 size={16} className="text-emerald-700" /> }, ...countries.map((c) => ({ value: c, label: c, icon: <Flag country={c} /> }))]} />
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">{t("presets")}</div>
                  <Select value={`${from}-${split}-${to}`} icon={<CalendarRange size={16} />}
                    onChange={(v) => { const [a, sp, b] = v.split("-").map(Number); setFrom(a); setSplit(sp); setTo(b); setPage(0); }}
                    options={[
                      ...(PRESETS.some((p) => p.a === from && p.split === split && p.b === to) ? [] : [{ value: `${from}-${split}-${to}`, label: `${from}–${split - 1} → ${split}–${to}`, hint: lang === "uz" ? "Qo‘lda tanlangan" : "Custom", icon: <CalendarRange size={15} className="text-slate-400" /> }]),
                      ...PRESETS.map((p) => ({ value: `${p.a}-${p.split}-${p.b}`, label: `${p.a}–${p.split - 1} → ${p.split}–${p.b}`, icon: <CalendarRange size={15} className="text-emerald-700" /> })),
                    ]} />
                </div>
              </div>
              <div className="min-w-0 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div>
                  <div className="text-[14px] font-bold leading-snug text-slate-900">{t("splitYear")}</div>
                  <p className="mb-2.5 text-[12.5px] leading-snug text-slate-500">{t("splitHint")}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => stepSplit(-10)} disabled={split - 10 < from + 10} aria-label="-10" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-35 sm:h-9 sm:w-9"><Minus size={16} /></button>
                    <input type="range" min={from + 10} max={to - 10} step={10} value={split} onChange={(e) => { setSplit(+e.target.value); setPage(0); }} aria-label={t("splitYear")} className="split-range flex-1" style={{ background: `linear-gradient(90deg, ${COL_A} ${splitPct}%, ${COL_B} ${splitPct}%)` }} />
                    <button onClick={() => stepSplit(10)} disabled={split + 10 > to - 10} aria-label="+10" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-35 sm:h-9 sm:w-9"><Plus size={16} /></button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-[12.5px] font-semibold min-[420px]:grid-cols-2">
                    <div className="flex min-h-[44px] items-center rounded-lg px-2.5 py-1.5 sm:min-h-0" style={{ background: "#EEF2FF", color: COL_A }}>{lang === "uz" ? `Eski davr (A): ${from}–${split - 1}` : `Earlier (A): ${from}–${split - 1}`}</div>
                    <div className="flex min-h-[44px] items-center rounded-lg px-2.5 py-1.5 sm:min-h-0" style={{ background: "#ECFDF5", color: COL_B }}>{lang === "uz" ? `Yangi davr (B): ${split}–${to}` : `Later (B): ${split}–${to}`}</div>
                  </div>
                </div>
                <button onClick={() => setAdv((v) => !v)} aria-expanded={adv} className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 sm:mt-2 sm:min-h-0"><Settings2 size={13} />{t("advanced")}<ChevronDown size={13} className={`transition-transform ${adv ? "rotate-180" : ""}`} /></button>
                <AnimatePresence initial={false}>
                  {adv && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid gap-3 pt-3 sm:grid-cols-2">
                        <label className="block text-[13px] font-medium text-slate-600"><span className="flex justify-between"><span>{t("start")}</span><b className="tabular-nums text-slate-900">{from}</b></span><input type="range" min={1800} max={split - 10} step={10} value={from} onChange={(e) => { setFrom(+e.target.value); setPage(0); }} className="w-full accent-indigo-600" /></label>
                        <label className="block text-[13px] font-medium text-slate-600"><span className="flex justify-between"><span>{t("end")}</span><b className="tabular-nums text-slate-900">{to}</b></span><input type="range" min={split + 10} max={2025} step={5} value={to} onChange={(e) => { setTo(+e.target.value); setPage(0); }} className="w-full accent-emerald-700" /></label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="min-w-0 rounded-xl px-3 py-2 ring-1" style={{ background: "#EEF2FF", boxShadow: "inset 0 0 0 1px #C7D2FE" }}><div className="text-[12.5px] font-bold" style={{ color: COL_A }}>A · {from}–{split - 1}</div><div className="mt-0.5 text-[18px] font-bold leading-none tabular-nums text-slate-900 sm:text-[20px]"><CountUp to={totalA} format={num} /> <span className="text-[12px] font-normal text-slate-500">{t("specimens")}</span></div></div>
                <div className="min-w-0 rounded-xl px-3 py-2" style={{ background: "#ECFDF5", boxShadow: "inset 0 0 0 1px #A7F3D0" }}><div className="text-[12.5px] font-bold" style={{ color: COL_B }}>B · {split}–{to}</div><div className="mt-0.5 text-[18px] font-bold leading-none tabular-nums text-slate-900 sm:text-[20px]"><CountUp to={totalB} format={num} /> <span className="text-[12px] font-normal text-slate-500">{t("specimens")}</span></div></div>
              </div>
              {lowSample && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-900"><ShieldAlert size={15} className="mt-0.5 shrink-0" />{t("lowSample")}</p>}
            </div>
          </div>
        </section>

        {/* DATA BASIS: how many records, from where */}
        <motion.section {...reveal} className={`${card} p-3 sm:p-4`} aria-label={t("basisT")}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className="text-[16.5px] font-bold text-slate-900">{t("basisT")}</h2>
            <p className="text-[17px] font-bold text-[#14573a] sm:text-[18px]"><b className="tabular-nums"><CountUp to={basis.used} format={num} /></b> <span className="text-[14px] font-semibold text-slate-600">{t("basisUsed")}</span></p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <ol className="min-w-0 space-y-1.5">
              {([[basis.loaded, t("fLoaded")], [basis.withYear, t("fYear")], [basis.region, t("fRegion")], [basis.used, t("fUsed")]] as [number, string][]).map(([n, label], i, arr) => (
                <li key={label} className="relative overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                  <motion.div className="absolute inset-y-0 left-0" style={{ background: i === arr.length - 1 ? "#BBF7D0" : "#E2E8F0" }} initial={{ width: 0 }} animate={{ width: `${basis.loaded ? (n / basis.loaded) * 100 : 0}%` }} transition={{ duration: 0.7, ease: EASE }} />
                  <div className="relative flex items-center justify-between gap-3 px-3 py-1.5 text-[13px]"><span className={`min-w-0 ${i === arr.length - 1 ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span><b className="shrink-0 tabular-nums text-slate-900">{num(n)}</b></div>
                </li>
              ))}
            </ol>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-baseline justify-between gap-2"><div className="text-[13.5px] font-bold text-slate-900">{t("srcT")}</div><div className="text-[12px] text-slate-500">{basis.inst.length} {t("inst")}</div></div>
              <ul className="space-y-1">
                {basis.inst.slice(0, 5).concat(basis.inst.length > 5 ? [{ name: "__other", n: basis.inst.slice(5).reduce((a, b) => a + b.n, 0) }] : []).map((r, i) => (
                  <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 text-[12.5px] sm:grid-cols-[minmax(0,200px)_1fr_auto]">
                    <span className="truncate text-slate-700" title={r.name}>{r.name === "__other" ? `+ ${basis.inst.length - 5} ${t("srcOther")}` : r.name || t("srcNone")}</span>
                    <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1"><motion.span className="block h-2 rounded-full" style={{ background: r.name === "__other" ? "#94A3B8" : "#14573A" }} initial={{ width: 0 }} animate={{ width: `${basis.used ? (r.n / basis.used) * 100 : 0}%` }} transition={{ duration: 0.7, delay: i * 0.05, ease: EASE }} /></span>
                    <b className="whitespace-nowrap text-right tabular-nums text-slate-900 sm:w-[78px]">{num(r.n)} <span className="font-normal text-slate-400">· {basis.used ? Math.round((r.n / basis.used) * 100) : 0}%</span></b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] leading-snug text-emerald-900">
            <b className="rounded bg-[#14573a] px-1.5 py-0.5 text-[11.5px] text-white">GBIF.org</b>{t("basisFrom")}
            <a href="https://www.gbif.org" target="_blank" rel="noreferrer" className="font-semibold underline">gbif.org</a>
          </p>
          <DataStrip className="mt-3" />
        </motion.section>

        {/* STEP 2 */}
        <section>
          <StepHead n={2} title={t("s2")} desc={t("s2d")} />
          <div className="mb-3 rounded-xl bg-gradient-to-r from-[#0e3b29] to-[#14573a] px-3 py-2.5 text-white shadow-md sm:px-4">
            <p className="text-[14.5px] font-semibold leading-snug sm:text-[15.5px]"><span className="mr-2 rounded-md bg-white/15 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-emerald-100">{t("headline")}</span>
              {lang === "uz"
                ? <><b className="text-[#fca5a5]">{num(declined)} ta</b> o‘simlik kamaygan yoki yo‘qolgan, <b className="text-[#86efac]">{num(grew)} ta</b> o‘simlik ko‘paygan yoki yangi paydo bo‘lgan.</>
                : <><b className="text-[#fca5a5]">{num(declined)}</b> plants declined or disappeared, <b className="text-[#86efac]">{num(grew)}</b> increased or newly appeared.</>}
              <span className="mt-1 block text-[12.5px] sm:ml-2 sm:mt-0 sm:inline sm:whitespace-nowrap font-normal text-emerald-100/80">({num(basis.used)} {t("specimens")} · GBIF.org)</span>
            </p>
          </div>
          <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
            {CATS.map(({ id, color, soft, icon: Icon }) => {
              const on = cat === id;
              return (
                <motion.button key={id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => { setCat(on ? "all" : id); setPage(0); document.getElementById("dyn-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-pressed={on} title={t("clickFilter")}
                  className="relative flex flex-col overflow-hidden rounded-xl border bg-white px-4 pb-3 pt-4 text-left transition-shadow hover:shadow-lg" style={{ borderColor: on ? color : "#E2E8F0", boxShadow: on ? `0 0 0 2px ${color}` : undefined }}>
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: soft, color }}><Icon size={19} aria-hidden /></span>
                    <div className="min-w-0 flex-1"><div className="text-[15.5px] font-bold leading-tight" style={{ color }}>{t(id)}</div></div>
                    <div className="text-[26px] font-bold leading-none tabular-nums text-slate-900"><CountUp to={counts[id]} format={num} /></div>
                  </div>
                  <p className="mt-2 flex-1 text-[12.5px] leading-snug text-slate-500">{t(`${id}D` as keyof typeof L)}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-400"><MousePointerClick size={11} />{on ? "✓ " : ""}{t("clickFilter")}</div>
                </motion.button>
              );
            })}
          </motion.div>
        </section>

        {/* movers + families, equal height */}
        <motion.section {...reveal} className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className={`${card} flex flex-col p-3 sm:p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="text-[16px] font-bold text-slate-900">{t("moversT")}</h2><p className="text-[12.5px] text-slate-500">{t("moversD")}</p></div>
              <div className="flex w-full rounded-full bg-slate-100 p-1 text-[13px] font-semibold sm:w-auto" role="tablist">
                {([["loss", t("tabLoss"), COLOR.lost], ["gain", t("tabGain"), COLOR.up]] as const).map(([k, label, c]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-[40px] flex-1 rounded-full px-4 py-1.5 transition sm:min-h-0 sm:flex-none ${tab === k ? "bg-white shadow-sm" : "text-slate-500"}`} style={tab === k ? { color: c } : undefined}>{label}</button>
                ))}
              </div>
            </div>
            <ul className="mt-3 grid flex-1 content-start gap-1.5">
              {movers.length === 0 && <li className="rounded-xl bg-slate-50 py-10 text-center text-[14px] text-slate-500">{t("empty")}</li>}
              {movers.map((r, i) => (
                <motion.li key={`${tab}-${r.binomial}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <button onClick={() => onShowOnMap(r.binomial)} className="group flex min-h-[56px] w-full min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 p-2 text-left sm:gap-3 transition hover:border-slate-300 hover:shadow-md">
                    <PlantThumb s={images.get(r.binomial)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold italic text-slate-900">{r.binomial}</span>
                      <span className="block truncate text-[12.5px] text-slate-500">{sentence(r, lang)}</span>
                    </span>
                    <Badge cat={r.category as Cat} label={t(r.category as Cat)} iconOnlyMobile />
                    <MapPin size={15} className="hidden shrink-0 sm:block text-slate-300 transition group-hover:text-emerald-700" aria-hidden />
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className={`${card} flex flex-col p-3 sm:p-4`}>
            <h2 className="text-[16px] font-bold text-slate-900">{t("famT")}</h2>
            <p className="text-[12.5px] text-slate-500">{t("famD")}</p>
            <div className="mt-2 flex justify-between gap-2 text-[12px] font-semibold"><span style={{ color: COLOR.lost }}>← {t("famLoss")}</span><span style={{ color: COLOR.up }}>{t("famGain")} →</span></div>
            <div className="mt-1 flex flex-1 flex-col justify-around">
              {families.length === 0 && <p className="py-10 text-center text-[14px] text-slate-500">{t("empty")}</p>}
              {families.map((f) => (
                <div key={f.family} className="py-1">
                  <div className="mb-0.5 truncate text-center text-[13px] font-semibold text-slate-800" title={f.family}>{f.family}</div>
                  <div className="grid grid-cols-2 items-center gap-1">
                    <div className="flex items-center justify-end gap-2"><span className="text-[13px] font-semibold tabular-nums" style={{ color: COLOR.lost }}>{f.loss || ""}</span><motion.div className="h-2.5 rounded-l-full" style={{ background: COLOR.lost, minWidth: f.loss ? 4 : 0 }} initial={{ width: 0 }} animate={{ width: `${(f.loss / famMax) * 85}%` }} transition={{ duration: 0.7, ease: EASE }} /></div>
                    <div className="flex items-center gap-2"><motion.div className="h-2.5 rounded-r-full" style={{ background: COLOR.up, minWidth: f.gain ? 4 : 0 }} initial={{ width: 0 }} animate={{ width: `${(f.gain / famMax) * 85}%` }} transition={{ duration: 0.7, ease: EASE }} /><span className="text-[13px] font-semibold tabular-nums" style={{ color: COLOR.up }}>{f.gain || ""}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* STEP 3 */}
        <motion.section {...reveal}>
          <StepHead n={3} title={t("s3")} desc={t("s3d")} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#e8f5ee] to-[#f2faf5] px-3 py-3 sm:gap-4 sm:px-4 ring-1 ring-emerald-900/10">
            <div className="flex min-w-0 max-w-3xl items-center gap-4">
              <div className="hidden h-8 w-32 shrink-0 rounded-md sm:block" style={{ background: "linear-gradient(90deg,#dc2626,#f97316,#e5e7eb,#4ade80,#15803d)" }} aria-hidden />
              <p className="text-[13.5px] leading-snug text-slate-700">{t("mapCta")}</p>
            </div>
            <div className="flex w-full flex-col gap-2.5 min-[480px]:flex-row sm:w-auto">
              <button onClick={() => onChangeMap(split)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#14573a] px-5 py-2 text-[14px] font-semibold text-white shadow-md transition hover:bg-[#0e4a30]"><MapPin size={17} />{t("mapBtn")}</button>
              <button onClick={exportCsv} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-slate-800 ring-1 ring-slate-300 transition hover:bg-slate-50"><Download size={16} />{t("export")}</button>
            </div>
          </div>
        </motion.section>

        {/* full list */}
        <motion.section {...reveal} id="dyn-list" className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_-18px_rgba(6,40,29,.35)]">
          {/* header */}
          <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#0a3a2a] to-[#14573a] px-4 py-4 sm:px-5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[17px] sm:text-[19px] font-bold">{t("listT")}</h2>
                <p className="text-[13px] text-emerald-100/85">{t("listSub")}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <motion.div key={list.length} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl bg-white/12 px-3.5 py-1.5 text-right ring-1 ring-white/20 backdrop-blur"><div className="text-[22px] font-bold leading-none tabular-nums">{num(list.length)}</div><div className="text-[11.5px] text-emerald-100/80">{t("species")}</div></motion.div>
                <div className="hidden rounded-full bg-white/12 p-1 ring-1 ring-white/20 md:flex" role="group">
                  {([["table", Table2, t("viewTable")], ["grid", LayoutGrid, t("viewGrid")]] as const).map(([k, Icon, label]) => (
                    <button key={k} onClick={() => setView(k)} aria-pressed={view === k} title={label} className={`grid h-8 w-9 place-items-center rounded-full transition ${view === k ? "bg-white text-[#14573a] shadow" : "text-white/80 hover:text-white"}`}><Icon size={16} /></button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* sticky filter bar */}
          <div className="sticky top-0 z-20 space-y-2 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4 md:space-y-3 md:py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="group flex w-full min-w-0 items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-2.5 md:min-w-[260px] md:flex-1 md:w-auto ring-2 ring-transparent transition focus-within:bg-white focus-within:ring-[#1b7a45]/50">
                <Search size={17} className="shrink-0 text-slate-400 group-focus-within:text-[#1b7a45]" />
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t("searchAny")} aria-label={t("searchAny")} className="w-full min-w-0 bg-transparent text-[16px] outline-none md:text-[14.5px] placeholder:text-slate-400" />
                {q && <button onClick={() => setQ("")} aria-label="clear" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-300/80 text-white hover:bg-slate-400"><X size={11} /></button>}
              </label>
              <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className={`relative inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3.5 text-[13.5px] font-semibold transition md:hidden ${showFilters ? "bg-[#14573a] text-white" : "bg-slate-100 text-slate-700"}`}><Settings2 size={15} />{lang === "uz" ? "Filtrlar" : "Filters"}{secondaryActive > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">{secondaryActive}</span>}<ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} /></button>
              <button onClick={() => setCoordOn((v) => !v)} aria-pressed={coordOn} aria-label={t("coordBtn")} title={t("coordBtn")} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold transition md:h-auto md:w-auto md:px-3.5 md:py-2.5 text-[13.5px] font-semibold transition ${coordOn ? "bg-cyan-700 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}><Crosshair size={15} /><span className="hidden md:inline">{t("coordBtn")}</span></button>
              <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-slate-500 md:flex-none"><span className="hidden lg:inline">{t("sort")}</span>
                <select value={sort} onChange={(e) => { const k = e.target.value as SortKey; setSort(k); setDir(k === "name" || k === "family" ? "asc" : "desc"); setPage(0); }} className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-emerald-600 md:h-auto md:w-auto md:py-2.5"><option value="delta">{t("sDelta")}</option><option value="name">{t("sName")}</option><option value="records">{t("sRecords")}</option></select>
              </label>
            </div>

            <AnimatePresence initial={false}>
              {coordOn && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-xl bg-cyan-50 p-3 ring-1 ring-cyan-200">
                    <div className="text-[13.5px] font-bold text-cyan-900">{t("coordT")}</div>
                    <p className="mb-2 text-[12.5px] leading-snug text-cyan-900/70">{t("coordD")}</p>
                    <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_1.4fr]">
                      <input value={latS} onChange={(e) => { const m = e.target.value.match(COORD_RE); if (m) { setLatS(m[1]); setLngS(m[2]); } else setLatS(e.target.value); setPage(0); }} placeholder={t("lat")} inputMode="decimal" className="min-w-0 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-[14px] tabular-nums outline-none focus:border-cyan-600" />
                      <input value={lngS} onChange={(e) => { setLngS(e.target.value); setPage(0); }} placeholder={t("lng")} inputMode="decimal" className="min-w-0 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-[14px] tabular-nums outline-none focus:border-cyan-600" />
                      <label className="flex items-center gap-3 text-[13px] font-semibold text-cyan-900"><span>{t("radius")}</span><input type="range" min={10} max={1000} step={10} value={radius} onChange={(e) => { setRadius(+e.target.value); setPage(0); }} className="flex-1 accent-cyan-700" /><b className="w-[62px] rounded-md bg-white px-2 py-0.5 text-right tabular-nums">{radius} km</b></label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`-mx-3 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-3 pb-0.5 sm:-mx-4 sm:px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'`} role="tablist">
              {([{ id: "all", color: "#334155" }, ...CATS] as { id: Cat | "all"; color: string }[]).map((c) => {
                const on = cat === c.id, label = c.id === "all" ? t("fAllGroups") : t(c.id), n = c.id === "all" ? classified.length : counts[c.id];
                return <motion.button whileTap={{ scale: 0.95 }} key={c.id} role="tab" aria-selected={on} onClick={() => { setCat(c.id); setPage(0); }} className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition md:py-1.5" style={on ? { background: c.color, color: "#fff", boxShadow: `0 4px 12px -4px ${c.color}` } : { color: "#475569", background: "#fff", boxShadow: "inset 0 0 0 1px #CBD5E1" }}>{label} <span className="tabular-nums opacity-80">· {n}</span></motion.button>;
              })}
            </div>

            <div className={`${showFilters ? "grid" : "hidden"} grid-cols-2 items-center gap-2 md:flex md:flex-wrap`}>
              <Select className="w-full md:w-[170px]" value={fCountry} onChange={(v) => { setFCountry(v); setPage(0); }} icon={<Globe2 size={15} />} options={[{ value: "", label: `${t("fCountry")}: ${t("anyOpt")}` }, ...opts.countries.map((c) => ({ value: c, label: c, icon: <Flag country={c} /> }))]} />
              <Select className="w-full md:w-[190px]" value={fFamily} onChange={(v) => { setFFamily(v); setPage(0); }} icon={<Leaf size={15} />} options={[{ value: "", label: `${t("fFamily")}: ${t("anyOpt")}` }, ...opts.families.map((c) => ({ value: c, label: c }))]} />
              <Select className="w-full md:w-[230px]" value={fInst} onChange={(v) => { setFInst(v); setPage(0); }} icon={<Layers size={15} />} options={[{ value: "", label: `${t("fInst")}: ${t("anyOpt")}` }, ...opts.insts.map((c) => ({ value: c, label: c }))]} />
              <Select className="w-full md:w-[190px]" value={fIucn} onChange={(v) => { setFIucn(v); setPage(0); }} icon={<ShieldAlert size={15} />} options={[{ value: "", label: `${t("fStatus")}: ${t("anyOpt")}` }, ...opts.iucn.map((c) => ({ value: c, label: c }))]} />
              <button onClick={() => { setOnlyImg((v) => !v); setPage(0); }} aria-pressed={onlyImg} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13.5px] font-semibold transition md:min-h-0 ${onlyImg ? "border-[#14573a] bg-[#14573a] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}><ImageIcon size={15} />{t("onlyPhoto")}</button>
              <AnimatePresence>{filtersActive > 0 && (
                <motion.button initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} onClick={resetFilters} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-rose-700 hover:bg-rose-50 md:ml-auto md:min-h-0"><X size={14} />{t("clearAll")} ({filtersActive})</motion.button>
              )}</AnimatePresence>
            </div>
            {centre && <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[12.5px] font-semibold text-cyan-900 ring-1 ring-cyan-200"><Crosshair size={13} />{centre.lat}, {centre.lng} · {radius} km</div>}
          </div>

          {/* results */}
          <div className="bg-slate-50/60 p-3 sm:p-4">
            {pageItems.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-14 text-center"><Search size={30} className="mx-auto text-slate-300" /><p className="mt-3 text-[15px] font-semibold text-slate-600">{t("empty")}</p>{filtersActive > 0 && <button onClick={resetFilters} className="mt-2 text-[13.5px] font-semibold text-[#1b7a45] hover:underline">{t("clearAll")}</button>}</motion.div>
            ) : (
              viewMode === "table" ? (
                <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <table className="w-full min-w-[1180px] text-left text-[13.5px]">
                    <caption className="sr-only">{t("listT")}</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="w-12 px-3 py-3 text-center">{t("colNo")}</th>
                        <SortTh k="name" label={t("plant")} />
                        <SortTh k="family" label={t("fFamily")} />
                        <th scope="col" className="px-3 py-3">{t("group")}</th>
                        <SortTh k="nA" label="A" right />
                        <SortTh k="nB" label="B" right />
                        <SortTh k="delta" label={t("colChange")} title={t("colChangeHint")} />
                        <th scope="col" className="px-3 py-3">{t("colCountries")}</th>
                        <SortTh k="records" label={t("colSpecimens")} right />
                        <th scope="col" className="px-3 py-3">{t("colStatus")}</th>
                        <th scope="col" className="px-3 py-3"><span className="sr-only">{t("onMap")}</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {pageItems.map((r, i) => {
                          const sp = specIndex.get(r.binomial) ?? [];
                          const cs = [...new Set(sp.map((x) => x.country).filter(Boolean))];
                          const iucn = sp.find((x) => x.iucn !== "NE")?.iucn ?? "NE";
                          const ys = sp.map((x) => x.year).filter(Boolean);
                          const cat2 = r.category as Cat;
                          return (
                            <motion.tr key={r.binomial} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.025 }}
                              onClick={() => openPlant(r.binomial)} className="group cursor-pointer transition-colors hover:bg-emerald-50/60" style={{ boxShadow: "inset 3px 0 0 transparent" }}
                              whileHover={{ boxShadow: `inset 3px 0 0 ${COLOR[cat2]}` }}>
                              <td className="px-3 py-2.5 text-center text-[12.5px] tabular-nums text-slate-400">{cur * PAGE + i + 1}</td>
                              <td className="px-3 py-2.5"><div className="flex items-center gap-3"><PlantThumb s={images.get(r.binomial)} size={46} /><div className="min-w-0"><div className="max-w-[230px] truncate text-[14.5px] font-semibold italic text-slate-900">{r.binomial}</div><div className="max-w-[230px] truncate text-[12px] text-slate-500">{sentence(r, lang)}</div></div></div></td>
                              <td className="px-3 py-2.5 text-slate-700">{r.family}</td>
                              <td className="px-3 py-2.5"><Badge cat={cat2} label={t(cat2)} /></td>
                              <td className="px-3 py-2.5 text-right tabular-nums"><div className="font-semibold text-slate-900">{r.nA}</div><div className="text-[12px] text-slate-400">{(r.shareA * 100).toFixed(1)}%</div></td>
                              <td className="px-3 py-2.5 text-right tabular-nums"><div className="font-semibold text-slate-900">{r.nB}</div><div className="text-[12px] text-slate-400">{(r.shareB * 100).toFixed(1)}%</div></td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2.5" title={t("colChangeHint")}>
                                  <div className="relative h-2.5 w-28 rounded-full bg-slate-100"><motion.div className="absolute top-0 h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.max(3, (Math.abs(r.delta) / maxDelta) * 50)}%` }} transition={{ duration: 0.6, ease: EASE }} style={{ [r.delta >= 0 ? "left" : "right"]: "50%", background: r.delta >= 0 ? COLOR.up : COLOR.lost }} /><div className="absolute left-1/2 top-[-2px] h-[14px] w-px bg-slate-400" /></div>
                                  <span className="w-14 text-[13px] font-bold tabular-nums" style={{ color: r.delta >= 0 ? COLOR.up : COLOR.lost }}>{r.delta > 0 ? "+" : ""}{r.delta.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5"><div className="flex items-center gap-1">{cs.slice(0, 3).map((c) => <span key={c} title={c}><Flag country={c} /></span>)}{cs.length > 3 && <span className="text-[12px] text-slate-400">+{cs.length - 3}</span>}</div></td>
                              <td className="px-3 py-2.5 text-right tabular-nums"><div className="font-semibold text-slate-900">{sp.length}</div><div className="text-[12px] text-slate-400">{ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : ""}</div></td>
                              <td className="px-3 py-2.5"><IucnChip code={iucn} compact /></td>
                              <td className="px-3 py-2.5 text-right"><button onClick={(e) => { e.stopPropagation(); onShowOnMap(r.binomial); }} title={t("onMap")} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-800 transition hover:border-emerald-600 hover:bg-emerald-600 hover:text-white"><MapPin size={13} />{t("onMap")}</button></td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pageItems.map((r, i) => {
                    const sp = specIndex.get(r.binomial) ?? [];
                    const countries = [...new Set(sp.map((x) => x.country).filter(Boolean))];
                    const iucn = sp.find((x) => x.iucn !== "NE")?.iucn ?? "NE";
                    const ys = sp.map((x) => x.year).filter(Boolean);
                    const yr = ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : "";
                    const img = images.get(r.binomial);
                    const bars = (
                      <div className="space-y-1" aria-hidden>
                        {([["A", r.shareA, COL_A], ["B", r.shareB, COL_B]] as const).map(([k, v, c]) => (
                          <div key={k} className="flex items-center gap-2"><span className="w-3 text-[11px] font-bold" style={{ color: c }}>{k}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-1.5 rounded-full" style={{ background: c }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, v * 100 * 6)}%` }} transition={{ duration: 0.7, ease: EASE }} /></div><span className="w-11 text-right text-[11px] tabular-nums text-slate-500">{(v * 100).toFixed(1)}%</span></div>
                        ))}
                      </div>
                    );
                    const meta = (
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600">
                        {countries.slice(0, 3).map((c) => <span key={c} title={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-1 pr-2"><Flag country={c} />{c}</span>)}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 tabular-nums">{sp.length} {t("nSpec")}</span>
                        {yr && <span className="rounded-full bg-slate-100 px-2 py-0.5 tabular-nums">{yr}</span>}
                      </div>
                    );
                    return viewMode === "grid" ? (
                      <motion.article key={r.binomial} layout initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 8) * 0.04 }} whileHover={{ y: -6 }}
                        onClick={() => openPlant(r.binomial)} className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(16,60,40,.08)] ring-1 ring-slate-200 transition-shadow hover:shadow-[0_22px_44px_-16px_rgba(16,90,60,.5)]">
                        <div className="relative h-40 overflow-hidden bg-[#efe6d0]">
                          {img?.image ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbUrl(img, 460)} alt={r.binomial} loading="lazy" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110" />) : <Leaf size={30} className="absolute inset-0 m-auto text-emerald-700/30" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#04251a]/85 via-[#04251a]/10 to-transparent" />
                          <span className="absolute left-2.5 top-2.5"><Badge cat={r.category as Cat} label={t(r.category as Cat)} /></span>
                          <span className="absolute right-2.5 top-2.5"><IucnChip code={iucn} compact /></span>
                          <div className="absolute inset-x-3 bottom-2.5"><div className="truncate text-[16px] font-bold italic text-white drop-shadow">{r.binomial}</div><div className="truncate text-[12px] text-white/80">{r.family}</div></div>
                        </div>
                        <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                          <p className="text-[13px] leading-snug text-slate-700">{sentence(r, lang)}</p>
                          {bars}
                          {meta}
                          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2.5 text-[13px] font-semibold"><button onClick={(e) => { e.stopPropagation(); onShowOnMap(r.binomial); }} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 py-1 text-[#14573a] sm:min-h-0 transition hover:bg-emerald-600 hover:text-white"><MapPin size={14} />{t("onMap")}</button><span className="inline-flex items-center gap-1 text-slate-500 transition group-hover:text-[#14573a]">{lang === "uz" ? "Batafsil" : "Details"}<ChevronRight size={16} className="transition-transform group-hover:translate-x-1" /></span></div>
                        </div>
                      </motion.article>
                    ) : null;
                  })}
                </AnimatePresence>
              </div>
              )
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-3 py-3 text-[14px] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <span>{t("showing")} <b className="tabular-nums text-slate-900">{list.length ? cur * PAGE + 1 : 0}–{Math.min(list.length, cur * PAGE + PAGE)}</b> / <b className="tabular-nums text-slate-900">{num(list.length)}</b></span>
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <button onClick={() => setPage(Math.max(0, cur - 1))} disabled={cur === 0} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 font-medium sm:min-h-0 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} />{t("prev")}</button>
              <span className="tabular-nums">{cur + 1} / {pages}</span>
              <button onClick={() => setPage(Math.min(pages - 1, cur + 1))} disabled={cur >= pages - 1} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 font-medium sm:min-h-0 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{t("next")}<ChevronRight size={15} /></button>
            </div>
          </div>
        </motion.section>

        {/* notes */}
        <motion.section {...reveal} className="grid min-w-0 gap-3 lg:grid-cols-3">
          <div className={`${card} p-4`}><h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><HelpCircle size={17} className="text-emerald-700" />{t("method")}</h3><p className="mt-1.5 text-[13px] leading-snug text-slate-600">{t("methodD")}</p></div>
          <div className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="flex items-center gap-2 text-[15px] font-bold text-amber-950"><ShieldAlert size={17} />{t("limits")}</h3><p className="mt-1.5 text-[13px] leading-snug text-amber-950/85">{t("limitsD")}</p></div>
          <div className={`${card} p-4`}><h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><Download size={17} className="text-emerald-700" />{t("source")}</h3><p className="mt-1.5 text-[13px] leading-snug text-slate-600">{t("sourceD")}</p></div>
        </motion.section>
      </div>
    </div>
  );
}
