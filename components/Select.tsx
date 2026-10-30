"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export interface Option { value: string; label: string; hint?: string; icon?: React.ReactNode }

// Styled dropdown (the native <select> can't show flags or rich rows).
export default function Select({ value, onChange, options, icon, className = "" }: { value: string; onChange: (v: string) => void; options: Option[]; icon?: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const cur = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); } return; }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(options[active].value); }
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button type="button" onClick={() => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen((o) => !o); }} onKeyDown={onKey} aria-haspopup="listbox" aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left text-[14px] font-semibold text-slate-800 shadow-sm outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-600/20 ${open ? "border-emerald-600 ring-4 ring-emerald-600/15" : "border-slate-300 hover:border-slate-400"}`}>
        <span className="grid h-6 w-6 shrink-0 place-items-center text-emerald-700">{cur?.icon ?? icon}</span>
        <span className="min-w-0 flex-1 truncate">{cur?.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.13 }}
            className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl bg-white p-1 shadow-[0_14px_40px_-8px_rgba(6,40,29,.35)] ring-1 ring-black/10">
            {options.map((o, i) => {
              const on = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={on}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(o.value)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors ${active === i ? "bg-emerald-50" : ""} ${on ? "font-bold text-[#0e3b29]" : "font-medium text-slate-700"}`}>
                    <span className="grid h-5 w-5 shrink-0 place-items-center">{o.icon}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.hint && <span className="block truncate text-[12px] font-normal text-slate-400">{o.hint}</span>}</span>
                    {on && <Check size={15} className="shrink-0 text-emerald-700" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
