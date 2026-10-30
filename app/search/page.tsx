import { Suspense } from "react";
import SearchView from "@/components/SearchView";

export default function SearchPage() {
  return <Suspense fallback={null}><SearchView /></Suspense>;
}
