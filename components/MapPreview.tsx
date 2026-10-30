"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { Specimen, thumbUrl } from "@/lib/data";

// Lightweight static map (no tiles): borders + specimen dots + plant photos pinned at their real coordinates.
const KX = Math.cos((41.5 * Math.PI) / 180);

type Line = [number, number][];

function MapPreview({ all, pins: PINS = 6, wide = false }: { all: Specimen[]; pins?: number; wide?: boolean }) {
  const [LNG0, LNG1, LAT0, LAT1] = wide ? [53, 75, 36.5, 47.5] : [58, 71, 36, 47];
  const W = (LNG1 - LNG0) * KX, H = LAT1 - LAT0;
  const px = (lng: number) => ((lng - LNG0) * KX) / W * 100;
  const py = (lat: number) => (LAT1 - lat) / H * 100;
  const [lines, setLines] = useState<Line[]>([]);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let live = true;
    fetch("/data/borders-lite.geojson").then((r) => r.json()).then((d) => {
      if (!live) return;
      const out: Line[] = [];
      for (const f of d.features) {
        const g = f.geometry;
        const parts: number[][][] = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
        for (const p of parts) {
          const pts = p.filter((_, i) => i % 2 === 0 || i === p.length - 1).filter(([x, y]) => x > LNG0 - 2 && x < LNG1 + 2 && y > LAT0 - 2 && y < LAT1 + 2);
          if (pts.length > 1) out.push(pts.map(([x, y]) => [x, y] as [number, number]));
        }
      }
      setLines(out);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const inView = useMemo(() => all.filter((s) => s.lng > LNG0 + 0.5 && s.lng < LNG1 - 0.5 && s.lat > LAT0 + 0.5 && s.lat < LAT1 - 0.5), [all]);
  const dots = useMemo(() => inView.filter((_, i) => i % Math.max(1, Math.ceil(inView.length / 260)) === 0), [inView]);
  const pins = useMemo(() => {
    const seen = new Set<string>(), chosen: Specimen[] = [];
    for (const s of inView) {
      if (!s.image || failed.has(s.id) || seen.has(s.binomial)) continue;
      if (chosen.some((c) => Math.hypot((c.lng - s.lng) * KX, c.lat - s.lat) < 1.9)) continue;
      seen.add(s.binomial); chosen.push(s);
      if (chosen.length >= PINS) break;
    }
    return chosen;
  }, [inView, failed]);

  const path = (l: Line) => l.map(([x, y], i) => `${i ? "L" : "M"}${(((x - LNG0) * KX) / W * 100).toFixed(2)} ${py(y).toFixed(2)}`).join("");

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_60%_40%,#e3f2e8,#c9e6d3)]" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="#1b6b45" strokeOpacity=".55" strokeWidth=".5" strokeLinejoin="round" strokeLinecap="round">
          {lines.map((l, i) => <path key={i} d={path(l)} />)}
        </g>
        {dots.map((s) => <circle key={s.id} cx={px(s.lng)} cy={py(s.lat)} r=".55" fill="#15803d" fillOpacity=".7" />)}
      </svg>
      {pins.map((s, i) => (
        <motion.span key={s.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${px(s.lng)}%`, top: `${py(s.lat)}%` }}
          initial={{ opacity: 0, y: -14, scale: 0.6 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.25 + i * 0.12 }}>
          <span className="relative block h-[34px] w-[34px] rounded-full bg-white p-[2px] shadow-[0_4px_10px_rgba(6,40,29,.45)] ring-2 ring-[#1b8a3e]">
            <Leaf size={16} className="absolute inset-0 m-auto text-emerald-700/50" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl(s, 80)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed((p) => new Set(p).add(s.id))} className="relative h-full w-full rounded-full object-cover object-top" />
            <span className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#1b8a3e]" />
          </span>
        </motion.span>
      ))}
    </div>
  );
}

export default memo(MapPreview);
