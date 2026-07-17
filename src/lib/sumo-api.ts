import {
  BanzukeRecord,
  BanzukeResponse,
  BashoSummary,
  Division,
  MatchSide,
  RikishiSummary,
  TorikumiMatch,
  TorikumiResponse,
} from "@/lib/types";

const API_BASE = "https://sumo-api.com/api";

function mapBanzukeSide(side: Record<string, unknown> | undefined) {
  if (!side) {
    return undefined;
  }

  return {
    rikishiID: Number(side.rikishiID ?? side.rikishiId ?? 0),
    shikonaEn: stringOrUndefined(side.shikonaEn),
    shikonaJp: stringOrUndefined(side.shikonaJp),
    rankValue: numberOrUndefined(side.rankValue),
    rank: stringOrUndefined(side.rank),
    wins: numberOrUndefined(side.wins),
    losses: numberOrUndefined(side.losses),
    absences: numberOrUndefined(side.absences),
  };
}

function mapMatchSide(side: Record<string, unknown> | undefined): MatchSide | undefined {
  if (!side) {
    return undefined;
  }

  return {
    rikishiId: numberOrUndefined(side.rikishiID ?? side.rikishiId),
    shikona: stringOrUndefined(side.shikonaJp ?? side.shikona),
    shikonaEn: stringOrUndefined(side.shikonaEn),
    rank: stringOrUndefined(side.rank),
    win: booleanOrUndefined(side.win),
  };
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function booleanOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

async function getJson(path: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Sumo API request failed: ${response.status}`);
  }

  return (await response.json()) as unknown;
}

export function getCurrentBashoId(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const bashoMonths = [1, 3, 5, 7, 9, 11];

  const activeMonth = bashoMonths.filter((value) => value <= month).at(-1) ?? 11;
  const activeYear = activeMonth === 11 && month === 12 ? Number(year) : Number(year);
  const previousYear = activeMonth === 11 && month < 1 ? Number(year) - 1 : activeYear;
  const resolvedYear = activeMonth === 11 && month === 0 ? previousYear : activeYear;

  return `${resolvedYear}${String(activeMonth).padStart(2, "0")}`;
}

export function listRecentBashoIds(current = getCurrentBashoId()) {
  const year = Number(current.slice(0, 4));
  const month = Number(current.slice(4, 6));
  const bashoMonths = [1, 3, 5, 7, 9, 11];
  const result: string[] = [];

  let cursorYear = year;
  let cursorMonth = month;

  for (let index = 0; index < 6; index += 1) {
    result.push(`${cursorYear}${String(cursorMonth).padStart(2, "0")}`);
    const position = bashoMonths.indexOf(cursorMonth);
    if (position <= 0) {
      cursorYear -= 1;
      cursorMonth = 11;
    } else {
      cursorMonth = bashoMonths[position - 1];
    }
  }

  return result;
}

export async function fetchBasho(bashoId: string): Promise<BashoSummary> {
  const data = (await getJson(`/basho/${bashoId}`)) as Record<string, unknown>;
  return {
    bashoDate: stringOrUndefined(data.bashoDate) ?? bashoId,
    startDate: stringOrUndefined(data.startDate),
    endDate: stringOrUndefined(data.endDate),
    yusho: stringOrUndefined(data.yusho),
    specialPrizes: Array.isArray(data.specialPrizes)
      ? data.specialPrizes.filter((value): value is string => typeof value === "string")
      : undefined,
  };
}

export async function fetchBanzuke(
  bashoId: string,
  division: Division,
): Promise<BanzukeResponse> {
  const data = (await getJson(`/basho/${bashoId}/banzuke/${division}`)) as
    | Record<string, unknown>
    | Array<Record<string, unknown>>;

  const recordsSource = Array.isArray(data)
    ? data
    : Array.isArray(data.records)
      ? (data.records as Array<Record<string, unknown>>)
      : Array.isArray(data.banzuke)
        ? (data.banzuke as Array<Record<string, unknown>>)
        : [];

  const records: BanzukeRecord[] = recordsSource.map((record) => ({
    east: mapBanzukeSide(record.east as Record<string, unknown> | undefined),
    west: mapBanzukeSide(record.west as Record<string, unknown> | undefined),
  }));

  return {
    bashoId,
    division,
    records,
  };
}

export async function fetchTorikumi(
  bashoId: string,
  division: Division,
  day: number,
): Promise<TorikumiResponse> {
  const data = (await getJson(`/basho/${bashoId}/torikumi/${division}/${day}`)) as
    | Record<string, unknown>
    | Array<Record<string, unknown>>;

  const matchesSource = Array.isArray(data)
    ? data
    : Array.isArray(data.torikumi)
      ? (data.torikumi as Array<Record<string, unknown>>)
      : Array.isArray(data.matches)
        ? (data.matches as Array<Record<string, unknown>>)
        : [];

  const matches: TorikumiMatch[] = matchesSource.map((match) => ({
    matchNo: numberOrUndefined(match.matchNo ?? match.matchNumber),
    day: numberOrUndefined(match.day) ?? day,
    kimarite: stringOrUndefined(match.kimarite),
    east: mapMatchSide(match.east as Record<string, unknown> | undefined),
    west: mapMatchSide(match.west as Record<string, unknown> | undefined),
  }));

  return {
    bashoId,
    division,
    day,
    matches,
  };
}

export function extractRikishiFromBanzuke(
  bashoId: string,
  divisions: BanzukeResponse[],
): RikishiSummary[] {
  const map = new Map<number, RikishiSummary>();

  for (const division of divisions) {
    for (const record of division.records) {
      for (const side of [record.east, record.west]) {
        if (!side?.rikishiID || map.has(side.rikishiID)) {
          continue;
        }

        map.set(side.rikishiID, {
          id: side.rikishiID,
          shikona: side.shikonaJp ?? side.shikonaEn ?? String(side.rikishiID),
          shikonaEn: side.shikonaEn,
          rank: side.rank,
          division: division.division,
        });
      }
    }
  }

  return [...map.values()].sort((left, right) => left.id - right.id);
}

export function getDefaultDay(date = new Date()) {
  const tokyo = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    day: "2-digit",
  })
    .format(date)
    .trim();

  const today = Number(tokyo);
  return Math.max(1, Math.min(15, today));
}

export function getDivisionLabel(division: Division) {
  return division === "Makuuchi" ? "幕内" : "十両";
}

export function getBashoLabel(bashoId: string) {
  const year = bashoId.slice(0, 4);
  const month = bashoId.slice(4, 6);
  return `${year}年${Number(month)}月場所`;
}
