import { useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  compact: boolean;
}

export default function Dropzone({ onFiles, compact }: Props) {
  const [over, setOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors
        focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-page
        ${compact ? "px-6 py-5" : "px-6 py-20"}
        ${over ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-muted"}`}
    >
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = ""; // allow re-adding the same file
        }}
      />
      <span className="text-base font-semibold">
        {compact ? "Add more photos" : "Drop photos here, or click to choose"}
      </span>
      {!compact && (
        <span className="mt-1 text-sm text-muted">
          JPG, PNG or WebP, up to 25 MB each
        </span>
      )}
    </label>
  );
}
