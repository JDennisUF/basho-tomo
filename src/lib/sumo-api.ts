import {
  BanzukeRecord,
  BanzukeOpponentResult,
  BanzukeResponse,
  BashoSummary,
  Division,
  HeadToHeadMatch,
  HeadToHeadResponse,
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

  const record = Array.isArray(side.record)
    ? (side.record as Array<Record<string, unknown>>).map<BanzukeOpponentResult>((entry) => ({
        result: firstString(entry.result),
        opponentShikonaEn: firstString(entry.opponentShikonaEn, entry.opponentNameEn),
        opponentShikonaJp: firstString(
          entry.opponentShikonaJp,
          entry.opponentShikonaJP,
          entry.opponentNameJp,
          entry.opponentNameJP,
        ),
        opponentID: numberOrUndefined(entry.opponentID ?? entry.opponentId),
        kimarite: firstString(entry.kimarite),
      }))
    : undefined;

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
    record,
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
  const baseUrl = typeof window === "undefined" ? API_BASE : "/api";
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Sumo data request failed: ${response.status}`);
  }

  const body = await response.text();
  if (!body) {
    throw new Error(`Sumo data request returned no content: ${response.status}`);
  }

  return JSON.parse(body) as unknown;
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

export function listRecentBashoIds(current = getCurrentBashoId(), count = 6) {
  const year = Number(current.slice(0, 4));
  const month = Number(current.slice(4, 6));
  const bashoMonths = [1, 3, 5, 7, 9, 11];
  const result: string[] = [];

  let cursorYear = year;
  let cursorMonth = month;

  for (let index = 0; index < count; index += 1) {
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

export async function fetchRikishi(rikishiId: number): Promise<RikishiSummary> {
  const data = (await getJson(`/rikishi/${rikishiId}`)) as Record<string, unknown>;
  const id = Number(data.id ?? data.rikishiId ?? data.rikishiID ?? rikishiId);
  const rank = firstString(data.currentRank, data.rank);

  return {
    id,
    nskId: numberOrUndefined(data.nskId ?? data.nskID),
    sumoDbId: numberOrUndefined(
      data.sumoDbId ??
        data.sumoDBId ??
        data.sumodbId ??
        data.sumodbID ??
        data.sumoDbRikishiId ??
        data.sumoDBRikishiId ??
        data.sumodbRikishiId ??
        data.sumodbRikishiID,
    ),
    shikona:
      firstString(
        data.shikonaJp,
        data.shikonaJP,
        data.shikonaJapanese,
        data.nameJp,
        data.nameJP,
        data.nameJapanese,
      ) ??
      firstString(data.shikonaEn, data.shikonaEnglish, data.shikona, data.nameEn, data.name) ??
      String(id),
    shikonaJp: firstString(
      data.shikonaJp,
      data.shikonaJP,
      data.shikonaJapanese,
      data.nameJp,
      data.nameJP,
      data.nameJapanese,
    ),
    shikonaEn: firstString(
      data.shikonaEn,
      data.shikonaEnglish,
      data.shikona,
      data.nameEn,
      data.name,
    ),
    currentRank: rank,
    heya: firstString(data.heya),
    rank,
    division: (firstString(data.currentDivision, data.division) as Division | undefined) ?? "Makuuchi",
    birthDate: firstString(data.birthDate),
    shusshin: firstString(data.shusshin),
    height: numberOrUndefined(data.height),
    weight: numberOrUndefined(data.weight),
    debut: firstString(data.debut),
  };
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
  const eastSource = Array.isArray(dataRecord?.east)
    ? (dataRecord.east as Array<Record<string, unknown>>)
    : null;
  const westSource = Array.isArray(dataRecord?.west)
    ? (dataRecord.west as Array<Record<string, unknown>>)
    : null;

  let records: BanzukeRecord[] = [];

  if (eastSource || westSource) {
    const grouped = new Map<string, BanzukeRecord>();

    for (const [sideLabel, source] of [
      ["east", eastSource],
      ["west", westSource],
    ] as const) {
      if (!source) {
        continue;
      }

      for (const entry of source) {
        const rank = firstString(entry.rank, entry.currentRank) ?? "";
        const groupKey = rank.replace(/\s+(East|West)$/i, "").trim() || `${rank}:${sideLabel}`;
        const mappedSide = mapBanzukeSide(entry);
        const current = grouped.get(groupKey) ?? {};

        if (sideLabel === "east") {
          current.east = mappedSide;
        } else {
          current.west = mappedSide;
        }

        grouped.set(groupKey, current);
      }
    }

    records = [...grouped.values()];
  } else if (entriesSource) {
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
        record: Array.isArray(entry.record)
          ? (entry.record as Array<Record<string, unknown>>).map<BanzukeOpponentResult>((row) => ({
              result: firstString(row.result),
              opponentShikonaEn: firstString(row.opponentShikonaEn, row.opponentNameEn),
              opponentShikonaJp: firstString(
                row.opponentShikonaJp,
                row.opponentShikonaJP,
                row.opponentNameJp,
                row.opponentNameJP,
              ),
              opponentID: numberOrUndefined(row.opponentID ?? row.opponentId),
              kimarite: firstString(row.kimarite),
            }))
          : undefined,
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

export async function fetchHeadToHead(
  rikishiId: number,
  opponentId: number,
): Promise<HeadToHeadResponse> {
  const data = (await getJson(`/rikishi/${rikishiId}/matches/${opponentId}`)) as Record<
    string,
    unknown
  >;

  const matchesSource = Array.isArray(data.matches)
    ? (data.matches as Array<Record<string, unknown>>)
    : [];

  const matches: HeadToHeadMatch[] = matchesSource.map((match) => ({
    bashoId: stringOrUndefined(match.bashoId) ?? "",
    division: (firstString(match.division) as Division | undefined) ?? "Makuuchi",
    day: numberOrUndefined(match.day),
    matchNo: numberOrUndefined(match.matchNo ?? match.matchNumber),
    eastId: numberOrUndefined(match.eastId ?? match.eastID),
    eastShikona: firstString(match.eastShikona, match.eastShikonaJp, match.eastName),
    eastRank: firstString(match.eastRank),
    westId: numberOrUndefined(match.westId ?? match.westID),
    westShikona: firstString(match.westShikona, match.westShikonaJp, match.westName),
    westRank: firstString(match.westRank),
    kimarite: firstString(match.kimarite),
    winnerId: numberOrUndefined(match.winnerId ?? match.winnerID),
    winnerEn: firstString(match.winnerEn),
    winnerJp: firstString(match.winnerJp, match.winnerJP),
  }));

  return {
    kimariteLosses:
      typeof data.kimariteLosses === "object" && data.kimariteLosses !== null
        ? Object.fromEntries(
            Object.entries(data.kimariteLosses as Record<string, unknown>).flatMap(
              ([key, value]) => {
                const count = numberOrUndefined(value);
                return count ? [[key, count]] : [];
              },
            ),
          )
        : {},
    kimariteWins:
      typeof data.kimariteWins === "object" && data.kimariteWins !== null
        ? Object.fromEntries(
            Object.entries(data.kimariteWins as Record<string, unknown>).flatMap(([key, value]) => {
              const count = numberOrUndefined(value);
              return count ? [[key, count]] : [];
            }),
          )
        : {},
    matches,
    opponentWins: numberOrUndefined(data.opponentWins) ?? 0,
    rikishiWins: numberOrUndefined(data.rikishiWins) ?? 0,
    total: numberOrUndefined(data.total) ?? matches.length,
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
  switch (division) {
    case "Makuuchi":
      return "幕内";
    case "Juryo":
      return "十両";
    case "Makushita":
      return "幕下";
    case "Sandanme":
      return "三段目";
    case "Jonidan":
      return "序二段";
    case "Jonokuchi":
      return "序ノ口";
  }
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

export function getDisplayShikona(value?: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.split("　")[0]?.trim() ?? value;
  return trimmed.replace(/[（(].*?[）)]/g, "").trim();
}

const RANK_MAP: Record<string, string> = {
  Yokozuna: "横綱",
  Ozeki: "大関",
  Sekiwake: "関脇",
  Komusubi: "小結",
  Maegashira: "前頭",
  Juryo: "十両",
  Makushita: "幕下",
  Sandanme: "三段目",
  Jonidan: "序二段",
  Jonokuchi: "序ノ口",
};

const SIDE_MAP: Record<string, string> = {
  East: "東",
  West: "西",
};

const KANJI_NUMERALS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function toKanjiNumber(value: number) {
  if (value <= 0) {
    return "";
  }

  if (value < 10) {
    return KANJI_NUMERALS[value];
  }

  if (value === 10) {
    return "十";
  }

  if (value < 20) {
    return `十${KANJI_NUMERALS[value - 10]}`;
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${KANJI_NUMERALS[tens]}十${KANJI_NUMERALS[ones]}`;
}

export function formatRankLabel(rank?: string) {
  if (!rank) {
    return "";
  }

  const match = rank.match(
    /^(Yokozuna|Ozeki|Sekiwake|Komusubi|Maegashira|Juryo|Makushita|Sandanme|Jonidan|Jonokuchi)\s+(\d+)\s+(East|West)$/i,
  );

  if (match) {
    const [, rankName, rankNumber, side] = match;
    const mappedRank = RANK_MAP[rankName] ?? rankName;
    const mappedSide = SIDE_MAP[side] ?? side;
    return `${mappedRank} ${mappedSide}${toKanjiNumber(Number(rankNumber))}`;
  }

  const sideOnlyMatch = rank.match(
    /^(Yokozuna|Ozeki|Sekiwake|Komusubi)\s+(East|West)$/i,
  );

  if (sideOnlyMatch) {
    const [, rankName, side] = sideOnlyMatch;
    return `${RANK_MAP[rankName] ?? rankName} ${SIDE_MAP[side] ?? side}`;
  }

  return rank;
}

export function formatRecordLabel(wins?: number, losses?: number, absences?: number) {
  if (wins === undefined && losses === undefined && absences === undefined) {
    return "";
  }

  const base = `${wins ?? 0}-${losses ?? 0}`;
  return absences && absences > 0 ? `${base}-${absences}` : base;
}

export function isYokozunaRank(rank?: string) {
  return /^Yokozuna\b/i.test(rank ?? "");
}

export function isMaegashiraRank(rank?: string) {
  return /^Maegashira\b/i.test(rank ?? "");
}

export function isKinboshiWin(args: {
  winnerRank?: string;
  opponentRank?: string;
  winnerDivision?: Division;
}) {
  return (
    args.winnerDivision === "Makuuchi" &&
    isMaegashiraRank(args.winnerRank) &&
    isYokozunaRank(args.opponentRank)
  );
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
    return { immutable: false, ttlMs: 1000 * 60 * 10 };
  }

  return { immutable: false, ttlMs: 1000 * 60 * 60 * 6 };
}
