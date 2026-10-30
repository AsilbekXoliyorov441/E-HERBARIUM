"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import HomeView from "@/components/HomeView";
import { useData, useUi } from "@/lib/store";

export default function HomePage() {
  const { all } = useData();
  const { go, openSpecimen } = useUi();
  const router = useRouter();
  const onSearch = useCallback((q: string) => router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search"), [router]);
  return <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-paper"><HomeView all={all} onOpen={go} onSearch={onSearch} onSelect={openSpecimen} /></div>;
}
