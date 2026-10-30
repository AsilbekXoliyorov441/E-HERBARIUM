"use client";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, MapPinned, Sparkles, Upload, Wand2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { analyseRow, fixAll, fixIssue, ImportRow, IssueKind, SAMPLE_LEGACY } from "@/lib/geo";
import { importSpreadsheet } from "@/lib/importClient";

const ROW_PAGE = 100;
const KIND_STYLE: Record<IssueKind, { label: string; cls: string }> = {
  dms: { label: "DMS → Decimal", cls: "bg-sky-100 text-sky-900 border-sky-300" },
  inverted: { label: "Lat/Lng inverted", cls: "bg-red-100 text-red-900 border-red-300" },
  taxon: { label: "Taxonomic typo", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  elevation: { label: "Elevation out of range", cls: "bg-purple-100 text-purple-900 border-purple-300" },
};
const FIX_LABEL: Record<IssueKind, string> = { dms: "Accept", inverted: "Swap Lat/Lng", taxon: "Use IPNI name", elevation: "Correct" };

export default function ImporterPanel({ onPlot }: { onPlot: (pts: { id: string; lat: number; lng: number; label: string }[]) => void }) {
  const { t } = useLang();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [name, setName] = useState("");
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(ROW_PAGE); // render rows in pages: thousands of <tr> at once would freeze the page
  const [progress, setProgress] = useState(0);
  const file = useRef<HTMLInputElement>(null);

  const loadSample = () => { setName("legacy_expedition_1932-1958.xlsx (sample)"); setErr(""); setRows(SAMPLE_LEGACY.map((r) => analyseRow(r))); };

  const parse = async (f: File) => {
    try {
      setErr(""); setBusy(true); setProgress(0);
      const out = await importSpreadsheet(f, setProgress); // runs in a Web Worker
      setName(f.name); setRows(out); setShown(ROW_PAGE);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not read file"); }
    finally { setBusy(false); }
  };

  const total = rows.reduce((a, r) => a + r.issues.length, 0);
  const counts = (["dms", "inverted", "taxon", "elevation"] as IssueKind[]).map((k) => ({ k, n: rows.filter((r) => r.issues.some((i) => i.kind === k)).length }));
  const plottable = (rs: ImportRow[]) => rs.filter((r) => r.lat != null && r.lng != null && r.issues.every((i) => i.kind !== "inverted")).map((r) => ({ id: `imp${r.id}`, lat: r.lat!, lng: r.lng!, label: r.taxon }));

  const applyFix = (id: number, kind: IssueKind) => setRows((rs) => rs.map((r) => (r.id === id ? fixIssue(r, kind) : r)));
  const oneClick = () => { const fixed = fixAll(rows); setRows(fixed); onPlot(plottable(fixed)); };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-[28px] leading-tight sm:text-4xl italic text-emerald-deep">{t("imp.title")}</h2>
          <p className="max-w-2xl text-[15px] text-ink/70">{t("imp.lead")}</p>
        </div>
        <button onClick={loadSample} className="flex min-h-[44px] items-center justify-center gap-2 border border-gold bg-gold/10 px-4 py-2 text-[15px] font-semibold text-gold hover:bg-gold hover:text-white"><FileSpreadsheet size={15} />{t("imp.sample")}</button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) parse(f); }}
        onClick={() => file.current?.click()}
        className={`mb-6 flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-8 text-center text-[15px] sm:flex-row sm:gap-3 transition ${drag ? "border-gold bg-gold/10" : "border-ink/25 hover:bg-ink/5"}`}
      >
        <Upload size={18} className="text-emerald-deep" /> {t("imp.drop")}
        <input ref={file} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && parse(e.target.files[0])} />
      </div>
      {busy && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-[14px] font-semibold text-emerald-900"><span>{t("imp.title")}…</span><span className="tabular-nums">{Math.round(progress * 100)}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-2 rounded-full bg-[#1b7a45] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        </div>
      )}
      {err && <p className="mb-4 border border-red-300 bg-red-50 p-3 text-[15px] text-red-800">{err}</p>}

      {rows.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="w-full break-all font-mono text-[13px] text-ink/60 sm:w-auto">{name} · {rows.length} rows</span>
            {counts.map(({ k, n }) => (<span key={k} className={`border px-2 py-0.5 text-[14px] ${KIND_STYLE[k].cls}`}>{KIND_STYLE[k].label}: {n}</span>))}
            <span className="hidden flex-1 sm:block" />
            <button disabled={total === 0 && rows.length === 0} onClick={oneClick} className="flex min-h-[44px] w-full items-center justify-center gap-2 bg-emerald-deep px-5 py-2.5 sm:w-auto text-[15px] font-semibold text-paper shadow hover:bg-emerald-900"><Wand2 size={15} />{t("imp.fixall")}</button>
            {total === 0 && <button onClick={() => onPlot(plottable(rows))} className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-emerald-deep px-4 py-2 text-[15px] sm:w-auto"><MapPinned size={15} />Plot</button>}
          </div>
          <div className="overflow-x-auto border border-ink/20 bg-white/70">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="bg-ink/5 font-mono text-[13px] uppercase tracking-wider text-ink/60"><tr>{["#", "Taxon", "Collector", "Date", "Coordinates (raw)", "Lat", "Lng", "Elev m", "Status"].map((h) => (<th key={h} className="px-3 py-2">{h}</th>))}</tr></thead>
              <tbody>
                {rows.slice(0, shown).map((r) => {
                  const has = (k: IssueKind) => r.issues.some((i) => i.kind === k);
                  return (
                    <tr key={r.id} className="border-t border-ink/10 align-top">
                      <td className="px-3 py-2 font-mono">{r.id}</td>
                      <td className={`px-3 py-2 font-serif text-[15px] italic ${has("taxon") ? "bg-amber-100" : ""}`}>{r.taxon}</td>
                      <td className="px-3 py-2">{r.collector}</td>
                      <td className="px-3 py-2 font-mono">{r.date}</td>
                      <td className={`px-3 py-2 font-mono ${has("dms") ? "bg-sky-100" : ""}`}>{r.coordsRaw}</td>
                      <td className={`px-3 py-2 font-mono ${has("inverted") ? "bg-red-100 font-bold text-red-800" : ""}`}>{r.lat?.toFixed(6) ?? "—"}</td>
                      <td className={`px-3 py-2 font-mono ${has("inverted") ? "bg-red-100 font-bold text-red-800" : ""}`}>{r.lng?.toFixed(6) ?? "—"}</td>
                      <td className={`px-3 py-2 font-mono ${has("elevation") ? "bg-purple-100 font-bold text-purple-800" : ""}`}>{r.elevation ?? "—"}</td>
                      <td className="px-3 py-2">
                        {r.issues.length === 0 ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={13} />Valid</span> : (
                          <div className="space-y-1">
                            {r.issues.map((i) => (
                              <div key={i.kind} className="flex flex-wrap items-start gap-2"><AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-600" />
                                <span className="max-w-[260px]">{i.message}</span>
                                <button onClick={() => applyFix(r.id, i.kind)} className="flex shrink-0 items-center gap-1 border border-emerald-deep px-2 py-1 text-[13px] font-semibold text-emerald-deep hover:bg-emerald-deep hover:text-paper"><Sparkles size={10} />{FIX_LABEL[i.kind]}</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > shown && (
            <div className="mt-3 flex items-center justify-between gap-3 text-[14px] text-ink/60">
              <span>{shown} / {rows.length}</span>
              <button onClick={() => setShown((n) => n + ROW_PAGE)} className="min-h-[44px] border border-emerald-deep px-5 py-2 text-[15px] font-semibold text-emerald-deep hover:bg-emerald-deep hover:text-white">+{Math.min(ROW_PAGE, rows.length - shown)}</button>
            </div>
          )}
          <p className="mt-3 text-[14px] text-ink/50">Geo-fence: lat 36–47°, lng 55–75° (Uzbekistan & neighbours). Rows flagged "inverted" are excluded from plotting until swapped. Taxon matching uses the 16-taxon reference list bundled with this demo, not live IPNI.</p>
        </>
      )}
    </div>
  );
}
