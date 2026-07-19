import {
  fetchAllRikishisIndex,
  fetchBanzuke,
  fetchBasho,
  fetchHeadToHead,
  fetchRikishi,
  fetchTorikumi,
  getCurrentBashoId,
  getTorikumiCachePolicy,
  isPastOrFinishedBasho,
} from "@/lib/sumo-api";
import {
  BanzukeResponse,
  BashoSummary,
  Division,
  HeadToHeadResponse,
  RikishiSummary,
  TorikumiResponse,
} from "@/lib/types";
import { getSupabaseServiceClient } from "@/lib/server/supabase";

const BASHO_SUMMARY_TTL_MS = 1000 * 60 * 60 * 12;
const CURRENT_BANZUKE_TTL_MS = 1000 * 60 * 10;
const RIKISHI_PROFILE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const RIKISHI_INDEX_TTL_MS = 1000 * 60 * 60 * 24;
const HEAD_TO_HEAD_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export const DIVISIONS: Division[] = [
  "Makuuchi",
  "Juryo",
  "Makushita",
  "Sandanme",
  "Jonidan",
  "Jonokuchi",
];

type CacheResult<T> = {
  data: T;
  source: "supabase" | "sumo-api";
};

type CacheOptions = {
  forceRefresh?: boolean;
};

type BashoRow = {
  id: string;
  basho_date: string;
  start_date: string | null;
  end_date: string | null;
  yusho: string | null;
  special_prizes: string[] | null;
  fetched_at: string;
};

type RikishiRow = {
  id: number;
  nsk_id: number | null;
  sumodb_id: number | null;
  shikona_jp: string | null;
  shikona_en: string | null;
  heya: string | null;
  current_rank: string | null;
  current_division: string | null;
  birth_date: string | null;
  shusshin: string | null;
  height: number | null;
  weight: number | null;
  debut: string | null;
  fetched_at: string;
};

function isFresh(fetchedAt: string | null | undefined, ttlMs: number) {
  if (!fetchedAt) {
    return false;
  }

  return Date.now() - new Date(fetchedAt).getTime() <= ttlMs;
}

function logCacheError(operation: string, error: unknown) {
  if (error) {
    console.warn(`[sumo-cache] ${operation} failed`, error);
  }
}

function toIsoDate(value?: string) {
  return value?.split("T")[0] ?? null;
}

function isDivision(value: string): value is Division {
  return DIVISIONS.includes(value as Division);
}

export function parseDivision(value: string) {
  return isDivision(value) ? value : null;
}

function mapBashoRow(row: BashoRow): BashoSummary {
  return {
    bashoDate: row.basho_date,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    yusho: row.yusho ?? undefined,
    specialPrizes: row.special_prizes ?? undefined,
  };
}

function mapRikishiRow(row: RikishiRow): RikishiSummary {
  return {
    id: row.id,
    nskId: row.nsk_id ?? undefined,
    sumoDbId: row.sumodb_id ?? undefined,
    shikona: row.shikona_jp ?? row.shikona_en ?? String(row.id),
    shikonaJp: row.shikona_jp ?? undefined,
    shikonaEn: row.shikona_en ?? undefined,
    currentRank: row.current_rank ?? undefined,
    heya: row.heya ?? undefined,
    rank: row.current_rank ?? undefined,
    division: isDivision(row.current_division ?? "") ? (row.current_division as Division) : "Makuuchi",
    birthDate: row.birth_date ?? undefined,
    shusshin: row.shusshin ?? undefined,
    height: row.height ?? undefined,
    weight: row.weight ?? undefined,
    debut: row.debut ?? undefined,
  };
}

function hasDetailedProfile(row: RikishiRow) {
  return (
    row.nsk_id !== null ||
    row.sumodb_id !== null ||
    row.birth_date !== null ||
    row.height !== null ||
    row.weight !== null ||
    row.debut !== null ||
    row.shusshin !== null
  );
}

function toRikishiRow(rikishi: RikishiSummary) {
  return {
    id: rikishi.id,
    nsk_id: rikishi.nskId ?? null,
    sumodb_id: rikishi.sumoDbId ?? null,
    shikona_jp: rikishi.shikonaJp ?? rikishi.shikona ?? null,
    shikona_en: rikishi.shikonaEn ?? null,
    heya: rikishi.heya ?? null,
    current_rank: rikishi.currentRank ?? rikishi.rank ?? null,
    current_division: rikishi.division,
    birth_date: toIsoDate(rikishi.birthDate),
    shusshin: rikishi.shusshin ?? null,
    height: rikishi.height ?? null,
    weight: rikishi.weight ?? null,
    debut: rikishi.debut ?? null,
    fetched_at: new Date().toISOString(),
  };
}

export async function getCachedBasho(
  bashoId: string,
  options: CacheOptions = {},
): Promise<CacheResult<BashoSummary>> {
  const supabase = getSupabaseServiceClient();

  if (supabase && !options.forceRefresh) {
    const { data, error } = await supabase
      .from("bashos")
      .select("id,basho_date,start_date,end_date,yusho,special_prizes,fetched_at")
      .eq("id", bashoId)
      .maybeSingle<BashoRow>();

    logCacheError("read basho", error);

    if (data) {
      const mapped = mapBashoRow(data);
      const immutable = isPastOrFinishedBasho(bashoId, mapped.endDate);
      if (immutable || isFresh(data.fetched_at, BASHO_SUMMARY_TTL_MS)) {
        return { data: mapped, source: "supabase" };
      }
    }
  }

  const fresh = await fetchBasho(bashoId);

  if (supabase) {
    const { error } = await supabase.from("bashos").upsert({
      id: bashoId,
      basho_date: fresh.bashoDate,
      start_date: toIsoDate(fresh.startDate),
      end_date: toIsoDate(fresh.endDate),
      yusho: fresh.yusho ?? null,
      special_prizes: fresh.specialPrizes ?? null,
      fetched_at: new Date().toISOString(),
    });
    logCacheError("write basho", error);
  }

  return { data: fresh, source: "sumo-api" };
}

export async function getCachedBanzuke(
  bashoId: string,
  division: Division,
  options: CacheOptions = {},
): Promise<CacheResult<BanzukeResponse>> {
  const supabase = getSupabaseServiceClient();
  const isCurrentBasho = bashoId === getCurrentBashoId();

  if (supabase && !options.forceRefresh) {
    const { data, error } = await supabase
      .from("banzuke")
      .select("records,fetched_at")
      .eq("basho_id", bashoId)
      .eq("division", division)
      .maybeSingle<{ records: BanzukeResponse["records"]; fetched_at: string }>();

    logCacheError("read banzuke", error);

    if (data && (!isCurrentBasho || isFresh(data.fetched_at, CURRENT_BANZUKE_TTL_MS))) {
      return {
        data: {
          bashoId,
          division,
          records: data.records,
        },
        source: "supabase",
      };
    }
  }

  const fresh = await fetchBanzuke(bashoId, division);

  if (supabase) {
    await getCachedBasho(bashoId);
    const { error: banzukeError } = await supabase.from("banzuke").upsert({
      basho_id: bashoId,
      division,
      records: fresh.records,
      fetched_at: new Date().toISOString(),
    });
    logCacheError("write banzuke", banzukeError);

    const rikishiRows = fresh.records.flatMap((record) =>
      (["east", "west"] as const).flatMap((side) => {
        const entry = record[side];
        if (!entry?.rikishiID) {
          return [];
        }

        return {
          basho_id: bashoId,
          division,
          rikishi_id: entry.rikishiID,
          rank: entry.rank ?? null,
          rank_value: entry.rankValue ?? null,
          side,
          fetched_at: new Date().toISOString(),
        };
      }),
    );

    const bareRikishiRows = fresh.records.flatMap((record) =>
      [record.east, record.west].flatMap((entry) => {
        if (!entry?.rikishiID) {
          return [];
        }

        return toRikishiRow({
          id: entry.rikishiID,
          shikona: entry.shikonaJp ?? entry.shikonaEn ?? String(entry.rikishiID),
          shikonaJp: entry.shikonaJp,
          shikonaEn: entry.shikonaEn,
          rank: entry.rank,
          division,
        });
      }),
    );

    if (bareRikishiRows.length > 0) {
      const { error } = await supabase.from("rikishi").upsert(bareRikishiRows);
      logCacheError("write banzuke rikishi", error);
    }

    if (rikishiRows.length > 0) {
      const { error } = await supabase.from("basho_rikishi").upsert(rikishiRows);
      logCacheError("write basho rikishi", error);
    }
  }

  return { data: fresh, source: "sumo-api" };
}

export async function getCachedTorikumi(
  bashoId: string,
  division: Division,
  day: number,
  options: CacheOptions = {},
): Promise<CacheResult<TorikumiResponse>> {
  const supabase = getSupabaseServiceClient();
  const basho = await getCachedBasho(bashoId);
  const policy = getTorikumiCachePolicy({
    bashoId,
    startDate: basho.data.startDate,
    endDate: basho.data.endDate,
    selectedDay: day,
  });

  if (supabase && !options.forceRefresh) {
    const { data, error } = await supabase
      .from("torikumi")
      .select("matches,immutable,fetched_at")
      .eq("basho_id", bashoId)
      .eq("division", division)
      .eq("day", day)
      .maybeSingle<{ matches: TorikumiResponse["matches"]; immutable: boolean; fetched_at: string }>();

    logCacheError("read torikumi", error);

    if (data && (data.immutable || policy.immutable || isFresh(data.fetched_at, policy.ttlMs))) {
      return {
        data: {
          bashoId,
          division,
          day,
          matches: data.matches,
        },
        source: "supabase",
      };
    }
  }

  const fresh = await fetchTorikumi(bashoId, division, day);

  if (supabase) {
    const { error } = await supabase.from("torikumi").upsert({
      basho_id: bashoId,
      division,
      day,
      matches: fresh.matches,
      immutable: policy.immutable,
      fetched_at: new Date().toISOString(),
    });
    logCacheError("write torikumi", error);
  }

  return { data: fresh, source: "sumo-api" };
}

export async function getCachedRikishisIndex(
  options: CacheOptions = {},
): Promise<CacheResult<RikishiSummary[]>> {
  const supabase = getSupabaseServiceClient();

  if (supabase && !options.forceRefresh) {
    const { data, error } = await supabase
      .from("rikishi")
      .select(
        "id,nsk_id,sumodb_id,shikona_jp,shikona_en,heya,current_rank,current_division,birth_date,shusshin,height,weight,debut,fetched_at",
      )
      .order("id", { ascending: true })
      .returns<RikishiRow[]>();

    logCacheError("read rikishi index", error);

    if (data && data.length > 0 && data.some((row) => isFresh(row.fetched_at, RIKISHI_INDEX_TTL_MS))) {
      return { data: data.map(mapRikishiRow), source: "supabase" };
    }
  }

  const fresh = await fetchAllRikishisIndex();

  if (supabase && fresh.length > 0) {
    const { error } = await supabase.from("rikishi").upsert(fresh.map(toRikishiRow));
    logCacheError("write rikishi index", error);
  }

  return { data: fresh, source: "sumo-api" };
}

export async function getCachedRikishi(
  rikishiId: number,
  options: CacheOptions = {},
): Promise<CacheResult<RikishiSummary>> {
  const supabase = getSupabaseServiceClient();
  let cachedPartial: RikishiSummary | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("rikishi")
      .select(
        "id,nsk_id,sumodb_id,shikona_jp,shikona_en,heya,current_rank,current_division,birth_date,shusshin,height,weight,debut,fetched_at",
      )
      .eq("id", rikishiId)
      .maybeSingle<RikishiRow>();

    logCacheError("read rikishi", error);

    if (data) {
      const mapped = mapRikishiRow(data);
      cachedPartial = mapped;

      if (
        !options.forceRefresh &&
        hasDetailedProfile(data) &&
        isFresh(data.fetched_at, RIKISHI_PROFILE_TTL_MS)
      ) {
        return { data: mapped, source: "supabase" };
      }
    }
  }

  let fresh: RikishiSummary;
  try {
    fresh = await fetchRikishi(rikishiId);
  } catch (error) {
    if (cachedPartial) {
      logCacheError("fetch rikishi detail", error);
      return { data: cachedPartial, source: "supabase" };
    }

    throw error;
  }

  if (supabase) {
    const { error } = await supabase.from("rikishi").upsert(toRikishiRow(fresh));
    logCacheError("write rikishi", error);
  }

  return { data: fresh, source: "sumo-api" };
}

export async function getCachedHeadToHead(
  rikishiId: number,
  opponentId: number,
  options: CacheOptions = {},
): Promise<CacheResult<HeadToHeadResponse>> {
  const supabase = getSupabaseServiceClient();

  if (supabase && !options.forceRefresh) {
    const { data, error } = await supabase
      .from("head_to_head")
      .select("payload,fetched_at")
      .eq("rikishi_id", rikishiId)
      .eq("opponent_id", opponentId)
      .maybeSingle<{ payload: HeadToHeadResponse; fetched_at: string }>();

    logCacheError("read head to head", error);

    if (data && isFresh(data.fetched_at, HEAD_TO_HEAD_TTL_MS)) {
      return { data: data.payload, source: "supabase" };
    }
  }

  const fresh = await fetchHeadToHead(rikishiId, opponentId);

  if (supabase) {
    const { error } = await supabase.from("head_to_head").upsert({
      rikishi_id: rikishiId,
      opponent_id: opponentId,
      payload: fresh,
      fetched_at: new Date().toISOString(),
    });
    logCacheError("write head to head", error);
  }

  return { data: fresh, source: "sumo-api" };
}
