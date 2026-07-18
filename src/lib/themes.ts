export type ThemeId = "washi" | "tatami" | "urushi" | "sakura" | "fuji" | "ai" | "sumi";

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
  {
    id: "sakura",
    label: "桜",
    description: "Sakura Paper",
    swatches: ["#f7edf0", "#a94863", "#9f7b45"],
  },
  {
    id: "fuji",
    label: "藤",
    description: "Wisteria Mist",
    swatches: ["#eeeaf3", "#74528d", "#6f7f62"],
  },
  {
    id: "ai",
    label: "藍",
    description: "Indigo Cloth",
    swatches: ["#17233a", "#d6b56d", "#f0eadc"],
  },
  {
    id: "sumi",
    label: "墨",
    description: "Ink Wash",
    swatches: ["#ded9cf", "#2f3130", "#a33c34"],
  },
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
