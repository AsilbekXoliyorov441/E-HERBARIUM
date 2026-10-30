"use client";
import DynamicsView from "@/components/DynamicsView";
import { useData, useFilters, useUi } from "@/lib/store";

export default function DynamicsPage() {
  const { all } = useData();
  const { showSpeciesOnMap, showChangeOnMap } = useFilters();
  const { openSpecimen } = useUi();
  return <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-paper"><DynamicsView all={all} onShowOnMap={showSpeciesOnMap} onChangeMap={showChangeOnMap} onOpenSpecimen={openSpecimen} /></div>;
}
