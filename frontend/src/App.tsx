import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { removeBackground } from "./api";
import Dropzone from "./components/Dropzone";
import ResultCard from "./components/ResultCard";
import SettingsPanel from "./components/SettingsPanel";
import { DEFAULT_SETTINGS, type Item, type Settings } from "./types";

const MAX_MB = 25;
const CONCURRENCY = 3; // images sent to the backend at the same time
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Runs `worker` over `items`, at most `limit` at a time.
async function runPool<T>(items: T[], limit: number, worker: (t: T) => Promise<void>) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) await worker(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

const stem = (name: string) => name.replace(/\.[^.]+$/, "");

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Keep the latest items reachable for cleanup on unmount.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  const patch = (id: string, changes: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  function addFiles(files: File[]) {
    const skipped: string[] = [];
    const accepted: Item[] = [];
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) skipped.push(`${file.name} (not JPG, PNG or WebP)`);
      else if (file.size > MAX_MB * 1024 * 1024) skipped.push(`${file.name} (over ${MAX_MB} MB)`);
      else
        accepted.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
        });
    }
    setItems((prev) => [...prev, ...accepted]);
    setNotice(skipped.length ? `Skipped: ${skipped.join(", ")}` : null);
  }

  async function run(targets: Item[]) {
    if (!targets.length) return;
    setRunning(true);
    const snapshot = settings; // changing settings mid-run doesn't affect this batch
    await runPool(targets, CONCURRENCY, async (item) => {
      patch(item.id, { status: "processing", error: undefined });
      try {
        const result = await removeBackground(item.file, snapshot);
        patch(item.id, { status: "done", result });
      } catch (e) {
        console.error(`Failed: ${item.file.name}`, e);
        patch(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Something went wrong.",
        });
      }
    });
    setRunning(false);
  }

  function removeItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clearAll() {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setNotice(null);
  }

  function downloadOne(item: Item) {
    if (!item.result) return;
    const a = document.createElement("a");
    a.href = item.result.image;
    a.download = `${stem(item.file.name)}_nobg.${item.result.format}`;
    a.click();
  }

  async function downloadAll() {
    const zip = new JSZip();
    const used = new Set<string>();
    const unique = (name: string) => {
      let candidate = name;
      for (let n = 2; used.has(candidate); n++) candidate = name.replace(/(\.[^.]+)$/, `-${n}$1`);
      used.add(candidate);
      return candidate;
    };
    for (const item of items) {
      if (item.status !== "done" || !item.result) continue;
      const { image, mask, format } = item.result;
      zip.file(unique(`${stem(item.file.name)}_nobg.${format}`), await (await fetch(image)).blob());
      if (mask) zip.file(unique(`${stem(item.file.name)}_mask.png`), await (await fetch(mask)).blob());
    }
    const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cutouts.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  const queued = items.filter((i) => i.status === "queued");
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cutout</h1>
        <p className="mt-1 text-muted">Remove the background from a batch of photos.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SettingsPanel settings={settings} onChange={setSettings} disabled={running} />
        </aside>

        <main className="space-y-5">
          <Dropzone onFiles={addFiles} compact={items.length > 0} />

          {notice && (
            <p role="status" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-danger">
              {notice}
            </p>
          )}

          {items.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => run(queued)}
                  disabled={running || queued.length === 0}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {running ? "Working…" : `Remove background${queued.length === 1 ? "" : "s"} (${queued.length})`}
                </button>
                <button
                  onClick={downloadAll}
                  disabled={running || done === 0}
                  className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Download all (zip)
                </button>
                <button
                  onClick={clearAll}
                  disabled={running}
                  className="px-2 py-2 text-sm text-muted hover:underline disabled:opacity-40"
                >
                  Clear all
                </button>
                <p className="ml-auto text-sm text-muted" aria-live="polite">
                  {done} of {items.length} done{failed > 0 && `, ${failed} failed`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {items.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    onRetry={() => run([item])}
                    onDownload={() => downloadOne(item)}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
