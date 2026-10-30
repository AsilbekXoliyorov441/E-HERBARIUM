"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Leaf, Search } from "lucide-react";
import { thumbUrl } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useSpecies, useUi } from "@/lib/store";
import { IucnChip } from "@/components/SpecimenCard";
import Flag from "@/components/Flag";

const MAX = 8;

// Command-palette style search available from every page: Ctrl/Cmd+K, "/" or the header magnifier.
export default function GlobalSearch() {
  const { lang } = useLang();
  const species = useSpecies();
  const { searchOpen: open, setSearchOpen: setOpen, openSpecimen } = useUi();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSm, setIsSm] = useState(true);
  useEffect(() => { const m = window.matchMedia("(min-width: 640px)"); const f = () => setIsSm(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const L = lang === "uz"
    ? { ph: "Butun saytdan qidirish: tur, oila, davlat…", all: "Barcha natijalarni ko‘rish", none: "Hech narsa topilmadi", hint: "tanlash", esc: "yopish", spec: "ta namuna" }
    : { ph: "Search the whole site: species, family, country…", all: "See all results", none: "Nothing found", hint: "select", esc: "close", spec: "specimens" };


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(!open); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setOpen(true); }
      else if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => { if (open) { const id = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(id); } setInput(""); setQuery(""); setActive(0); }, [open]);

  // debounce typing
  useEffect(() => {
    const id = setTimeout(() => { setQuery(input.trim()); setActive(0); }, 150);
    return () => clearTimeout(id);
  }, [input]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return species.filter((g) => tokens.every((t) => g.haystack.includes(t))).slice(0, MAX);
  }, [species, query]);

  const close = () => setOpen(false);
  const pick = (i: number) => { const g = results[i]; if (!g) return; close(); openSpecimen(g.rep.id); };
  const seeAll = () => { if (!query) return; close(); router.push(`/search?q=${encodeURIComponent(query)}`); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey || !results.length) seeAll(); else pick(active); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="gs" className="fixed inset-0 z-[100] flex items-end justify-center bg-[#04251a]/50 backdrop-blur-sm sm:items-start sm:px-4 sm:pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={close}>
          <motion.div role="dialog" aria-modal="true" className="flex h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-black/10 sm:h-auto sm:rounded-2xl sm:pb-0" initial={isSm ? { opacity: 0, y: -16, scale: 0.97 } : { y: "100%" }} animate={isSm ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }} exit={isSm ? { opacity: 0, y: -10, scale: 0.98 } : { y: "100%" }} transition={{ type: "spring", stiffness: 420, damping: 32 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" />
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 sm:px-5">
              <Search size={18} className="shrink-0 text-ink/50" />
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder={L.ph} className="min-w-0 flex-1 bg-transparent py-4 text-[16px] text-ink outline-none placeholder:text-ink/40" />
              <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">Esc</kbd>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:max-h-[52vh] sm:flex-none">
              {query && results.length === 0 && <div className="px-5 py-10 text-center text-[14px] text-ink/50">{L.none}</div>}
              <ul>
                {results.map((g, i) => {
                  const img = thumbUrl(g.rep, 120);
                  return (
                    <motion.li key={g.binomial} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.025 } }}>
                      <button onMouseEnter={() => setActive(i)} onClick={() => pick(i)} className={`flex w-full items-center min-h-[64px] gap-3 px-4 py-2.5 text-left sm:min-h-0 sm:gap-3.5 sm:px-5 transition-colors ${active === i ? "bg-emerald-50" : ""}`}>
                        <span className="relative h-[52px] w-10 shrink-0 overflow-hidden rounded-md bg-[#efe6d0] ring-1 ring-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} className="h-full w-full object-cover object-top" /> : <Leaf size={16} className="absolute inset-0 m-auto text-emerald-700/40" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-bold italic text-[#0e3b29]">{g.binomial}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-slate-500">
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
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5 sm:py-2.5 text-[12px] text-slate-500">
              <span className="hidden items-center gap-3 sm:flex"><span className="inline-flex items-center gap-1"><CornerDownLeft size={12} />{L.hint}</span><span>↑↓</span></span>
              <button onClick={seeAll} disabled={!query} className="ml-auto font-semibold text-emerald-800 py-1 hover:underline disabled:opacity-40">{L.all}<span className="hidden sm:inline"> (Shift+Enter)</span></button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
