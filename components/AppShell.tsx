"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useUi } from "@/lib/store";

// Heavy / rarely-needed UI is code-split so the first page load stays small.
const AtlasView = dynamic(() => import("@/components/AtlasView"), { ssr: false });
const GlobalSearch = dynamic(() => import("@/components/GlobalSearch"), { ssr: false });
const DataPanel = dynamic(() => import("@/components/DataPanel"), { ssr: false });

export default function AppShell({ children }: { children: React.ReactNode }) {
  const active = usePathname().startsWith("/atlas");
  const { dataOpen } = useUi();
  const [opened, setOpened] = useState(false);
  const [idle, setIdle] = useState(false); // Ctrl+K search is loaded once the browser is idle
  const [dataSeen, setDataSeen] = useState(false);
  useEffect(() => { if (active) setOpened(true); }, [active]);
  useEffect(() => { if (dataOpen) setDataSeen(true); }, [dataOpen]);
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(() => setIdle(true)); return () => (window as unknown as { cancelIdleCallback: (n: number) => void }).cancelIdleCallback(id); }
    const id = setTimeout(() => setIdle(true), 1500);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overscroll-none">
      <Header />
      <main className="relative mb-[calc(80px+env(safe-area-inset-bottom))] min-h-0 flex-1 lg:mb-0">
        {children}
        {(opened || active) && <AtlasView active={active} />}
      </main>
      <BottomNav />
      {idle && <GlobalSearch />}
      {(dataSeen || dataOpen) && <DataPanel />}
    </div>
  );
}
