"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Leaf, Search, X } from "lucide-react";
import { thumbUrl } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSpecies, useUi } from "@/lib/store";
import { IucnChip } from "@/components/SpecimenCard";
import Flag from "@/components/Flag";

const MAX = 6;

// Home hero search: same results as the header's Ctrl+K search, shown inline instead of jumping to another page.
export default function HeroSearch({ placeholder, buttonLabel, popular, popularLabel }: { placeholder: string; buttonLabel: string; popular: string[]; popularLabel: string }) {
  const { lang } = useLang();
  const species = useSpecies();
  const { openSpecimen } = useUi();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const uz = lang === "uz";
  const L = uz ? { all: "Barcha natijalarni ko‘rish", none: "Hech narsa topilmadi", spec: "ta namuna", hint: "tanlash" } : { all: "See all results", none: "Nothing found", spec: "specimens", hint: "select" };

  useEffect(() => { const id = setTimeout(() => { setQuery(input.trim()); setActive(0); }, 150); return () => clearTimeout(id); }, [input]);
  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return species.filter((g) => tokens.every((t) => g.haystack.includes(t))).slice(0, MAX);
  }, [species, query]);

  useEffect(() => {
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const show = open && !!query;
  const pick = (i: number) => { const g = results[i]; if (g) { setOpen(false); openSpecimen(g.rep.id); } };
  const seeAll = () => { const q = input.trim(); router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search"); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey || !results.length || !show) seeAll(); else pick(active); }
  };

  return (
    <div ref={box} className="relative mt-6 max-w-[720px] sm:mt-8">
      <div className="flex items-center rounded-full bg-white p-1 pl-5 shadow-xl ring-2 ring-white/30 focus-within:ring-white/60">
        <Search size={17} className="shrink-0 text-ink/60" />
        <input value={input} onChange={(e) => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} autoComplete="off" placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[16px] text-ink outline-none sm:py-4 sm:text-[14px] placeholder:text-ink/40" />
        {input && <button onClick={() => { setInput(""); setQuery(""); }} aria-label="clear" className="mr-2 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-ink/60 hover:bg-slate-200"><X size={14} /></button>}
        <button onClick={seeAll} className="rounded-full bg-[#1b7a45] px-5 py-3 text-[14px] sm:px-10 sm:py-4 font-semibold text-white transition hover:bg-[#15683a]">{buttonLabel}</button>
      </div>

      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white text-ink shadow-[0_24px_60px_-12px_rgba(0,0,0,.55)] ring-1 ring-black/10">
            {results.length === 0 ? <div className="px-5 py-8 text-center text-[14px] text-ink/50">{L.none}</div> : (
              <ul>
                {results.map((g, i) => {
                  const img = thumbUrl(g.rep, 120);
                  return (
                    <motion.li key={g.binomial} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.025 } }}>
                      <button onMouseEnter={() => setActive(i)} onClick={() => pick(i)} className={`flex w-full items-center gap-3.5 px-5 py-2.5 text-left transition-colors ${active === i ? "bg-emerald-50" : ""}`}>
                        <span className="relative h-[52px] w-10 shrink-0 overflow-hidden rounded-md bg-[#efe6d0] ring-1 ring-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} className="h-full w-full object-cover object-top" /> : <Leaf size={16} className="absolute inset-0 m-auto text-emerald-700/40" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-bold italic text-[#0e3b29]">{g.binomial}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-slate-500">
                            <span className="truncate">{g.family}</span><span>·</span><span>{g.count} {L.spec}</span>
                            {g.maxYear > 0 && <><span>·</span><span>{g.minYear === g.maxYear ? g.maxYear : `${g.minYear}–${g.maxYear}`}</span></>}
                            <span className="flex items-center gap-1">{g.countries.slice(0, 5).map((c) => <Flag key={c} country={c} />)}</span>
                          </span>
                        </span>
                        <IucnChip code={g.iucn} compact />
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[12px] text-slate-500">
              <span className="flex items-center gap-3"><span className="inline-flex items-center gap-1"><CornerDownLeft size={12} />{L.hint}</span><span>↑↓</span></span>
              <button onClick={seeAll} className="font-semibold text-emerald-800 hover:underline">{L.all} (Shift+Enter)</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[14px]">
        <span className="text-emerald-50/85">{popularLabel}</span>
        {popular.map((p) => <button key={p} onClick={() => { setInput(p); setOpen(true); }} className="rounded-full bg-white/10 px-3 py-1.5 text-emerald-50 ring-1 ring-white/10 transition hover:bg-white/20">{p}</button>)}
      </div>
    </div>
  );
}
