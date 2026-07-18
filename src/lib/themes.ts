export type ThemeId = "washi" | "tatami" | "urushi";

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description: string;
  swatches: [string, string, string];
};

export const DEFAULT_THEME: ThemeId = "washi";

export const THEMES: ThemeDefinition[] = [
  {
    id: "washi",
    label: "和紙",
    description: "Washi Ivory",
    swatches: ["#f6f0e5", "#9a3c31", "#a88941"],
  },
  {
    id: "tatami",
    label: "畳",
    description: "Tatami Green",
    swatches: ["#e7dfc8", "#6f7f4f", "#a26a2a"],
  },
  {
    id: "urushi",
    label: "漆",
    description: "Urushi Night",
    swatches: ["#201817", "#b4473a", "#c8a255"],
  },
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
