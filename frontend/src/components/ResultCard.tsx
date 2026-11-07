import { useState } from "react";
import type { Item } from "../types";

interface Props {
  item: Item;
  onRemove: () => void;
  onRetry: () => void;
  onDownload: () => void;
}

export default function ResultCard({ item, onRemove, onRetry, onDownload }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);
  const { status, result } = item;
  const showingCutout = status === "done" && !showOriginal && result;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className={`relative aspect-square ${showingCutout ? "checker" : "bg-page"}`}>
        <img
          src={showingCutout ? result.image : item.previewUrl}
          alt={item.file.name}
          className={`size-full object-contain ${
            status === "processing" || status === "error" ? "opacity-40" : ""
          }`}
        />

        {status === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none" />
          </div>
        )}
        {status === "queued" && (
          <span className="absolute left-2 top-2 rounded-md bg-surface/90 px-2 py-0.5 text-xs text-muted">
            Waiting
          </span>
        )}
        {status === "error" && (
          <p
            role="alert"
            className="absolute inset-x-2 bottom-2 rounded-md bg-surface p-2 text-xs text-danger"
          >
            {item.error}
          </p>
        )}
      </div>

      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {item.file.name}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {status === "done" && (
            <>
              <button className="font-medium text-accent hover:underline" onClick={onDownload}>
                Download
              </button>
              <button className="text-muted hover:underline" onClick={() => setShowOriginal((v) => !v)}>
                {showOriginal ? "Show cutout" : "Show original"}
              </button>
            </>
          )}
          {status === "error" && (
            <button className="font-medium text-accent hover:underline" onClick={onRetry}>
              Retry
            </button>
          )}
          {status !== "processing" && (
            <button className="text-muted hover:underline" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
