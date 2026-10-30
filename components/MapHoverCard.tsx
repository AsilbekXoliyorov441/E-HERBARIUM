"use client";
import { motion } from "framer-motion";
import { Calendar, Leaf, MousePointerClick } from "lucide-react";
import { Specimen, thumbUrl } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { IUCN_INFO, IucnChip } from "@/components/SpecimenCard";
import Flag from "@/components/Flag";

export interface HoverInfo { s: Specimen; x: number; y: number; w: number }

const CARD_W = 264;

// Floating preview shown above (or below, near the top edge) a hovered map dot.
export default function MapHoverCard({ info }: { info: HoverInfo }) {
  const { lang } = useLang();
  const { s, x, y, w } = info;
  const below = y < 250;
  const left = Math.min(Math.max(x, CARD_W / 2 + 8), w - CARD_W / 2 - 8);
  const accent = (IUCN_INFO[s.iucn] ?? IUCN_INFO.NE).color;
  const img = thumbUrl(s, 400);
  const collector = s.collector && s.collector !== "unknown" ? s.collector : "";

  return (
    <div className="pointer-events-none absolute z-30" style={{ left: x, top: y }}>
      {/* pulsing ring around the dot */}
      <motion.span className="absolute -ml-4 -mt-4 block h-8 w-8 rounded-full border-2" style={{ borderColor: accent }}
        initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: [0.6, 1.5], opacity: [0.9, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }} />
      <motion.div
        className="absolute overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-12px_rgba(0,0,0,.65)] ring-1 ring-black/10"
        style={{ width: CARD_W, left: left - x - CARD_W / 2, ...(below ? { top: 22 } : { bottom: 22 }), transformOrigin: below ? "50% 0%" : "50% 100%" }}
        initial={{ opacity: 0, y: below ? -10 : 10, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.1 } }}
        transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.7 }}>
        <div className="relative h-[116px] overflow-hidden bg-[#efe6d0]">
          {img && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} className="h-full w-full object-cover object-top" />)}
          <div className="absolute inset-0 bg-gradient-to-t from-[#04251a]/80 via-transparent to-transparent" />
          <span className="absolute left-2.5 top-2.5"><IucnChip code={s.iucn} compact /></span>
          {s.year ? <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#04251a]/75 px-2 py-0.5 text-[12px] font-semibold text-white backdrop-blur"><Calendar size={11} />{s.year}</span> : null}
          <div className="absolute inset-x-3 bottom-2 truncate text-[16px] font-bold italic text-white drop-shadow">{s.binomial}</div>
        </div>
        <div className="space-y-1.5 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600"><Leaf size={12} className="shrink-0 text-emerald-600" />{s.family}</div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-800"><Flag country={s.country} />{s.country}{collector && <span className="truncate font-normal text-slate-500">· {collector}</span>}</div>
          <div className="flex items-center gap-1.5 pt-0.5 text-[11.5px] font-semibold text-emerald-700"><MousePointerClick size={12} />{lang === "uz" ? "Batafsil ko‘rish uchun bosing" : "Click for details"}</div>
        </div>
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      </motion.div>
    </div>
  );
}
