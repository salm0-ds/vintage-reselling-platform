import {
  FORMATS,
  MODELS,
  RESOLUTIONS,
  type Format,
  type Model,
  type Resolution,
  type Settings,
} from "../types";

interface Props {
  settings: Settings;
  onChange: (next: Settings) => void;
  disabled: boolean;
}

const selectClass =
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";

export default function SettingsPanel({ settings, onChange, disabled }: Props) {
  const modelHint = MODELS.find((m) => m.value === settings.model)?.hint;
  const isDynamic = settings.model === "General Use (Dynamic)";

  function setModel(model: Model) {
    // 2304 only works with the Dynamic model, so fall back if it's no longer valid.
    const resolution: Resolution =
      model !== "General Use (Dynamic)" && settings.resolution === "2304x2304"
        ? "2048x2048"
        : settings.resolution;
    onChange({ ...settings, model, resolution });
  }

  return (
    <div className="space-y-5 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">Settings</h2>

      <div>
        <label htmlFor="model" className="text-sm font-medium">
          Model
        </label>
        <select
          id="model"
          className={selectClass}
          disabled={disabled}
          value={settings.model}
          onChange={(e) => setModel(e.target.value as Model)}
        >
          {MODELS.map((m) => (
            <option key={m.value}>{m.value}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">{modelHint}</p>
      </div>

      <div>
        <label htmlFor="resolution" className="text-sm font-medium">
          Resolution
        </label>
        <select
          id="resolution"
          className={selectClass}
          disabled={disabled}
          value={settings.resolution}
          onChange={(e) =>
            onChange({ ...settings, resolution: e.target.value as Resolution })
          }
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} disabled={r === "2304x2304" && !isDynamic}>
              {r}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Higher is more accurate on large photos, but slower.
        </p>
      </div>

      <div>
        <label htmlFor="format" className="text-sm font-medium">
          Output format
        </label>
        <select
          id="format"
          className={selectClass}
          disabled={disabled}
          value={settings.format}
          onChange={(e) =>
            onChange({ ...settings, format: e.target.value as Format })
          }
        >
          {FORMATS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          {settings.format === "gif"
            ? "GIF transparency is on or off only, so edges look rough."
            : "Keeps smooth transparent edges."}
        </p>
      </div>

      <Toggle
        label="Refine foreground"
        hint="Cleans colour fringing along edges."
        checked={settings.refine}
        disabled={disabled}
        onChange={(refine) => onChange({ ...settings, refine })}
      />
      <Toggle
        label="Also save mask"
        hint="Adds a black and white mask for each photo."
        checked={settings.mask}
        disabled={disabled}
        onChange={(mask) => onChange({ ...settings, mask })}
      />
    </div>
  );
}

function Toggle(props: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-accent"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium">{props.label}</span>
        <span className="block text-xs text-muted">{props.hint}</span>
      </span>
    </label>
  );
}
