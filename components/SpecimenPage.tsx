"use client";
import { useEffect } from "react";
import SpecimenDetail from "@/components/SpecimenDetail";
import { useData, useUi } from "@/lib/store";

export default function SpecimenPage({ id }: { id?: string }) {
  const { all } = useData();
  const { go, openSpecimen, setSelected } = useUi();
  useEffect(() => { if (id) setSelected(id); }, [id, setSelected]);
  const spec = (id ? all.find((s) => s.id === id) : undefined) ?? all.find((x) => x.image);
  if (!spec) return <div className="absolute inset-0 z-10 bg-paper" />;
  return (
    <div key={spec.id} className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-paper">
      <SpecimenDetail specimen={spec} all={all} onOpen={go} onSelect={openSpecimen} onShowOnMap={(sid) => { setSelected(sid); go("atlas"); }} />
    </div>
  );
}
