"use client";
import { useEffect, useState } from "react";
import { Specimen, thumbUrl } from "@/lib/data";

/**
 * Returns `n` thumbnail URLs that really load (GBIF's image cache is occasionally flaky).
 * Loads only `n` images at a time and moves to the next candidate only when one fails — no wasted downloads.
 */
export function useLoadedThumbs(cands: Specimen[], n: number, width: number): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  const pool = cands.slice(0, 14);
  const key = pool.map((s) => s.id).join(",") + `|${n}|${width}`;
  useEffect(() => {
    let live = true;
    const ok: string[] = [];
    setUrls([]);
    let next = 0;
    const attempt = () => {
      while (next < pool.length) {
        const u = thumbUrl(pool[next++], width);
        if (!u) continue;
        const im = new Image();
        im.referrerPolicy = "no-referrer";
        im.decoding = "async";
        im.onload = () => { if (live && ok.length < n) { ok.push(u); setUrls([...ok]); } };
        im.onerror = () => { if (live && ok.length < n) attempt(); };
        im.src = u;
        return;
      }
    };
    for (let i = 0; i < n; i++) attempt();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}
