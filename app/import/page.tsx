"use client";
import ImporterPanel from "@/components/ImporterPanel";
import { useFilters, useUi } from "@/lib/store";

export default function ImportPage() {
  const { setPlotted } = useFilters();
  const { go } = useUi();
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-paper"><div className="mx-auto max-w-[1280px] px-4 py-5 sm:p-6 lg:p-8">
      <ImporterPanel onPlot={(pts) => { setPlotted(pts); go("atlas"); }} />
    </div></div>
  );
}
