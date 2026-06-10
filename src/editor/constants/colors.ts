export interface ColorPreset {
  id: string;
  label: string;
  value: string;
}

export const TEXT_COLOR_PRESETS: ColorPreset[] = [
  { id: "default", label: "Default", value: "" },
  { id: "red", label: "Red", value: "#dc2626" },
  { id: "orange", label: "Orange", value: "#ea580c" },
  { id: "green", label: "Green", value: "#16a34a" },
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "purple", label: "Purple", value: "#9333ea" },
];

export const HIGHLIGHT_COLOR_PRESETS: ColorPreset[] = [
  { id: "default", label: "Default", value: "" },
  { id: "yellow", label: "Yellow", value: "#fde68a" },
  { id: "green", label: "Green", value: "#bbf7d0" },
  { id: "blue", label: "Blue", value: "#bfdbfe" },
  { id: "pink", label: "Pink", value: "#fbcfe8" },
];

export function getDefaultHighlightColor(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--highlight-bg")
    .trim();
}
