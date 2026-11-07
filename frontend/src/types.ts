// Options mirror fal-ai/birefnet/v2. Each model has a short hint shown in the UI.
export const MODELS = [
  { value: "General Use (Light)", hint: "Fast. Good for most photos." },
  { value: "General Use (Light 2K)", hint: "Light model tuned for larger images." },
  { value: "General Use (Heavy)", hint: "Slower, cleaner on hard edges." },
  { value: "Matting", hint: "Best for hair, fur and glass." },
  { value: "Portrait", hint: "Tuned for people." },
  { value: "General Use (Dynamic)", hint: "Required for 2304 resolution." },
] as const;

export const RESOLUTIONS = ["1024x1024", "2048x2048", "2304x2304"] as const;
export const FORMATS = ["png", "webp", "gif"] as const;

export type Model = (typeof MODELS)[number]["value"];
export type Resolution = (typeof RESOLUTIONS)[number];
export type Format = (typeof FORMATS)[number];

export interface Settings {
  model: Model;
  resolution: Resolution;
  format: Format;
  refine: boolean;
  mask: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "General Use (Light)",
  resolution: "1024x1024",
  format: "png",
  refine: true,
  mask: false,
};

export interface RemoveResult {
  image: string; // data URL
  mask: string | null; // data URL
  format: Format;
}

export type Status = "queued" | "processing" | "done" | "error";

export interface Item {
  id: string;
  file: File;
  previewUrl: string; // object URL of the original
  status: Status;
  result?: RemoveResult;
  error?: string;
}
