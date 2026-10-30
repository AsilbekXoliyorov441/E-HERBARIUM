import { memo } from "react";
const ISO: Record<string, string> = {
  uzbekistan: "uz", kazakhstan: "kz", kyrgyzstan: "kg", tajikistan: "tj", turkmenistan: "tm",
  afghanistan: "af", russia: "ru", "russian federation": "ru", china: "cn", iran: "ir", mongolia: "mn", turkey: "tr", pakistan: "pk", india: "in",
};

function Flag({ country, className = "" }: { country?: string | null; className?: string }) {
  const code = country ? (ISO[country.trim().toLowerCase()] ?? (/^[a-z]{2}$/i.test(country.trim()) ? country.trim().toLowerCase() : "")) : "";
  if (!code) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://flagcdn.com/w40/${code}.png`} srcSet={`https://flagcdn.com/w80/${code}.png 2x`} width={20} height={15} alt={country ?? ""} loading="lazy" className={`inline-block h-[15px] w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 ${className}`} />;
}

export default memo(Flag);
