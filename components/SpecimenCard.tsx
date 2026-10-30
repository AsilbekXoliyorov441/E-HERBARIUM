"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Landmark, Leaf, MapPin, UserRound } from "lucide-react";
import { IUCN, Specimen, thumbUrl } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import Flag from "@/components/Flag";

export const IUCN_INFO: Record<IUCN, { color: string; en: string; uz: string }> = {
  CR: { color: "#B42318", en: "Critically Endangered", uz: "Halokat yoqasida" },
  EN: { color: "#DC6803", en: "Endangered", uz: "Xavf ostida" },
  VU: { color: "#CA8A04", en: "Vulnerable", uz: "Zaif" },
  NT: { color: "#65A30D", en: "Near Threatened", uz: "Xavfga yaqin" },
  LC: { color: "#15803D", en: "Least Concern", uz: "Xavotir tug‘dirmaydi" },
  DD: { color: "#64748B", en: "Data Deficient", uz: "Ma’lumot yetarli emas" },
  NE: { color: "#94A3B8", en: "Not evaluated", uz: "Baholanmagan" },
};

const EASE = [0.22, 1, 0.36, 1] as const;
export const cardRise = { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };

export function IucnChip({ code, compact = false }: { code: IUCN; compact?: boolean }) {
  const { lang } = useLang();
  const i = IUCN_INFO[code] ?? IUCN_INFO.NE;
  return (
    <span title={`IUCN: ${i[lang]}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-bold shadow-sm ring-1 ring-black/5" style={{ color: i.color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />{code === "NE" ? "NE" : code}
      {!compact && <span className="font-medium text-slate-600">{code === "NE" ? (lang === "uz" ? "Baholanmagan" : "Not evaluated") : i[lang]}</span>}
    </span>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400"><Icon size={12} aria-hidden />{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium text-slate-800" title={value}>{value || "—"}</div>
    </div>
  );
}

function SpecimenCard({ s, variant = "grid", onOpen, onImgError, selected = false, className = "", index = 0 }: {
  s: Specimen; variant?: "grid" | "row"; onOpen: () => void; onImgError?: () => void; selected?: boolean; className?: string; index?: number;
}) {
  const { lang } = useLang();
  const L = lang === "uz"
    ? { collector: "Yig‘uvchi", locality: "Hudud", institution: "Muassasa", collected: "Yig‘ilgan", family: "Oila", view: "Namunani ko‘rish" }
    : { collector: "Collector", locality: "Locality", institution: "Institution", collected: "Collected", family: "Family", view: "View specimen" };
  const genus = s.binomial.split(" ")[0];
  const img = thumbUrl(s, variant === "grid" ? 560 : 140);
  const collector = s.collector && s.collector !== "unknown" ? s.collector : "—";

  if (variant === "row") {
    return (
      <motion.button onClick={onOpen} whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} aria-pressed={selected}
        className={`group flex min-h-[64px] w-full min-w-0 items-center gap-3 border-b border-slate-100 px-3 py-3 sm:gap-3.5 sm:px-4 text-left transition-colors hover:bg-emerald-50/70 ${selected ? "bg-emerald-50" : ""} ${className}`}>
        <span className="relative h-[68px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-[#efe6d0] ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img && <img src={img} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={onImgError} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[16px] font-bold italic text-[#0e3b29]">{s.binomial}</span>
            <span className="shrink-0"><IucnChip code={s.iucn} compact /></span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500"><Leaf size={12} className="text-emerald-600" aria-hidden />{s.family || "—"}</span>
          <span className="mt-0.5 block truncate text-[13.5px] text-slate-600">{collector}{s.year ? ` · ${s.year}` : ""} · {s.country}</span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: Math.min(index, 5) * 0.08 } }} viewport={{ once: true, amount: 0.1 }} whileHover={{ y: -7, transition: { type: "spring", stiffness: 320, damping: 24 } }} whileTap={{ scale: 0.985 }} onClick={onOpen}
      className={`group flex min-w-0 max-w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_2px_14px_rgba(16,60,40,.08)] ring-1 ring-emerald-900/5 transition-shadow duration-500 hover:shadow-[0_22px_44px_-16px_rgba(16,90,60,.45)] ${className}`}>
      <div className="relative h-[190px] overflow-hidden sm:h-[170px] bg-[#efe6d0]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt={s.binomial} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={onImgError} className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04251a]/70 via-transparent to-[#04251a]/10" />
        <span className="absolute left-3 top-3 inline-flex max-w-[65%] items-center truncate gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-slate-800 shadow-sm"><Flag country={s.country} />{s.country}</span>
        <span className="absolute right-3 top-3"><IucnChip code={s.iucn} compact /></span>
        {s.year ? <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#04251a]/75 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur"><Calendar size={12} aria-hidden />{L.collected} {s.year}</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="truncate text-[17px] font-bold italic leading-tight text-[#0e3b29]" title={s.binomial}>{s.binomial}</h3>
        {s.authority ? <div className="truncate text-[13px] text-slate-400">{s.authority}</div> : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12.5px] font-semibold text-emerald-800 ring-1 ring-emerald-700/10"><Leaf size={12} aria-hidden />{s.family || "—"}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12.5px] font-medium italic text-slate-600">{genus}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3.5">
          <Fact icon={UserRound} label={L.collector} value={collector} />
          <Fact icon={MapPin} label={L.locality} value={s.region || s.locality || s.country} />
          <Fact icon={Landmark} label={L.institution} value={s.institution || "—"} />
          <Fact icon={Calendar} label={L.collected} value={s.year ? String(s.year) : "—"} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[13.5px] font-semibold text-[#14573a]">
          <span className="tabular-nums text-[12.5px] font-medium text-slate-400">{s.lat.toFixed(2)}°, {s.lng.toFixed(2)}°</span>
          <span className="inline-flex items-center gap-1.5">{L.view}<ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1.5" /></span>
        </div>
      </div>
    </motion.button>
  );
}

// Cards are re-rendered only when what they display changes. `onOpen` / `onImgError` are intentionally ignored: callers pass inline
// closures over `s.id` and stable setters, so they never change meaning while the card's data is unchanged.
export default memo(SpecimenCard, (a, b) => a.s === b.s && a.variant === b.variant && a.selected === b.selected && a.className === b.className && a.index === b.index);
