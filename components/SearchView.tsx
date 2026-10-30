"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Calendar, Layers, Leaf, Search, X } from "lucide-react";
import { thumbUrl } from "@/lib/data";
import type { Species } from "@/lib/species";
import { useLang } from "@/lib/i18n";
import { useSpecies, useUi } from "@/lib/store";
import { IucnChip } from "@/components/SpecimenCard";
import Flag from "@/components/Flag";

const EASE = [0.22, 1, 0.36, 1] as const;
const PAGE = 24;
const DEBOUNCE = 250;

export default function SearchView() {
  const { lang } = useLang();
  const species = useSpecies();
  const { openSpecimen } = useUi();
  const router = useRouter();
  const urlQ = useSearchParams().get("q") ?? "";
  const [input, setInput] = useState(urlQ);
  const [query, setQuery] = useState(urlQ); // debounced value that actually drives the filtering
  const inputRef = useRef<HTMLInputElement>(null);
  // Next moves focus to the new page right after navigation, so focus again once it has settled
  useEffect(() => {
    const ids = [0, 80, 250].map((ms) => setTimeout(() => { const el = inputRef.current; if (el && document.activeElement !== el) el.focus(); }, ms));
    return () => ids.forEach(clearTimeout);
  }, []);
  const pushed = useRef(urlQ); // last value we wrote to the URL ourselves
  const [shown, setShown] = useState(PAGE);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const L = lang === "uz"
    ? { ph: "Tur, oila, muallif yoki davlat bo‘yicha qidiring…", title: "Turlar bo‘yicha qidiruv", found: "ta tur topildi", spec: "ta namuna", none: "Hech narsa topilmadi", noneD: "Boshqa nom yoki yozilishni sinab ko‘ring.", more: "Yana ko‘rsatish", status: "Holati", open: "Ochish", sub: "Gerbariy to‘plamidagi barcha o‘simlik turlari" }
    : { ph: "Search by species, family, author or country…", title: "Species search", found: "species found", spec: "specimens", none: "Nothing found", noneD: "Try another name or spelling.", more: "Show more", status: "Status", open: "Open", sub: "All plant species in the herbarium collection", };

  // group specimens into species once per dataset

  // debounce typing -> filtering + URL
  useEffect(() => {
    if (input.trim() === query) return;
    const id = setTimeout(() => {
      setQuery(input.trim());
      setShown(PAGE);
      pushed.current = input.trim();
      router.replace(input.trim() ? `/search?q=${encodeURIComponent(input.trim())}` : "/search", { scroll: false });
    }, DEBOUNCE);
    return () => clearTimeout(id);
  }, [input, query, router]);

  // query changed from outside (hero search, back/forward)
  useEffect(() => { if (urlQ === query || urlQ === pushed.current) return; setInput(urlQ); setQuery(urlQ); setShown(PAGE); }, [urlQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return tokens.length ? species.filter((g) => tokens.every((t) => g.haystack.includes(t))) : species;
  }, [species, query]);
  const visible = results.slice(0, shown);

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-[#f4f8f6]">
      <div className="bg-gradient-to-r from-[#06281d] via-[#0a3a2a] to-[#0c4a33]">
        <div className="mx-auto max-w-[1100px] px-4 pb-7 pt-6 sm:px-6 sm:pb-10 sm:pt-9">
          <motion.h1 initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="text-[24px] font-extrabold tracking-tight text-white sm:text-[30px]">{L.title}</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-1 text-[13px] text-emerald-50/75 sm:text-[14px]">{L.sub}</motion.p>
          <motion.form onSubmit={(e) => e.preventDefault()} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, ease: EASE, delay: 0.08 }} className="mt-4 flex items-center rounded-full bg-white p-1 pl-4 sm:mt-5 sm:pl-5 shadow-xl ring-2 ring-white/30">
            <Search size={18} className="shrink-0 text-ink/60" />
            <input ref={inputRef} onFocus={(e) => { const n = e.target.value.length; e.target.setSelectionRange(n, n); }} value={input} onChange={(e) => setInput(e.target.value)} placeholder={L.ph} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[16px] text-ink sm:py-3.5 sm:text-[15px] outline-none placeholder:text-ink/40" />
            <AnimatePresence>{input && (
              <motion.button type="button" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setInput("")} aria-label="clear" className="mr-1 grid h-10 w-10 sm:mr-2 sm:h-8 sm:w-8 place-items-center rounded-full bg-slate-100 text-ink/60 hover:bg-slate-200"><X size={15} /></motion.button>
            )}</AnimatePresence>
          </motion.form>
          <div className="mt-3 h-5 text-[13px] font-medium text-emerald-100/85">
            <motion.span key={results.length} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-block"><b className="text-white">{results.length}</b> {L.found}</motion.span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-3 py-4 sm:px-6 sm:py-6">
        {results.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-8 text-center sm:p-12 shadow-sm ring-1 ring-emerald-900/5">
            <Leaf size={34} className="mx-auto text-emerald-600/60" />
            <div className="mt-3 text-[18px] font-bold text-[#0e3b29]">{L.none}</div>
            <div className="mt-1 text-[14px] text-ink/55">{L.noneD}</div>
          </motion.div>
        ) : (
          <ul className="grid gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout" initial>
              {visible.map((g, i) => (
                <motion.li key={g.binomial} layout="position" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE, delay: Math.min(i, 8) * 0.045 } }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}>
                  <ResultCard first={i < 3} g={g} L={L} failed={failed.has(g.binomial)} onFail={() => setFailed((p) => new Set(p).add(g.binomial))} onOpen={() => openSpecimen(g.rep.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        {results.length > shown && (
          <div className="mt-6 text-center"><button onClick={() => setShown((n) => n + PAGE)} className="rounded-full border border-emerald-600 bg-white px-7 py-3 text-[14px] font-semibold text-emerald-800 hover:bg-emerald-50">{L.more} ({results.length - shown})</button></div>
        )}
      </div>
    </div>
  );
}

const ResultCard = memo(function ResultCard({ first, g, L, failed, onFail, onOpen }: { first: boolean; g: Species; L: Record<string, string>; failed: boolean; onFail: () => void; onOpen: () => void }) {
  const img = failed ? undefined : thumbUrl(g.rep, 200);
  const years = g.maxYear ? (g.minYear === g.maxYear ? `${g.maxYear}` : `${g.minYear}–${g.maxYear}`) : "—";
  return (
    <motion.button onClick={onOpen} whileHover={{ y: -4 }} whileTap={{ scale: 0.99 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="group flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white p-3 sm:gap-5 sm:p-4 text-left shadow-[0_2px_14px_rgba(16,60,40,.07)] ring-1 ring-emerald-900/5 transition-shadow hover:shadow-[0_18px_40px_-18px_rgba(16,90,60,.5)]">
      <span className="relative h-[96px] w-[72px] shrink-0 sm:h-[120px] sm:w-[92px] overflow-hidden rounded-xl bg-[#efe6d0] ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt={g.binomial} loading={first ? "eager" : "lazy"} fetchPriority={first ? "high" : "auto"} decoding="async" width={92} height={120} referrerPolicy="no-referrer" onError={onFail} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-110" /> : <Leaf size={26} className="absolute inset-0 m-auto text-emerald-700/40" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="min-w-0 max-w-full truncate text-[16px] font-bold italic text-[#0e3b29] sm:text-[19px]">{g.binomial} <span className="text-[13px] sm:text-[14px] font-normal not-italic text-slate-500">{g.authority}</span></span>
          <span className="max-w-full [&>span]:max-w-full [&>span]:flex-wrap"><IucnChip code={g.iucn} /></span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[13.5px] text-slate-500"><Leaf size={13} className="text-emerald-600" aria-hidden />{g.family}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] sm:mt-3 sm:gap-x-5 sm:text-[13.5px] text-slate-700">
          <span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" aria-hidden />{years}</span>
          <span className="inline-flex items-center gap-1.5"><Layers size={14} className="text-slate-400" aria-hidden />{g.count} {L.spec}</span>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {g.countries.map((c) => (<span key={c} title={c} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-0.5 pl-1 pr-2.5 ring-1 ring-slate-200"><Flag country={c} />{c}</span>))}
          </span>
        </span>
      </span>
      <ArrowRight size={18} className="hidden shrink-0 sm:block text-emerald-700/50 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
    </motion.button>
  );
}, (a, b) => a.g === b.g && a.failed === b.failed && a.first === b.first);
