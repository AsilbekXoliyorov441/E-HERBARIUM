export type IUCN = "CR" | "EN" | "VU" | "NT" | "LC" | "DD" | "NE";
export type TypeStatus = string;

export interface Specimen {
  id: string;
  binomial: string;
  authority: string;
  family: string;
  tashBarcode: string;
  typeStatus: TypeStatus;
  iucn: IUCN;
  collector: string;
  date: string; // ISO
  year: number;
  country: string;
  region: string;
  lat: number;
  lng: number;
  elevation: number;
  /** present only for real GBIF records */
  real?: boolean;
  image?: string;
  gbifKey?: number;
  mediaHash?: string;
  license?: string;
  rightsHolder?: string;
  institution?: string;
  locality?: string;
  gbifUrl?: string;
  catalog?: string;
}


export const REGIONS: { name: string; group: "UZ" | "ASIA"; center: [number, number]; zoom: number }[] = [
  { name: "Western Tien-Shan (Chimgan, Chatkal)", group: "UZ", center: [70.05, 41.55], zoom: 9.2 },
  { name: "Hissar-Darvaz", group: "UZ", center: [67.9, 38.7], zoom: 8.6 },
  { name: "Pamir-Alay", group: "UZ", center: [68.6, 39.3], zoom: 8.2 },
  { name: "Kyzylkum Desert", group: "UZ", center: [64.0, 41.0], zoom: 6.6 },
  { name: "Ustyurt Plateau", group: "UZ", center: [56.5, 43.5], zoom: 6.6 },
  { name: "Aralkum", group: "UZ", center: [60.0, 44.3], zoom: 6.8 },
  { name: "Kazakhstan", group: "ASIA", center: [72.0, 46.5], zoom: 4.6 },
  { name: "Kyrgyzstan", group: "ASIA", center: [74.6, 41.8], zoom: 6.2 },
  { name: "Tajikistan", group: "ASIA", center: [70.9, 38.6], zoom: 6.4 },
  { name: "Iran", group: "ASIA", center: [53.7, 32.4], zoom: 4.6 },
  { name: "Himalaya / Nepal", group: "ASIA", center: [84.0, 28.3], zoom: 6.8 },
  { name: "China (Yunnan–Changbai)", group: "ASIA", center: [105.0, 35.0], zoom: 3.6 },
  { name: "Mongolia", group: "ASIA", center: [103.8, 46.8], zoom: 4.6 },
];

// Simplified Uzbekistan outline (WGS84, lng/lat) for the border overlay
export const UZ_BORDER: [number, number][] = [
  [56.0, 45.0], [58.6, 45.6], [61.0, 44.4], [62.0, 43.5], [64.9, 43.7], [66.1, 42.99], [68.0, 43.5], [69.0, 41.4],
  [70.5, 41.4], [71.3, 42.2], [72.2, 41.0], [73.1, 40.85], [71.6, 40.2], [70.4, 40.0], [70.7, 39.5], [69.0, 37.1],
  [67.8, 37.2], [66.5, 37.35], [66.5, 38.0], [65.6, 38.2], [64.2, 38.95], [63.2, 39.2], [62.4, 40.0], [61.2, 41.3],
  [60.0, 41.4], [58.5, 42.1], [56.9, 41.9], [56.0, 41.3], [55.9, 44.0], [56.0, 45.0],
];

export const ASIA_BORDER_NOTE = "Approximate generalised outlines; not for legal boundary use.";

// Simplified desert zone polygon (Kyzylkum) for geo-validation of elevation
export const KYZYLKUM_BOX = { minLng: 61.5, maxLng: 66.5, minLat: 39.8, maxLat: 43.0, maxElev: 700 };


export interface GbifRecord {
  gbifKey: number; binomial: string; scientificName: string; family: string; collector: string; date: string; year: number | null;
  country: string; region: string; locality: string; lat: number; lng: number; elevation: number | null; iucn: string | null;
  mediaHash: string; typeStatus: string | null; institution: string; catalogNumber: string; image: string; license: string; rightsHolder: string; gbifUrl: string;
}


export function fromGbif(r: GbifRecord): Specimen {
  const inst = r.institution || "—";
  return {
    id: `g${r.gbifKey}`,
    binomial: r.binomial,
    authority: r.scientificName.startsWith(r.binomial) ? r.scientificName.slice(r.binomial.length).trim() : "",
    family: r.family || "—",
    tashBarcode: r.catalogNumber ? `${inst} ${r.catalogNumber}` : inst,
    typeStatus: r.typeStatus ?? "—",
    iucn: (r.iucn as Specimen["iucn"]) ?? "NE",
    collector: r.collector || "unknown",
    date: r.date,
    year: r.year ?? 0,
    country: r.country,
    region: r.region || r.country,
    lat: r.lat,
    lng: r.lng,
    elevation: r.elevation ?? 0,
      real: true,
    image: r.image,
    gbifKey: r.gbifKey,
    mediaHash: r.mediaHash,
    license: r.license,
    rightsHolder: r.rightsHolder,
    institution: r.institution,
    locality: r.locality,
    gbifUrl: r.gbifUrl,
    catalog: r.catalogNumber,
  };
}

/** Resized image from GBIF's cache (≈10 KB instead of multi-MB originals). Falls back to the original URL. */
export function thumbUrl(s: Specimen, width = 260): string | undefined {
  if (!s.image) return undefined;
  if (s.gbifKey && s.mediaHash) return `https://api.gbif.org/v1/image/cache/fit-in/${width}x/occurrence/${s.gbifKey}/media/${s.mediaHash}`;
  return s.image;
}
