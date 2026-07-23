export type SumoTerm = {
  id: string;
  term: string;
  reading: string;
  english: string;
  category: "ring" | "rank" | "kimarite" | "record" | "ritual";
};

const SUMO_TERMS: SumoTerm[] = [
  { id: "dohyo", term: "土俵", reading: "dohyo", english: "clay ring", category: "ring" },
  { id: "tawara", term: "俵", reading: "tawara", english: "straw boundary bales", category: "ring" },
  { id: "shikiri", term: "仕切り", reading: "shikiri", english: "pre-bout crouch and set", category: "ritual" },
  { id: "matta", term: "待った", reading: "matta", english: "false start", category: "ritual" },
  { id: "makuuchi", term: "幕内", reading: "makuuchi", english: "top division", category: "rank" },
  { id: "juryo", term: "十両", reading: "juryo", english: "second salaried division", category: "rank" },
  { id: "makushita", term: "幕下", reading: "makushita", english: "third division", category: "rank" },
  { id: "sandanme", term: "三段目", reading: "sandanme", english: "fourth division", category: "rank" },
  { id: "jonidan", term: "序二段", reading: "jonidan", english: "fifth division", category: "rank" },
  { id: "jonokuchi", term: "序ノ口", reading: "jonokuchi", english: "entry division", category: "rank" },
  { id: "yokozuna", term: "横綱", reading: "yokozuna", english: "grand champion", category: "rank" },
  { id: "ozeki", term: "大関", reading: "ozeki", english: "champion rank below yokozuna", category: "rank" },
  { id: "sekiwake", term: "関脇", reading: "sekiwake", english: "junior champion rank", category: "rank" },
  { id: "komusubi", term: "小結", reading: "komusubi", english: "fourth highest rank", category: "rank" },
  { id: "maegashira", term: "前頭", reading: "maegashira", english: "top-division rank and file", category: "rank" },
  { id: "oshidashi", term: "押し出し", reading: "oshidashi", english: "frontal push out", category: "kimarite" },
  { id: "yorikiri", term: "寄り切り", reading: "yorikiri", english: "frontal force out", category: "kimarite" },
  { id: "hatakikomi", term: "叩き込み", reading: "hatakikomi", english: "slap down", category: "kimarite" },
  { id: "uwatenage", term: "上手投げ", reading: "uwatenage", english: "overarm throw", category: "kimarite" },
  { id: "shitatenage", term: "下手投げ", reading: "shitatenage", english: "underarm throw", category: "kimarite" },
  { id: "henka", term: "変化", reading: "henka", english: "sidestep at the tachiai", category: "kimarite" },
  { id: "kinboshi", term: "金星", reading: "kinboshi", english: "gold star upset over a yokozuna", category: "record" },
  { id: "kachikoshi", term: "勝ち越し", reading: "kachikoshi", english: "winning record", category: "record" },
  { id: "makekoshi", term: "負け越し", reading: "makekoshi", english: "losing record", category: "record" },
  { id: "zensho", term: "全勝", reading: "zensho", english: "perfect record", category: "record" },
];

function getDictionaryUrl(value: string) {
  return `https://jisho.org/search/${encodeURIComponent(value)}`;
}

export function listSumoTerms() {
  return SUMO_TERMS.map((term) => ({
    ...term,
    dictionaryUrl: getDictionaryUrl(term.term),
  }));
}
