import { parseWorkbook } from "./importCore";
import { setReferenceNames } from "./geo";

type In = { id: number; buffer: ArrayBuffer; taxa: { name: string; binomial: string }[] };
const ctx = self as unknown as { postMessage: (m: unknown) => void; onmessage: ((e: MessageEvent<In>) => void) | null };

ctx.onmessage = (e) => {
  const { id, buffer, taxa } = e.data;
  try {
    setReferenceNames(taxa);
    const rows = parseWorkbook(buffer, (done, total) => ctx.postMessage({ id, progress: done / total }));
    ctx.postMessage({ id, rows });
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : "Could not read file" });
  }
};
