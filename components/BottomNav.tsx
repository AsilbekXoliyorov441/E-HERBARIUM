"use client";
import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Box, FlaskConical, Home, LineChart } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useUi } from "@/lib/store";

const SPRING = { type: "spring", stiffness: 480, damping: 30 } as const;

// Mobile navigation bar (dark green, rounded top). Active item = white tile that slides between items. Hidden on desktop.
function BottomNav() {
  const { t } = useLang();
  const { tab, selected } = useUi();
  const items = [
    { id: "home", icon: Home, label: t("nav.home"), href: "/" },
    { id: "atlas", icon: Box, label: t("nav.atlas"), href: "/atlas" },
    { id: "specimen", icon: FlaskConical, label: t("nav.specimen"), href: selected ? `/specimen/${encodeURIComponent(selected)}` : "/specimen" },
    { id: "dynamics", icon: LineChart, label: t("nav.dynamics"), href: "/dynamics" },
  ] as const;

  return (
    <motion.nav initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }} aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-b from-[#0f4a32] to-[#072a1c] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-10px_rgba(6,40,29,.5)] lg:hidden">
      <ul className="mx-auto grid h-[80px] max-w-[640px] grid-cols-4 gap-1 px-2 pb-3 pt-2">
        {items.map((it) => {
          const Icon = it.icon;
          const on = it.id === tab;
          return (
            <li key={it.id} className="min-w-0">
              <Link href={it.href} aria-current={on ? "page" : undefined} className="relative flex h-full flex-col items-center justify-center gap-1 rounded-2xl active:scale-95">
                {on && <motion.span layoutId="bn-tile" transition={SPRING} className="absolute inset-x-1 inset-y-0 rounded-2xl bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,.55)]" />}
                <motion.span key={on ? "on" : "off"} initial={on ? { scale: 0.6, y: 6 } : false} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 520, damping: 15 }} className="relative">
                  <Icon size={27} strokeWidth={on ? 2.5 : 2} className={on ? "text-[#0e5a37]" : "text-emerald-100/75"} />
                </motion.span>
                <span className={`relative max-w-full truncate px-1 text-[12.5px] leading-none ${on ? "font-extrabold text-[#0e3b29]" : "font-semibold text-emerald-100/75"}`}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}

export default memo(BottomNav);
