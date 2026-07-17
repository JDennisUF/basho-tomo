export type Division = "Makuuchi" | "Juryo";

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

export type CachedPayload<T> = {
  version: string;
  savedAt: string;
  payload: T;
};
