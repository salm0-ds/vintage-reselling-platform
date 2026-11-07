import type { RemoveResult, Settings } from "./types";

// Sends one image to the backend. One request per image keeps progress and
// error handling per-file: a failure never affects the rest of the batch.
export async function removeBackground(
  file: File,
  settings: Settings,
): Promise<RemoveResult> {
  const body = new FormData();
  body.append("file", file);
  body.append("model", settings.model);
  body.append("operating_resolution", settings.resolution);
  body.append("output_format", settings.format);
  body.append("refine_foreground", String(settings.refine));
  body.append("output_mask", String(settings.mask));

  let res: Response;
  try {
    res = await fetch("/api/remove", { method: "POST", body });
  } catch {
    throw new Error("Can't reach the server. Is the backend running?");
  }

  if (!res.ok) {
    // FastAPI errors look like { detail: "..." }
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail ?? `Request failed (${res.status}).`);
  }
  return res.json();
}
