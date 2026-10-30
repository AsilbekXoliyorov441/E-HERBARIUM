"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CloudDownload, Database, ExternalLink, Layers, Loader2, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useData, useUi } from "@/lib/store";
import { COUNTRIES } from "@/lib/gbif";
import Flag from "@/components/Flag";

const ISO_NAME: Record<string, string> = { UZ: "Uzbekistan", KZ: "Kazakhstan", KG: "Kyrgyzstan", TJ: "Tajikistan", TM: "Turkmenistan" };

/** Compact "how much data, from where, can I add more" strip. Opens the full panel. */
export function DataStrip({ className = "" }: { className?: string }) {
  const { lang } = useLang();
  const { all, available, loadingMore, loadMsg } = useData();
  const { setDataOpen } = useUi();
  const n = all.filter((s) => s.real).length;
  const pct = available?.region ? Math.min(100, (n / available.region) * 100) : 0;
  const nf = (v: number) => v.toLocaleString(lang === "uz" ? "uz-UZ" : "en-US");
  return (
    <button onClick={() => setDataOpen(true)} className={`group w-full rounded-xl bg-emerald-50 p-3 text-left ring-1 ring-emerald-200 transition hover:bg-emerald-100/70 hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-emerald-800"><Database size={13} />{lang === "uz" ? "Ma’lumot · GBIF.org" : "Data · GBIF.org"}</span>
        <span className="rounded-full bg-[#14573a] px-2.5 py-0.5 text-[11.5px] font-bold text-white transition group-hover:bg-[#0e4a30]">{loadingMore ? <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" />{loadMsg || "…"}</span> : lang === "uz" ? "+ ko‘paytirish" : "+ add more"}</span>
      </div>
      <div className="mt-1.5 text-[13.5px] leading-tight text-slate-800">
        <b className="text-[18px] tabular-nums text-[#0e3b29]">{nf(n)}</b> {lang === "uz" ? "namuna" : "specimens"}{available && <span className="text-slate-500"> {lang === "uz" ? "dan" : "of"} ~{nf(available.region)} {lang === "uz" ? "(GBIF’da mavjud)" : "available on GBIF"}</span>}
      </div>
      {available && (<><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-emerald-200"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#2fa855] to-[#14573a]" initial={{ width: 0 }} animate={{ width: `${Math.max(1.5, pct)}%` }} transition={{ duration: 0.8 }} /></div>
        <div className="mt-1 text-[11.5px] font-medium text-slate-600">{lang === "uz" ? `Mavjud ma’lumotning atigi ${pct < 1 ? "<1" : pct.toFixed(1)}% i ko‘rsatilmoqda` : `Only ${pct < 1 ? "<1" : pct.toFixed(1)}% of available data is shown`}</div></>)}
    </button>
  );
}

export default function DataPanel() {
  const { lang } = useLang();
  const { all, meta, available, loadMoreRecords, loadingMore, loadMsg, pool } = useData();
  const { dataOpen, setDataOpen } = useUi();
  const uz = lang === "uz";
  const [isSm, setIsSm] = useState(true);
  useEffect(() => { const m = window.matchMedia("(min-width: 640px)"); const f = () => setIsSm(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const nf = (v: number) => v.toLocaleString(uz ? "uz-UZ" : "en-US");
  const real = useMemo(() => all.filter((s) => s.real), [all]);
  const n = real.length, extra = Math.max(0, n - meta.base);
  const pct = available?.region ? Math.min(100, (n / available.region) * 100) : 0;
  const low = !!available && pct < 5;
  const byCountry = useMemo(() => { const m = new Map<string, number>(); real.forEach((s) => s.country && m.set(s.country, (m.get(s.country) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [real]);
  const byInst = useMemo(() => { const m = new Map<string, number>(); real.forEach((s) => { const k = (s.institution || "").trim() || (uz ? "Ko‘rsatilmagan" : "Not stated"); m.set(k, (m.get(k) ?? 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [real, uz]);
  const maxC = Math.max(1, ...byCountry.map((c) => c[1])), maxI = Math.max(1, ...byInst.slice(0, 6).map((c) => c[1]));

  useEffect(() => {
    if (!dataOpen) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setDataOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [dataOpen, setDataOpen]);

  const date = meta.generated ? new Date(meta.generated).toLocaleDateString(uz ? "uz-UZ" : "en-GB", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const filters = uz
    ? [["Hudud", COUNTRIES.map((c) => ISO_NAME[c])], ["Turi", ["Saqlangan gerbariy namunasi"]], ["Shart", ["Rasmi bor", "Koordinatasi bor"]], ["Yillar", ["1850–2025"]], ["Litsenziya", ["CC0", "CC BY", "CC BY-NC"]]]
    : [["Area", COUNTRIES.map((c) => ISO_NAME[c])], ["Type", ["Preserved herbarium specimen"]], ["Must have", ["Photo", "Coordinates"]], ["Years", ["1850–2025"]], ["Licence", ["CC0", "CC BY", "CC BY-NC"]]];

  return (
    <AnimatePresence>
      {dataOpen && (
        <motion.div className="fixed inset-0 z-[110] flex items-end justify-center bg-[#04251a]/60 backdrop-blur-sm sm:items-start sm:overflow-y-auto sm:p-4 sm:pt-[6vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setDataOpen(false)}>
          <motion.div role="dialog" aria-modal="true" aria-label={uz ? "Ma’lumot manbasi" : "Data source"} className="flex max-h-[94dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-black/10 sm:max-h-none sm:rounded-3xl sm:pb-0" initial={isSm ? { opacity: 0, y: 24, scale: 0.96 } : { y: "100%" }} animate={isSm ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }} exit={isSm ? { opacity: 0, y: 12, scale: 0.97 } : { y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 32 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#0a3a2a] to-[#14573a] px-4 py-4 text-white sm:px-6 sm:py-5">
              <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
              <button onClick={() => setDataOpen(false)} aria-label="close" className="absolute right-3 top-3 grid h-10 w-10 sm:right-4 sm:top-4 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X size={16} /></button>
              <div className="relative flex items-center gap-3 pr-10"><span className="grid shrink-0 h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Database size={22} /></span>
                <div><h2 className="text-[17px] font-bold leading-tight sm:text-[20px]">{uz ? "Ma’lumot qayerdan kelmoqda va qancha?" : "Where does the data come from, and how much?"}</h2><p className="text-[13px] text-emerald-100/85">{uz ? "Platformadagi barcha namunalar ochiq bazadan olingan" : "Every specimen on this platform comes from an open database"}</p></div></div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:flex-none sm:overflow-visible sm:p-6">
              {/* numbers */}
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[[uz ? "Hozir platformada" : "On the platform now", nf(n), uz ? "namuna" : "specimens", "#14573a"], [uz ? "GBIF’da mavjud" : "Available on GBIF", available ? `~${nf(available.region)}` : "…", uz ? "shu hududda" : "in this region", "#0F766E"], [uz ? "Ko‘rsatilmoqda" : "Shown", available ? `${pct < 1 ? "<1" : pct.toFixed(1)}%` : "…", uz ? "mavjud ma’lumotdan" : "of what exists", low ? "#B45309" : "#14573a"]].map(([l, v, u, c]) => (
                    <div key={l} className="rounded-2xl bg-slate-50 p-3.5 first:col-span-2 sm:p-4 sm:first:col-span-1 ring-1 ring-slate-200"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{l}</div><div className="mt-1 text-[24px] font-extrabold leading-none sm:text-[28px] tabular-nums" style={{ color: c }}>{v}</div><div className="mt-0.5 text-[12.5px] text-slate-500">{u}</div></div>
                  ))}
                </div>
                {available && <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#2fa855] to-[#14573a]" initial={{ width: 0 }} animate={{ width: `${Math.max(1.2, pct)}%` }} transition={{ duration: 0.9 }} /></div>}
                {low && <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13.5px] font-medium leading-snug text-amber-900 ring-1 ring-amber-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{uz ? "Ma’lumot hozircha kam: natijalar (ayniqsa “o‘simliklar o‘zgarishi”) butun rasmni ko‘rsatmaydi. Pastdagi tugma bilan ma’lumotni ko‘paytirishingiz mumkin." : "Data is still limited: results (especially “plant changes”) don’t show the full picture. You can add more with the button below."}</p>}
              </div>

              {/* source */}
              <div className="rounded-2xl p-4 ring-1 ring-emerald-200" style={{ background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><b className="rounded-md bg-[#14573a] px-2 py-1 text-[13px] text-white">GBIF.org</b><span className="text-[14px] font-semibold text-slate-800">Global Biodiversity Information Facility</span></div>
                  <a href="https://www.gbif.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#14573a] hover:underline">gbif.org<ExternalLink size={13} /></a></div>
                <p className="mt-2 text-[13.5px] leading-snug text-slate-600">{uz ? `Ma’lumotlar GBIF ochiq API’si orqali olinadi — dunyo gerbariylari yuborgan haqiqiy namunalar. Boshlang‘ich to‘plam (${nf(meta.base)} ta) ${date} sanada yuklangan${extra ? `; siz yana ${nf(extra)} ta qo‘shdingiz` : ""}.` : `Data is fetched from the open GBIF API — real specimens contributed by herbaria worldwide. The starting set (${nf(meta.base)}) was downloaded on ${date}${extra ? `; you added ${nf(extra)} more` : ""}.`}</p>
                <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-[auto_1fr] [&>div>dt]:mt-1.5 sm:[&>div>dt]:mt-0">
                  {filters.map(([k, vals]) => (<div key={k as string} className="contents"><dt className="pt-0.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt><dd className="flex flex-wrap gap-1.5">{(vals as string[]).map((v) => <span key={v} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[12.5px] font-medium text-slate-700 ring-1 ring-emerald-200">{k === filters[0][0] && <Flag country={v} />}{v}</span>)}</dd></div>))}
                </dl>
              </div>

              {/* breakdown */}
              <div className="grid gap-5 md:grid-cols-2">
                <div><div className="mb-2 text-[13.5px] font-bold text-slate-900">{uz ? "Davlatlar bo‘yicha" : "By country"}</div>
                  <ul className="space-y-1.5">{byCountry.map(([c, v]) => (<li key={c} className="grid grid-cols-[90px_1fr_auto] sm:grid-cols-[110px_1fr_auto] items-center gap-2 text-[12.5px]"><span className="inline-flex items-center gap-1.5 truncate text-slate-700"><Flag country={c} />{c}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><motion.span className="block h-2 rounded-full bg-[#14573a]" initial={{ width: 0 }} animate={{ width: `${(v / maxC) * 100}%` }} transition={{ duration: 0.7 }} /></span><b className="tabular-nums text-slate-900">{nf(v)}</b></li>))}</ul></div>
                <div><div className="mb-2 flex items-center justify-between text-[13.5px] font-bold text-slate-900"><span>{uz ? "Qaysi muassasalardan" : "From which institutions"}</span><span className="text-[12px] font-normal text-slate-500">{byInst.length}</span></div>
                  <ul className="space-y-1.5">{byInst.slice(0, 6).map(([c, v]) => (<li key={c} className="grid grid-cols-[100px_1fr_auto] sm:grid-cols-[130px_1fr_auto] items-center gap-2 text-[12.5px]"><span className="truncate text-slate-700" title={c}>{c}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><motion.span className="block h-2 rounded-full bg-[#0F766E]" initial={{ width: 0 }} animate={{ width: `${(v / maxI) * 100}%` }} transition={{ duration: 0.7 }} /></span><b className="tabular-nums text-slate-900">{nf(v)}</b></li>))}</ul></div>
              </div>

              {/* CTA */}
              <div className="rounded-2xl bg-slate-900 p-4 text-white sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="w-full max-w-[460px] sm:w-auto"><div className="flex items-center gap-2 text-[16px] font-bold"><Layers size={17} />{uz ? "Ma’lumotni ko‘paytirish mumkin" : "You can add more data"}</div>
                    <p className="mt-1 text-[13px] leading-snug text-slate-300">{uz ? `Tugmani bossangiz, GBIF’dan yana 1000 ta namuna olinadi (yillar bo‘yicha teng taqsimlab, eng ko‘p yozilgan ${nf(pool.length)} tur ichidan). Taxminan 1 daqiqa. Istagancha qayta bosish mumkin${available ? ` — jami ~${nf(available.loadable)} tagacha` : ""}.` : `Click to fetch 1,000 more specimens from GBIF (spread evenly across decades, from the ${nf(pool.length)} most-recorded species). Takes about a minute and can be repeated${available ? ` — up to ~${nf(available.loadable)} in total` : ""}.`}</p></div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={loadMoreRecords} disabled={loadingMore || !pool.length} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#2fa855] to-[#1b7a3a] px-6 py-3 text-[15px] font-bold text-white shadow-lg sm:w-auto transition hover:brightness-110 disabled:opacity-70">
                    {loadingMore ? <><Loader2 size={17} className="animate-spin" />{loadMsg || (uz ? "Yuklanmoqda…" : "Loading…")}</> : <><CloudDownload size={17} />{uz ? "+1000 namuna qo‘shish" : "Add 1,000 specimens"}</>}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
