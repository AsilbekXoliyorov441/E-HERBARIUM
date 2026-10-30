// Usage: npx tsx scripts/fetch-gbif.mts   — builds public/data/gbif-specimens.json (≈1000 records, evenly spread over decades)
import { writeFileSync } from "node:fs";
import { loadMore, md5, topSpecies } from "../lib/gbif";

const species = await topSpecies(150);
console.log("species pool", species.length);
const records = await loadMore(1000, new Set(), species, (n) => console.log("collected", n));
for (const r of records) r.mediaHash = md5(r.image);
writeFileSync("public/data/gbif-specimens.json", JSON.stringify({ generated: new Date().toISOString(), source: "GBIF occurrence API (api.gbif.org/v1)", speciesPool: species, count: records.length, records }));
console.log("total", records.length);
