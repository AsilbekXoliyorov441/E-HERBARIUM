"use client";
import { memo, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Box, Database, FlaskConical, Home, Leaf, LineChart, Search } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useData, useUi } from "@/lib/store";

const NAV = [["home", Home, "nav.home"], ["atlas", Box, "nav.atlas"], ["specimen", FlaskConical, "nav.specimen"], ["dynamics", LineChart, "nav.dynamics"]] as const;

function Header() {
  const { t, lang, setLang } = useLang();
  const { tab, selected, setSearchOpen, setDataOpen } = useUi();
  const { all, available } = useData();
  const nReal = useMemo(() => all.filter((x) => x.real).length, [all]);
  const hrefOf = (id: string) => (id === "home" ? "/" : id === "specimen" && selected ? `/specimen/${encodeURIComponent(selected)}` : `/${id}`);
  const uz = lang === "uz";

  return (
    <header className="relative z-30 shrink-0 border-b border-emerald-900/10 bg-white shadow-[0_1px_0_rgba(6,40,29,.04),0_8px_24px_-16px_rgba(6,40,29,.25)]">
      <div className="mx-auto flex h-[56px] max-w-[1680px] items-center gap-2 px-3 sm:px-4 lg:h-[68px] lg:gap-5 lg:px-[44px]">
        {/* brand */}
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-2xl lg:h-11 lg:w-11 bg-gradient-to-br from-[#2fa855] to-[#0e4a30] text-white shadow-[0_6px_16px_-6px_rgba(20,87,58,.8)] transition group-hover:rotate-[-6deg] group-hover:scale-105"><Leaf size={22} strokeWidth={1.8} /></span>
          <span className="leading-tight"><span className="block text-[14px] sm:text-[16px] font-extrabold tracking-tight text-[#0e3b29]">{t("brand.title")}</span><span className="hidden text-[12px] font-medium text-slate-500 sm:block">{t("brand.sub")}</span></span>
        </Link>

        {/* nav: sliding pill */}
        <nav className="ml-2 hidden items-center gap-0.5 rounded-full bg-slate-100 p-1 lg:flex" aria-label="Main">
          {NAV.map(([id, Icon, label]) => {
            const on = tab === id;
            return (
              <Link key={id} href={hrefOf(id)} aria-current={on ? "page" : undefined} className={`relative flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${on ? "text-white" : "text-slate-600 hover:text-[#0e5a37]"}`}>
                {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-[#14573a] shadow-[0_4px_12px_-3px_rgba(20,87,58,.7)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon size={15} className="relative" /><span className="relative">{t(label)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          {/* search */}
          <button onClick={() => setSearchOpen(true)} aria-label={uz ? "Qidirish" : "Search"} title="Ctrl K"
            className="group flex items-center gap-2.5 rounded-full border border-slate-300 bg-slate-50 p-1 text-left transition hover:border-[#1b7a45] hover:bg-white hover:shadow-md md:w-[230px] md:py-1.5 md:pl-1.5 md:pr-3 xl:w-[320px]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#14573a] text-white"><Search size={15} /></span>
            <span className="hidden min-w-0 flex-1 truncate text-[13.5px] font-medium text-slate-500 group-hover:text-slate-700 md:block">{uz ? "O‘simlik, oila yoki davlatni qidiring…" : "Search plants, families, countries…"}</span>
            <kbd className="hidden rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 xl:block">Ctrl K</kbd>
          </button>

          {/* data source */}
          <button onClick={() => setDataOpen(true)} title={uz ? "Ma’lumot manbasi va hajmi" : "Data source & size"} className="flex items-center gap-2 rounded-full bg-emerald-50 p-1 text-left ring-1 ring-emerald-200 transition hover:bg-emerald-100 hover:shadow-sm xl:py-1.5 xl:pl-1.5 xl:pr-3.5">
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white text-[#14573a] ring-1 ring-emerald-200"><Database size={15} /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#2fa855] ring-2 ring-white" /></span>
            <span className="hidden leading-tight xl:block"><span className="block text-[13px] font-bold tabular-nums text-[#0e3b29]">{nReal.toLocaleString()}{available ? <span className="font-medium text-slate-500"> / ~{available.region.toLocaleString()}</span> : null}</span><span className="block text-[11px] font-medium text-slate-500">{uz ? "namuna · GBIF.org" : "specimens · GBIF.org"}</span></span>
          </button>

          {/* language */}
          <div className="flex rounded-full bg-slate-100 p-1 text-[12.5px] font-bold" role="group" aria-label="Til / Language">
            {(["uz", "en"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`relative rounded-full px-3 py-1.5 uppercase transition-colors ${lang === l ? "text-[#0e3b29]" : "text-slate-500 hover:text-slate-800"}`}>
                {lang === l && <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-black/5" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

    </header>
  );
}

export default memo(Header);
