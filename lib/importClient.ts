import { REFERENCE_TAXA } from "./geo";
import type { ImportRow } from "./geo";

let seq = 0;

/**
 * Reads a spreadsheet and analyses every row in a Web Worker (large files and fuzzy taxon matching would otherwise freeze the page).
 * The file buffer is transferred, not copied. Falls back to the main thread if workers are unavailable.
 */
export async function importSpreadsheet(file: File, onProgress?: (p: number) => void): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer();
  let worker: Worker | null = null;
  try { worker = new Worker(new URL("./import.worker.ts", import.meta.url)); } catch { worker = null; }
  if (!worker) {
    const { parseWorkbook } = await import("./importCore"); // xlsx is loaded only when needed
    return parseWorkbook(buffer, (d, t) => onProgress?.(d / t));
  }
  const w = worker;
  const id = ++seq;
  return new Promise<ImportRow[]>((resolve, reject) => {
    w.onmessage = (e: MessageEvent<{ id: number; progress?: number; rows?: ImportRow[]; error?: string }>) => {
      if (e.data.id !== id) return;
      if (e.data.progress !== undefined) onProgress?.(e.data.progress);
      else if (e.data.error) reject(new Error(e.data.error));
      else if (e.data.rows) resolve(e.data.rows);
    };
    w.onerror = () => reject(new Error("Could not read file"));
    w.postMessage({ id, buffer, taxa: REFERENCE_TAXA }, [buffer]);
  }).finally(() => w.terminate());
}
