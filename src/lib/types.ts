export type Division =
  | "Makuuchi"
  | "Juryo"
  | "Makushita"
  | "Sandanme"
  | "Jonidan"
  | "Jonokuchi";

export type BashoSummary = {
  bashoDate: string;
  startDate?: string;
  endDate?: string;
  yusho?: string;
  specialPrizes?: string[];
};

export type BanzukeSide = {
  rikishiID: number;
  shikonaEn?: string;
  shikonaJp?: string;
  rankValue?: number;
  rank?: string;
  wins?: number;
  losses?: number;
  absences?: number;
};

export type BanzukeRecord = {
  east?: BanzukeSide;
  west?: BanzukeSide;
};

export type BanzukeResponse = {
  bashoId: string;
  division: Division;
  records: BanzukeRecord[];
};

export type RikishiSummary = {
  id: number;
  shikona: string;
  shikonaEn?: string;
  heya?: string;
  rank?: string;
  division: Division;
};

export type MatchSide = {
  rikishiId?: number;
  shikona?: string;
  shikonaEn?: string;
  rank?: string;
  win?: boolean;
  matchedById?: boolean;
};

export type TorikumiMatch = {
  matchNo?: number;
  day?: number;
  kimarite?: string;
  east?: MatchSide;
  west?: MatchSide;
};

export type TorikumiResponse = {
  bashoId: string;
  division: Division;
  day: number;
  matches: TorikumiMatch[];
};

export type HeadToHeadMatch = {
  bashoId: string;
  division: Division;
  day?: number;
  matchNo?: number;
  eastId?: number;
  eastShikona?: string;
  eastRank?: string;
  westId?: number;
  westShikona?: string;
  westRank?: string;
  kimarite?: string;
  winnerId?: number;
  winnerEn?: string;
  winnerJp?: string;
};

export type HeadToHeadResponse = {
  kimariteLosses: Record<string, number>;
  kimariteWins: Record<string, number>;
  matches: HeadToHeadMatch[];
  opponentWins: number;
  rikishiWins: number;
  total: number;
};

export type CurrentBashoRecord = {
  rikishiId: number;
  shikona: string;
  shikonaEn?: string;
  rank?: string;
  rankValue?: number;
  division: Division;
  wins?: number;
  losses?: number;
  absences?: number;
};

export type CachedPayload<T> = {
  version: string;
  savedAt: string;
  payload: T;
};
