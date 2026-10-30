import SpecimenPage from "@/components/SpecimenPage";

export default function Page({ params }: { params: { id: string } }) {
  return <SpecimenPage id={decodeURIComponent(params.id)} />;
}
