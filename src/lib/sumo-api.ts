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
const TOKYO_TIME_ZONE = "Asia/Tokyo";
let rikishiIndexRequest: Promise<RikishiSummary[]> | null = null;

function mapBanzukeSide(side: Record<string, unknown> | undefined) {
  if (!side) {
    return undefined;
  }

  return {
    rikishiID: Number(side.rikishiID ?? side.rikishiId ?? 0),
    shikonaEn: firstString(
      side.shikonaEn,
      side.shikonaEnglish,
      side.shikona,
      side.nameEn,
      side.name,
    ),
    shikonaJp: firstString(
      side.shikonaJp,
      side.shikonaJP,
      side.shikonaJapanese,
      side.nameJp,
      side.nameJP,
      side.nameJapanese,
    ),
    rankValue: numberOrUndefined(side.rankValue),
    rank: stringOrUndefined(side.rank),
    wins: numberOrUndefined(side.wins),
    losses: numberOrUndefined(side.losses),
    absences: numberOrUndefined(side.absences),
  };
}

function mapMatchSide(
  side: Record<string, unknown> | undefined,
  winnerId?: number,
  sideId?: number,
): MatchSide | undefined {
  if (!side) {
    return undefined;
  }

  return {
    rikishiId: numberOrUndefined(side.rikishiID ?? side.rikishiId ?? sideId),
    shikona: firstString(
      side.shikonaJp,
      side.shikonaJP,
      side.shikonaJapanese,
      side.nameJp,
      side.nameJP,
      side.nameJapanese,
    ),
    shikonaEn: firstString(
      side.shikonaEn,
      side.shikonaEnglish,
      side.nameEn,
      side.shikona,
      side.name,
    ),
    rank: firstString(side.rank, side.currentRank),
    win:
      booleanOrUndefined(side.win) ??
      (winnerId && numberOrUndefined(side.rikishiID ?? side.rikishiId ?? sideId)
        ? numberOrUndefined(side.rikishiID ?? side.rikishiId ?? sideId) === winnerId
        : undefined),
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberOrUndefined(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
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
    timeZone: TOKYO_TIME_ZONE,
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

export async function fetchAllRikishisIndex(limit = 1000): Promise<RikishiSummary[]> {
  if (rikishiIndexRequest) {
    return rikishiIndexRequest;
  }

  rikishiIndexRequest = (async () => {
  const results: RikishiSummary[] = [];
  let skip = 0;

  while (true) {
    const data = (await getJson(`/rikishis?limit=${limit}&skip=${skip}`)) as unknown;
    const rows = Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : Array.isArray((data as Record<string, unknown>)?.records)
        ? (((data as Record<string, unknown>).records as Array<Record<string, unknown>>))
        : Array.isArray((data as Record<string, unknown>)?.rikishis)
          ? (((data as Record<string, unknown>).rikishis as Array<Record<string, unknown>>))
          : [];

    const mapped = rows
      .map<RikishiSummary | null>((row) => {
        const id = Number(row.id ?? row.rikishiId ?? row.rikishiID ?? 0);
        if (!id) {
          return null;
        }

        return {
          id,
          shikona:
            firstString(
              row.shikonaJp,
              row.shikonaJP,
              row.shikonaJapanese,
              row.nameJp,
              row.nameJP,
              row.nameJapanese,
            ) ?? "",
          shikonaEn: firstString(
            row.shikonaEn,
            row.shikonaEnglish,
            row.nameEn,
            row.shikona,
            row.name,
          ),
          heya: firstString(row.heya),
          rank: firstString(row.currentRank, row.rank),
          division:
            (firstString(row.currentDivision, row.division) as Division | undefined) ?? "Makuuchi",
        };
      })
      .filter((row): row is RikishiSummary => row !== null);

    results.push(...mapped);

    if (rows.length < limit) {
      break;
    }

    skip += limit;
  }

  const seen = new Map<number, RikishiSummary>();
  for (const rikishi of results) {
    if (!seen.has(rikishi.id) || rikishi.shikona) {
      seen.set(rikishi.id, rikishi);
    }
  }

    return [...seen.values()];
  })();

  try {
    return await rikishiIndexRequest;
  } finally {
    rikishiIndexRequest = null;
  }
}

export async function fetchBanzuke(
  bashoId: string,
  division: Division,
): Promise<BanzukeResponse> {
  const data = (await getJson(`/basho/${bashoId}/banzuke/${division}`)) as unknown;
  const dataRecord =
    !Array.isArray(data) && typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : null;

  const entriesSource = Array.isArray(data)
    ? (data as Array<Record<string, unknown>>)
    : Array.isArray(dataRecord?.entries)
      ? (dataRecord.entries as Array<Record<string, unknown>>)
      : null;

  let records: BanzukeRecord[] = [];

  if (entriesSource) {
    const grouped = new Map<string, BanzukeRecord>();

    for (const entry of entriesSource) {
      const rank = stringOrUndefined(entry.rank) ?? "";
      const side = stringOrUndefined(entry.side) ?? "";
      const groupKey = rank.replace(/\s+(East|West)$/i, "").trim() || `${rank}:${side}`;

      const mappedSide = {
        rikishiID: Number(entry.rikishiId ?? entry.rikishiID ?? 0),
        shikonaEn: firstString(
          entry.shikonaEn,
          entry.shikonaEnglish,
          entry.shikona,
          entry.nameEn,
          entry.name,
        ),
        shikonaJp: firstString(
          entry.shikonaJp,
          entry.shikonaJP,
          entry.shikonaJapanese,
          entry.nameJp,
          entry.nameJP,
          entry.nameJapanese,
        ),
        rankValue: numberOrUndefined(entry.rankValue),
        rank: firstString(entry.rank, entry.currentRank) ?? rank,
        wins: numberOrUndefined(entry.wins),
        losses: numberOrUndefined(entry.losses),
        absences: numberOrUndefined(entry.absences),
      };

      const current = grouped.get(groupKey) ?? {};
      if (/east/i.test(side)) {
        current.east = mappedSide;
      } else if (/west/i.test(side)) {
        current.west = mappedSide;
      }
      grouped.set(groupKey, current);
    }

    records = [...grouped.values()];
  } else {
    const recordsSource = Array.isArray(dataRecord?.records)
      ? (dataRecord.records as Array<Record<string, unknown>>)
      : Array.isArray(dataRecord?.banzuke)
        ? (dataRecord.banzuke as Array<Record<string, unknown>>)
        : [];

    records = recordsSource.map((record) => ({
      east: mapBanzukeSide(record.east as Record<string, unknown> | undefined),
      west: mapBanzukeSide(record.west as Record<string, unknown> | undefined),
    }));
  }

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

  const matches: TorikumiMatch[] = matchesSource.map((match) => {
    const winnerId = numberOrUndefined(match.winnerId ?? match.winnerID);
    const eastId = numberOrUndefined(match.eastId ?? match.eastID ?? match.eastRikishiId);
    const westId = numberOrUndefined(match.westId ?? match.westID ?? match.westRikishiId);

    const nestedEast = match.east as Record<string, unknown> | undefined;
    const nestedWest = match.west as Record<string, unknown> | undefined;

    const flatEast =
      nestedEast ??
      ({
        rikishiId: eastId,
        shikonaJp:
          match.eastShikonaJp ??
          match.eastShikonaJP ??
          match.eastShikonaJapanese ??
          match.eastNameJp ??
          match.eastNameJP,
        shikona: match.eastShikona ?? match.eastName,
        shikonaEn: match.eastShikonaEn ?? match.eastShikonaEnglish ?? match.eastNameEn,
        rank: match.eastRank ?? match.eastCurrentRank,
      } as Record<string, unknown>);

    const flatWest =
      nestedWest ??
      ({
        rikishiId: westId,
        shikonaJp:
          match.westShikonaJp ??
          match.westShikonaJP ??
          match.westShikonaJapanese ??
          match.westNameJp ??
          match.westNameJP,
        shikona: match.westShikona ?? match.westName,
        shikonaEn: match.westShikonaEn ?? match.westShikonaEnglish ?? match.westNameEn,
        rank: match.westRank ?? match.westCurrentRank,
      } as Record<string, unknown>);

    return {
      matchNo: numberOrUndefined(match.matchNo ?? match.matchNumber),
      day: numberOrUndefined(match.day) ?? day,
      kimarite: stringOrUndefined(match.kimarite),
      east: mapMatchSide(flatEast, winnerId, eastId),
      west: mapMatchSide(flatWest, winnerId, westId),
    };
  });

  return {
    bashoId,
    division,
    day,
    matches,
  };
}

export function extractRikishiFromBanzuke(
  _bashoId: string,
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
    timeZone: TOKYO_TIME_ZONE,
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

export function formatBashoDate(value?: string) {
  if (!value) {
    return "未詳";
  }

  return value.split("T")[0] ?? value;
}

export function enrichTorikumiWithRikishi(
  torikumi: TorikumiResponse | null,
  rikishi: RikishiSummary[],
): TorikumiResponse | null {
  if (!torikumi) {
    return null;
  }

  const rikishiById = new Map(rikishi.map((entry) => [entry.id, entry]));

  return {
    ...torikumi,
    matches: torikumi.matches.map((match) => {
      const westLookup = match.west?.rikishiId ? rikishiById.get(match.west.rikishiId) : undefined;
      const eastLookup = match.east?.rikishiId ? rikishiById.get(match.east.rikishiId) : undefined;

      return {
        ...match,
        west: match.west
          ? {
              ...match.west,
              shikona: westLookup?.shikona ?? "",
              shikonaEn: westLookup?.shikonaEn ?? match.west.shikonaEn,
              rank: westLookup?.rank ?? match.west.rank,
              matchedById: !!westLookup,
            }
          : match.west,
        east: match.east
          ? {
              ...match.east,
              shikona: eastLookup?.shikona ?? "",
              shikonaEn: eastLookup?.shikonaEn ?? match.east.shikonaEn,
              rank: eastLookup?.rank ?? match.east.rank,
              matchedById: !!eastLookup,
            }
          : match.east,
      };
    }),
  };
}

export function enrichBanzukeWithRikishi(
  banzuke: BanzukeResponse | null,
  rikishi: RikishiSummary[],
): BanzukeResponse | null {
  if (!banzuke) {
    return null;
  }

  const rikishiById = new Map(rikishi.map((entry) => [entry.id, entry]));

  return {
    ...banzuke,
    records: banzuke.records.map((record) => {
      const eastLookup = record.east?.rikishiID ? rikishiById.get(record.east.rikishiID) : undefined;
      const westLookup = record.west?.rikishiID ? rikishiById.get(record.west.rikishiID) : undefined;

      return {
        east: record.east
          ? {
              ...record.east,
              shikonaJp: eastLookup?.shikona ?? record.east.shikonaJp ?? "",
              shikonaEn: eastLookup?.shikonaEn ?? record.east.shikonaEn,
              rank: eastLookup?.rank ?? record.east.rank,
            }
          : record.east,
        west: record.west
          ? {
              ...record.west,
              shikonaJp: westLookup?.shikona ?? record.west.shikonaJp ?? "",
              shikonaEn: westLookup?.shikonaEn ?? record.west.shikonaEn,
              rank: westLookup?.rank ?? record.west.rank,
            }
          : record.west,
      };
    }),
  };
}

function getTokyoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

function dateOnlyToUtcMs(value: string) {
  return Date.parse(`${value}T00:00:00Z`);
}

export function getBashoDayFromStartDate(startDate?: string, now = new Date()) {
  if (!startDate) {
    return 1;
  }

  const start = formatBashoDate(startDate);
  const { year, month, day } = getTokyoDateParts(now);
  const today = `${year}-${month}-${day}`;

  const diffMs = dateOnlyToUtcMs(today) - dateOnlyToUtcMs(start);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(1, Math.min(15, diffDays + 1));
}

export function isPastOrFinishedBasho(bashoId: string, endDate?: string, now = new Date()) {
  const currentBasho = getCurrentBashoId(now);
  if (bashoId !== currentBasho) {
    return true;
  }

  if (!endDate) {
    return false;
  }

  const end = formatBashoDate(endDate);
  const { year, month, day } = getTokyoDateParts(now);
  const today = `${year}-${month}-${day}`;

  return dateOnlyToUtcMs(today) > dateOnlyToUtcMs(end);
}

export function getTorikumiCachePolicy(args: {
  bashoId: string;
  startDate?: string;
  endDate?: string;
  selectedDay: number;
  now?: Date;
}) {
  const now = args.now ?? new Date();

  if (isPastOrFinishedBasho(args.bashoId, args.endDate, now)) {
    return { immutable: true, ttlMs: 0 };
  }

  const currentDay = getBashoDayFromStartDate(args.startDate, now);

  if (args.selectedDay < currentDay) {
    return { immutable: true, ttlMs: 0 };
  }

  if (args.selectedDay === currentDay) {
    return { immutable: false, ttlMs: 1000 * 60 * 15 };
  }

  return { immutable: false, ttlMs: 1000 * 60 * 60 * 6 };
}
