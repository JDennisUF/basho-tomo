export type ThemeId =
  | "washi"
  | "tatami"
  | "urushi"
  | "sakura"
  | "fuji"
  | "ai"
  | "sumi"
  | "dohyo"
  | "momiji"
  | "yuki"
  | "kinaka"
  | "shuin"
  | "bugu"
  | "jinmaku"
  | "kachiiro"
  | "shuUrushi";

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
  {
    id: "dohyo",
    label: "土俵",
    description: "Dohyo Clay",
    swatches: ["#d7b184", "#7d4d2f", "#c7a34e"],
  },
  {
    id: "momiji",
    label: "紅葉",
    description: "Autumn Maple",
    swatches: ["#efe0c9", "#a6402d", "#b8792c"],
  },
  {
    id: "yuki",
    label: "雪",
    description: "Winter Snow",
    swatches: ["#edf1f2", "#4f6f8f", "#2f3438"],
  },
  {
    id: "kinaka",
    label: "金赤",
    description: "Gold Red",
    swatches: ["#2a1712", "#c83324", "#d7ad45"],
  },
  {
    id: "shuin",
    label: "朱印",
    description: "Vermilion Seal",
    swatches: ["#f2dfc7", "#c43b2f", "#201716"],
  },
  {
    id: "bugu",
    label: "武具",
    description: "Armor Brass",
    swatches: ["#1d2228", "#9f3f35", "#b59655"],
  },
  {
    id: "jinmaku",
    label: "陣幕",
    description: "Camp Curtain",
    swatches: ["#f4efe4", "#181716", "#b92f28"],
  },
  {
    id: "kachiiro",
    label: "勝色",
    description: "Victory Indigo",
    swatches: ["#101b2e", "#1f4f8a", "#d6b86a"],
  },
  {
    id: "shuUrushi",
    label: "朱漆",
    description: "Red Lacquer",
    swatches: ["#260d0b", "#c93a2d", "#d2a24b"],
  },
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
