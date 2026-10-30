"use client";
import { memo, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, CloudUpload, Database, FlaskConical, Leaf, Map as MapIcon, MapPin, Search, Sprout, UserRound } from "lucide-react";
import { Specimen, thumbUrl } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import MapPreview from "@/components/MapPreview";
import SpecimenCard from "@/components/SpecimenCard";
import { useLoadedThumbs } from "@/lib/useLoadedThumbs";
import HeroSearch from "@/components/HeroSearch";
import type { Tab } from "@/lib/store";

const POPULAR = ["Asteraceae", "Tashkent", "Uzbekistan", "Plant specimen"];

const EASE = [0.22, 1, 0.36, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };
const stagger = (gap = 0.1, delay = 0): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } });

function HeroGlow() {
  return <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(120,230,170,.28),transparent_55%),radial-gradient(ellipse_at_20%_100%,rgba(40,150,100,.35),transparent_55%)]" aria-hidden />;
}

function Photo({ src, pos = "center" }: { src: string; pos?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} aria-hidden />;
}

function Sheets({ imgs }: { imgs: string[] }) {
  const rot = [-8, 3, 12];
  return (
    <div className="absolute inset-y-0 right-0 w-[55%] overflow-hidden bg-[#f6efe0]" aria-hidden>
      {imgs.length === 0 && <Leaf size={34} className="absolute inset-0 m-auto animate-pulse text-emerald-700/30" />}
      {imgs.slice(0, 3).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <motion.img key={src} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} src={src} alt="" referrerPolicy="no-referrer" className="absolute h-[135%] w-[78%] rounded-sm object-cover shadow-lg" style={{ left: `${12 + i * 20}%`, top: `${-14 + i * 4}%`, rotate: rot[i], filter: "sepia(.25)" }} />
      ))}
    </div>
  );
}

function HomeView({ all, onOpen, onSearch, onSelect }: { all: Specimen[]; onOpen: (tab: Tab) => void; onSearch: (q: string) => void; onSelect: (id: string) => void }) {
  const { t, lang } = useLang();
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const rail = useRef<HTMLDivElement>(null);
  const nf = (n: number) => n.toLocaleString(lang === "uz" ? "uz-UZ" : "en-US");
  const stats = [
    { icon: Leaf, label: t("stat.specimens"), num: all.length },
    { icon: Sprout, label: t("stat.species"), num: new Set(all.map((s) => s.binomial)).size },
    { icon: MapPin, label: t("stat.countries"), num: new Set(all.map((s) => s.country).filter(Boolean)).size },
    { icon: UserRound, label: t("stat.collectors"), num: new Set(all.map((s) => s.collector).filter(Boolean)).size },
  ];
  const withImg = useMemo(() => {
    const seen = new Set<string>();
    return all.filter((s) => s.real && s.image && !seen.has(s.binomial) && seen.add(s.binomial));
  }, [all]);
  const featured = useMemo(() => withImg.filter((_, i) => i % 5 === 0).filter((s) => !failed.has(s.id)).slice(0, 10), [withImg, failed]);
  const heroImg = useLoadedThumbs(withImg, 3, 260);

  const cards = [
    { icon: MapIcon, t: t("c1.t"), d: t("c1.d"), art: <MapPreview all={all} />, go: "atlas" as Tab },
    { icon: FlaskConical, t: t("c2.t"), d: t("c2.d"), art: <Photo src="/cards/lab.webp" pos="60% 50%" />, go: "specimen" as Tab },
    { icon: CloudUpload, t: t("c3.t"), d: t("c3.d"), art: <Photo src="/cards/excel.webp" />, go: "import" as Tab },
    { icon: Database, t: t("c4.t"), d: t("c4.d"), art: <Sheets imgs={heroImg} />, go: "atlas" as Tab },
  ];

  return (
    <div className="w-full max-w-full overflow-x-clip bg-[#f4f8f6]">
      <section className="relative isolate z-20 bg-[#06281d] bg-cover bg-center" style={{ backgroundImage: "url(/bg-hero.webp)" }}>
        <HeroGlow />
        <div className="relative mx-auto grid max-w-[1680px] gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_220px] lg:px-[66px] lg:py-16 xl:grid-cols-[minmax(0,780px)_1fr]">
          <div className="min-w-0 text-white">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wider text-emerald-100/90 ring-1 ring-white/10">
              <Leaf size={13} className="text-emerald-400" />{t("h.inst")}<span className="opacity-60">·</span>{t("h.acad")}
            </p>
            <h1 className="mt-5 break-words text-[28px] font-extrabold leading-[1.12] tracking-tight sm:text-[38px] md:text-[48px]">
              {t("h.t1")}<br /><span className="text-[#5ee58b]">{t("h.t2")}</span>
            </h1>
            <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-emerald-50/85 sm:mt-5 sm:text-[16px]">{t("h.lead")}</p>
            <HeroSearch placeholder={t("h.ph")} buttonLabel={t("home.searchBtn")} popular={POPULAR} popularLabel={t("h.pop")} />
          </div>
          <div className="relative hidden flex-col justify-center gap-7 border-l border-white/10 pl-10 lg:flex">
            {stats.map(({ icon: Icon, label, num }) => (
              <div key={label} className="flex items-center gap-4 text-white">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-emerald-300 ring-1 ring-white/10"><Icon size={20} /></span>
                <div className="leading-tight"><div className="text-xl font-bold">{nf(num)}</div><div className="text-[15px] text-emerald-50/80">{label}</div></div>
              </div>
            ))}
          </div>
          {/* phones/tablets: live numbers as a 2x2 grid under the search */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:hidden">
            {stats.map(({ icon: Icon, label, num }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/15">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-emerald-300"><Icon size={17} /></span>
                <div className="min-w-0 leading-tight"><div className="truncate text-[18px] font-bold tabular-nums">{nf(num)}</div><div className="truncate text-[12px] text-emerald-50/80">{label}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-[66px]">
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <h2 className="text-[24px] font-extrabold tracking-tight text-[#0e3b29]">{lang === "uz" ? "Platforma imkoniyatlari" : "What you can do here"}</h2>
          <p className="max-w-xl text-[14.5px] text-slate-600">{lang === "uz" ? "Namunalarni xaritada ko‘ring, gerbariy varag‘ini kattalashtiring va o‘simliklar o‘zgarishini solishtiring." : "See specimens on a map, zoom into herbarium sheets and compare how plants change."}</p>
        </div>
        <motion.section className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          {cards.map(({ icon: Icon, t: title, d, art, go }) => (
            <motion.button key={title} variants={rise} whileHover={{ y: -6 }} whileTap={{ scale: 0.985 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} onClick={() => onOpen(go)} className="group relative h-[236px] 2xl:h-[200px] overflow-hidden rounded-2xl bg-white text-left shadow-[0_2px_12px_rgba(16,60,40,.08)] ring-1 ring-emerald-900/5 transition-shadow duration-500 hover:shadow-[0_18px_40px_-14px_rgba(16,90,60,.4)]">
              <div className="absolute inset-y-0 right-0 w-[52%] overflow-hidden"><div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-110">{art}</div><div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" /></div>
              <div className="relative flex h-full max-w-[64%] flex-col p-4 pb-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1b6b45] text-white shadow-[0_6px_14px_-6px_rgba(27,107,69,.8)] transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-[#15834f]"><Icon size={22} /></span>
                <h3 className="mt-3 text-[16px] font-bold leading-tight text-[#0e3b29] transition-colors duration-300 group-hover:text-[#15834f]">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-snug text-ink/60">{d}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#14573a]">{t("learn")} <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1.5" /></span>
              </div>
            </motion.button>
          ))}
        </motion.section>

        <motion.section className="mt-9" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.7, ease: EASE }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-[18px] font-bold text-[#0e3b29]"><Leaf size={18} className="text-[#1b8a3e]" />{t("home.featured")}</h2>
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <button aria-label="prev" onClick={() => rail.current?.scrollBy({ left: -600, behavior: "smooth" })} className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-black/5 hover:text-ink"><ChevronLeft size={14} /></button>
                <button aria-label="next" onClick={() => rail.current?.scrollBy({ left: 600, behavior: "smooth" })} className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink/50 ring-1 ring-black/5 hover:text-ink"><ChevronRight size={14} /></button>
              </div>
              <button onClick={() => onOpen("atlas")} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#14573a]">{t("home.browse")} {all.length} <ArrowRight size={13} /></button>
            </div>
          </div>
          <div ref={rail} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth sm:gap-5 px-1 pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((s, i) => (
              <SpecimenCard key={s.id} s={s} index={i} className="w-[calc((100%-80px)/4)] min-w-[78vw] shrink-0 snap-start sm:min-w-[290px]" onOpen={() => onSelect(s.id)} onImgError={() => setFailed((f) => new Set(f).add(s.id))} />
            ))}
          </div>
        </motion.section>
      </div>

      <footer id="about" className="mt-8 bg-gradient-to-r from-[#073324] to-[#0a4230] text-white">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-10 gap-y-3 px-4 py-6 sm:px-6 lg:px-[66px]">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-emerald-300"><Leaf size={18} /></span><h4 className="text-[17px] font-bold">{t("mission.t")}</h4></div>
          <p className="max-w-[560px] sm:border-l sm:border-white/15 sm:pl-10 text-[13px] leading-relaxed text-emerald-50/80">{t("mission.d")}</p>
          <p className="ml-auto text-[13px] text-emerald-100/60">© 2026 TASH · {t("foot.data.t")}</p>
        </div>
      </footer>
    </div>
  );
}

export default memo(HomeView);
