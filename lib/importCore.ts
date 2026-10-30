import * as XLSX from "xlsx";
import { analyseRow } from "./geo";
import type { ImportRow } from "./geo";

const pick = (o: Record<string, unknown>, names: string[]) => {
  const k = Object.keys(o).find((x) => names.some((n) => x.toLowerCase().replace(/[\s_]/g, "").includes(n)));
  return k ? o[k] : undefined;
};

/** Parses the first sheet of a spreadsheet and runs the geo/taxonomy checks on every row. Pure: runs in the import worker (or as a fallback on the main thread). */
export function parseWorkbook(buffer: ArrayBuffer, onProgress?: (done: number, total: number) => void): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  if (!json.length) throw new Error("The first sheet is empty.");
  const out: ImportRow[] = [];
  json.forEach((o, i) => {
    const latC = pick(o, ["latitude", "lat"]), lngC = pick(o, ["longitude", "lng", "lon"]);
    const coords = pick(o, ["coord", "gps", "xy"]);
    const elev = pick(o, ["elev", "altitude", "alt"]);
    const hasSep = latC !== undefined && lngC !== undefined && latC !== "" && lngC !== "";
    out.push(analyseRow({
      id: i + 1,
      taxon: String(pick(o, ["taxon", "species", "name", "binomial"]) ?? ""),
      collector: String(pick(o, ["collector", "leg"]) ?? ""),
      date: String(pick(o, ["date"]) ?? ""),
      coordsRaw: hasSep ? `${latC}, ${lngC}` : String(coords ?? ""),
      lat: hasSep ? parseFloat(String(latC).replace(",", ".")) : null,
      lng: hasSep ? parseFloat(String(lngC).replace(",", ".")) : null,
      elevation: elev === "" || elev === undefined ? null : parseFloat(String(elev)),
      locality: String(pick(o, ["locality", "place", "site"]) ?? ""),
    }));
    if (onProgress && (i % 250 === 0 || i === json.length - 1)) onProgress(i + 1, json.length);
  });
  return out;
}
