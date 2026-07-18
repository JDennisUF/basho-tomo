"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BanzukePanel } from "@/components/banzuke-panel";
import { FavoritesPanel } from "@/components/favorites-panel";
import { RikishiOverlay } from "@/components/rikishi-overlay";
import { TorikumiBoard } from "@/components/torikumi-board";
import { readCache, readPreference, readTimedCache, writeCache, writePreference } from "@/lib/cache";
import { DEFAULT_THEME, isThemeId, THEMES, ThemeId } from "@/lib/themes";
import {
  enrichBanzukeWithRikishi,
  enrichTorikumiWithRikishi,
  extractRikishiFromBanzuke,
  fetchAllRikishisIndex,
  fetchBanzuke,
  fetchBasho,
  fetchTorikumi,
  getBashoDayFromStartDate,
  formatBashoDate,
  getBashoLabel,
  getCurrentBashoId,
  getDefaultDay,
  getDivisionLabel,
  getTorikumiCachePolicy,
  isPastOrFinishedBasho,
  listRecentBashoIds,
} from "@/lib/sumo-api";
import {
  CurrentBashoRecord,
  BashoSummary,
  BanzukeResponse,
  Division,
  RikishiSummary,
  TorikumiResponse,
} from "@/lib/types";
import { formatRankLabel, formatRecordLabel, getDisplayShikona } from "@/lib/sumo-api";

const DIVISIONS: Division[] = [
  "Makuuchi",
  "Juryo",
  "Makushita",
  "Sandanme",
  "Jonidan",
  "Jonokuchi",
];
const STABLE_VERSION = "v4-banzuke-cache-east-west-shape";
const BASHO_SUMMARY_VERSION = "v2-basho-summary-cache";
const TORIKUMI_VERSION = "v6-torikumi-cache";
const RIKISHI_INDEX_VERSION = "v2-rikishi-index-cache";
const CURRENT_BASHO_SUMMARY_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const CURRENT_BANZUKE_MAX_AGE_MS = 1000 * 60 * 10;

function createEmptyBanzukeMap(): Record<Division, BanzukeResponse | null> {
  return {
    Makuuchi: null,
    Juryo: null,
    Makushita: null,
    Sandanme: null,
    Jonidan: null,
    Jonokuchi: null,
  };
}

function getEnglishRankTitle(division: Division, rank?: string) {
  if (!rank) {
    return division;
  }

  if (division === "Makuuchi") {
    return rank;
  }

  return rank.toLowerCase().startsWith(division.toLowerCase())
    ? rank
    : `${division} ${rank}`;
}

export function AppShell() {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) {
    return (
      <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="texture-panel overflow-hidden rounded-[8px]">
          <div className="border-b border-[color:var(--line)] px-5 py-6 sm:px-8">
            <div className="fine-label text-base text-[color:var(--ink-soft)]">本場所案内</div>
            <h1 className="mt-2 text-4xl sm:text-5xl">読込中</h1>
          </div>
        </div>
      </main>
    );
  }

  return <HydratedAppShell />;
}

function HydratedAppShell() {
  const [bashoId, setBashoId] = useState(getCurrentBashoId);
  const [theme, setTheme] = useState<ThemeId>(() => {
    const storedTheme = readPreference<ThemeId | string>("theme", DEFAULT_THEME);
    return isThemeId(storedTheme) ? storedTheme : DEFAULT_THEME;
  });
  const [division, setDivision] = useState<Division>(() =>
    readPreference<Division>("division", "Makuuchi"),
  );
  const [torikumiNameMode, setTorikumiNameMode] = useState<"jp" | "en">(() =>
    readPreference<"jp" | "en">("torikumi-name-mode", "jp"),
  );
  const [dayOverride, setDayOverride] = useState<number | null>(null);
  const [basho, setBasho] = useState<BashoSummary | null>(null);
  const [banzukeMap, setBanzukeMap] = useState<Record<Division, BanzukeResponse | null>>(
    createEmptyBanzukeMap,
  );
  const [bashoRikishi, setBashoRikishi] = useState<RikishiSummary[]>([]);
  const [rikishiIndex, setRikishiIndex] = useState<RikishiSummary[]>([]);
  const [torikumi, setTorikumi] = useState<TorikumiResponse | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    readPreference<number[]>("favorites", []),
  );
  const [selectedRikishiId, setSelectedRikishiId] = useState<number | null>(null);
  const [showLeaders, setShowLeaders] = useState<boolean>(() =>
    readPreference<boolean>("show-leaders", true),
  );
  const [showResults, setShowResults] = useState<boolean>(() =>
    readPreference<boolean>("show-results", true),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [torikumiRefreshNonce, setTorikumiRefreshNonce] = useState(0);
  const [isLoadingTorikumi, setIsLoadingTorikumi] = useState(true);
  const [torikumiError, setTorikumiError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writePreference("theme", theme);
  }, [theme]);

  useEffect(() => {
    writePreference("division", division);
  }, [division]);

  useEffect(() => {
    writePreference("favorites", favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    writePreference("torikumi-name-mode", torikumiNameMode);
  }, [torikumiNameMode]);

  useEffect(() => {
    writePreference("show-leaders", showLeaders);
  }, [showLeaders]);

  useEffect(() => {
    writePreference("show-results", showResults);
  }, [showResults]);

  useEffect(() => {
    let cancelled = false;

    async function loadRikishiIndex() {
      const cached = readCache<RikishiSummary[]>("rikishi-index", RIKISHI_INDEX_VERSION);
      if (cached) {
        if (!cancelled) {
          setRikishiIndex(cached);
        }
        return;
      }

      const nextIndex = await fetchAllRikishisIndex();
      writeCache("rikishi-index", RIKISHI_INDEX_VERSION, nextIndex);

      if (!cancelled) {
        setRikishiIndex(nextIndex);
      }
    }

    loadRikishiIndex().catch(() => {
      // Leave the app usable if the global rikishi index load fails.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStableData() {
      const currentBashoId = getCurrentBashoId();
      const isCurrentBasho = bashoId === currentBashoId;
      const cachedBasho =
        isCurrentBasho
          ? readTimedCache<BashoSummary>(
              `basho:${bashoId}`,
              BASHO_SUMMARY_VERSION,
              CURRENT_BASHO_SUMMARY_MAX_AGE_MS,
            )
          : readCache<BashoSummary>(`basho:${bashoId}`, BASHO_SUMMARY_VERSION);
      const readBanzukeCache = (division: Division) =>
        isCurrentBasho
          ? readTimedCache<BanzukeResponse>(
              `banzuke:${bashoId}:${division}`,
              STABLE_VERSION,
              CURRENT_BANZUKE_MAX_AGE_MS,
            )
          : readCache<BanzukeResponse>(`banzuke:${bashoId}:${division}`, STABLE_VERSION);
      const cachedMakuuchi = readBanzukeCache("Makuuchi");
      const cachedJuryo = readBanzukeCache("Juryo");
      const cachedMakushita = readBanzukeCache("Makushita");
      const cachedSandanme = readBanzukeCache("Sandanme");
      const cachedJonidan = readBanzukeCache("Jonidan");
      const cachedJonokuchi = readBanzukeCache("Jonokuchi");
      const cachedRikishi = readCache<RikishiSummary[]>(`rikishi:${bashoId}`, STABLE_VERSION);

      if (
        cachedBasho &&
        cachedMakuuchi &&
        cachedJuryo &&
        cachedMakushita &&
        cachedSandanme &&
        cachedJonidan &&
        cachedJonokuchi &&
        cachedRikishi
      ) {
        if (!cancelled) {
          setBasho(cachedBasho);
          setBanzukeMap({
            Makuuchi: cachedMakuuchi,
            Juryo: cachedJuryo,
            Makushita: cachedMakushita,
            Sandanme: cachedSandanme,
            Jonidan: cachedJonidan,
            Jonokuchi: cachedJonokuchi,
          });
          setBashoRikishi(cachedRikishi);
        }
        return;
      }

      const [
        nextBasho,
        nextMakuuchi,
        nextJuryo,
        nextMakushita,
        nextSandanme,
        nextJonidan,
        nextJonokuchi,
      ] = await Promise.all([
        cachedBasho ? Promise.resolve(cachedBasho) : fetchBasho(bashoId),
        cachedMakuuchi ? Promise.resolve(cachedMakuuchi) : fetchBanzuke(bashoId, "Makuuchi"),
        cachedJuryo ? Promise.resolve(cachedJuryo) : fetchBanzuke(bashoId, "Juryo"),
        cachedMakushita
          ? Promise.resolve(cachedMakushita)
          : fetchBanzuke(bashoId, "Makushita"),
        cachedSandanme ? Promise.resolve(cachedSandanme) : fetchBanzuke(bashoId, "Sandanme"),
        cachedJonidan ? Promise.resolve(cachedJonidan) : fetchBanzuke(bashoId, "Jonidan"),
        cachedJonokuchi
          ? Promise.resolve(cachedJonokuchi)
          : fetchBanzuke(bashoId, "Jonokuchi"),
      ]);

      const nextRikishi =
        cachedRikishi ??
        extractRikishiFromBanzuke(bashoId, [
          nextMakuuchi,
          nextJuryo,
          nextMakushita,
          nextSandanme,
          nextJonidan,
          nextJonokuchi,
        ]);

      if (!cachedBasho) {
        writeCache(`basho:${bashoId}`, BASHO_SUMMARY_VERSION, nextBasho);
      }
      if (!cachedMakuuchi) {
        writeCache(`banzuke:${bashoId}:Makuuchi`, STABLE_VERSION, nextMakuuchi);
      }
      if (!cachedJuryo) {
        writeCache(`banzuke:${bashoId}:Juryo`, STABLE_VERSION, nextJuryo);
      }
      if (!cachedMakushita) {
        writeCache(`banzuke:${bashoId}:Makushita`, STABLE_VERSION, nextMakushita);
      }
      if (!cachedSandanme) {
        writeCache(`banzuke:${bashoId}:Sandanme`, STABLE_VERSION, nextSandanme);
      }
      if (!cachedJonidan) {
        writeCache(`banzuke:${bashoId}:Jonidan`, STABLE_VERSION, nextJonidan);
      }
      if (!cachedJonokuchi) {
        writeCache(`banzuke:${bashoId}:Jonokuchi`, STABLE_VERSION, nextJonokuchi);
      }
      if (!cachedRikishi) {
        writeCache(`rikishi:${bashoId}`, STABLE_VERSION, nextRikishi);
      }

      if (!cancelled) {
        setBasho(nextBasho);
        setBanzukeMap({
          Makuuchi: nextMakuuchi,
          Juryo: nextJuryo,
          Makushita: nextMakushita,
          Sandanme: nextSandanme,
          Jonidan: nextJonidan,
          Jonokuchi: nextJonokuchi,
        });
        setBashoRikishi(nextRikishi);
      }
    }

    loadStableData().catch((error: unknown) => {
      if (!cancelled) {
        setTorikumiError(error instanceof Error ? error.message : "読込失敗");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bashoId]);

  const day =
    dayOverride ??
    (basho?.startDate ? getBashoDayFromStartDate(basho.startDate) : getDefaultDay());

  useEffect(() => {
    let cancelled = false;

    async function loadTorikumi() {
      setIsLoadingTorikumi(true);
      setTorikumiError(null);

      const cacheKey = `torikumi:${bashoId}:${division}:${day}`;
      const policy = getTorikumiCachePolicy({
        bashoId,
        startDate: basho?.startDate,
        endDate: basho?.endDate,
        selectedDay: day,
      });
      const shouldBypassCache = torikumiRefreshNonce > 0;
      const cached = shouldBypassCache
        ? null
        : policy.immutable
          ? readCache<TorikumiResponse>(cacheKey, TORIKUMI_VERSION)
          : readTimedCache<TorikumiResponse>(cacheKey, TORIKUMI_VERSION, policy.ttlMs);

      if (cached) {
        if (!cancelled) {
          setTorikumi(cached);
          setIsLoadingTorikumi(false);
        }
        return;
      }

      try {
        const nextTorikumi = await fetchTorikumi(bashoId, division, day);
        writeCache(cacheKey, TORIKUMI_VERSION, nextTorikumi);

        if (!cancelled) {
          setTorikumi(nextTorikumi);
          setIsLoadingTorikumi(false);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setTorikumiError(error instanceof Error ? error.message : "読込失敗");
          setIsLoadingTorikumi(false);
        }
      }
    }

    loadTorikumi().catch((error: unknown) => {
      if (!cancelled) {
        setTorikumiError(error instanceof Error ? error.message : "読込失敗");
        setIsLoadingTorikumi(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bashoId, day, division, basho?.startDate, basho?.endDate, torikumiRefreshNonce]);

  const rikishi = useMemo(() => {
    if (rikishiIndex.length === 0) {
      return bashoRikishi;
    }

    const merged = new Map<number, RikishiSummary>();

    for (const entry of rikishiIndex) {
      merged.set(entry.id, entry);
    }

    for (const entry of bashoRikishi) {
      const indexed = merged.get(entry.id);
      merged.set(entry.id, {
        id: entry.id,
        shikona: indexed?.shikona ?? entry.shikona,
        shikonaEn: indexed?.shikonaEn ?? entry.shikonaEn,
        heya: indexed?.heya ?? entry.heya,
        rank: entry.rank ?? indexed?.rank,
        division: entry.division,
      });
    }

    return [...merged.values()];
  }, [bashoRikishi, rikishiIndex]);

  const cacheModeLabel = basho
    ? isPastOrFinishedBasho(bashoId, basho.endDate)
      ? "固定"
      : getTorikumiCachePolicy({
            bashoId,
            startDate: basho.startDate,
            endDate: basho.endDate,
            selectedDay: day,
          }).immutable
        ? "固定"
        : "短期"
    : "読込中";

  const favorites = useMemo(
    () => rikishi.filter((entry) => favoriteIds.includes(entry.id)),
    [favoriteIds, rikishi],
  );
  const hydratedTorikumi = useMemo(
    () => enrichTorikumiWithRikishi(torikumi, rikishi),
    [torikumi, rikishi],
  );
  const hydratedBanzukeMap = useMemo(
    () => ({
      Makuuchi: enrichBanzukeWithRikishi(banzukeMap.Makuuchi, rikishi),
      Juryo: enrichBanzukeWithRikishi(banzukeMap.Juryo, rikishi),
      Makushita: enrichBanzukeWithRikishi(banzukeMap.Makushita, rikishi),
      Sandanme: enrichBanzukeWithRikishi(banzukeMap.Sandanme, rikishi),
      Jonidan: enrichBanzukeWithRikishi(banzukeMap.Jonidan, rikishi),
      Jonokuchi: enrichBanzukeWithRikishi(banzukeMap.Jonokuchi, rikishi),
    } satisfies Record<Division, BanzukeResponse | null>),
    [banzukeMap, rikishi],
  );
  const currentRecordMap = useMemo(() => {
    const recordMap = new Map<number, CurrentBashoRecord>();
    const rikishiLookup = new Map(rikishi.map((entry) => [entry.id, entry]));

    for (const response of Object.values(hydratedBanzukeMap)) {
      if (!response) {
        continue;
      }

      for (const record of response.records) {
        for (const side of [record.west, record.east]) {
          if (!side?.rikishiID) {
            continue;
          }

          if (
            side.wins === undefined &&
            side.losses === undefined &&
            side.absences === undefined
          ) {
            continue;
          }

          const enrichedRikishi = rikishiLookup.get(side.rikishiID);
          recordMap.set(side.rikishiID, {
            rikishiId: side.rikishiID,
            shikona: side.shikonaJp ?? side.shikonaEn ?? String(side.rikishiID),
            shikonaEn: side.shikonaEn,
            heya: enrichedRikishi?.heya,
            rank: side.rank,
            rankValue: side.rankValue,
            division: response.division,
            wins: side.wins,
            losses: side.losses,
            absences: side.absences,
            opponents: side.record ?? [],
          });
        }
      }
    }

    return Object.fromEntries(recordMap.entries());
  }, [hydratedBanzukeMap, rikishi]);
  const topCurrentRecords = useMemo(
    () =>
      Object.values(currentRecordMap)
        .filter((entry) => entry.division === division)
        .sort((left, right) => {
          const winDiff = (right.wins ?? 0) - (left.wins ?? 0);
          if (winDiff !== 0) {
            return winDiff;
          }

          const lossDiff = (left.losses ?? 0) - (right.losses ?? 0);
          if (lossDiff !== 0) {
            return lossDiff;
          }

          const absenceDiff = (left.absences ?? 0) - (right.absences ?? 0);
          if (absenceDiff !== 0) {
            return absenceDiff;
          }

          const divisionDiff = DIVISIONS.indexOf(left.division) - DIVISIONS.indexOf(right.division);
          if (divisionDiff !== 0) {
            return divisionDiff;
          }

          return (left.rankValue ?? Number.MAX_SAFE_INTEGER) - (right.rankValue ?? Number.MAX_SAFE_INTEGER);
        })
        .slice(0, 10),
    [currentRecordMap, division],
  );
  const rikishiById = useMemo(
    () => new Map(rikishi.map((entry) => [entry.id, entry])),
    [rikishi],
  );
  const selectedRikishi = selectedRikishiId ? rikishiById.get(selectedRikishiId) ?? null : null;
  const selectedRikishiRecord =
    selectedRikishiId !== null ? currentRecordMap[selectedRikishiId] : undefined;

  function toggleFavorite(rikishiEntry: RikishiSummary) {
    setFavoriteIds((current) =>
      current.includes(rikishiEntry.id)
        ? current.filter((id) => id !== rikishiEntry.id)
        : [...current, rikishiEntry.id],
    );
  }

  function refreshTorikumiNow() {
    setTorikumiRefreshNonce((current) => current + 1);
  }

  const recentBashoIds = listRecentBashoIds(getCurrentBashoId(), 24);
  const selectedTheme = THEMES.find((item) => item.id === theme) ?? THEMES[0];

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="texture-panel overflow-hidden rounded-[8px]">
        <header className="border-b border-[color:var(--line)] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-5xl sm:text-7xl" title="Basho Tomo">場所友</h1>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_4rem_minmax(0,1fr)_auto]">
              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Basho">
                  場所
                </span>
                <select
                  value={bashoId}
                  onChange={(event) => {
                    setBashoId(event.target.value);
                    setDayOverride(null);
                  }}
                  className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
                >
                  {recentBashoIds.map((value) => (
                    <option key={value} value={value}>
                      {getBashoLabel(value)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Division">
                  番付
                </span>
                <select
                  value={division}
                  onChange={(event) => setDivision(event.target.value as Division)}
                  className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
                >
                  {DIVISIONS.map((item) => (
                    <option key={item} value={item}>
                      {getDivisionLabel(item)} {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Day">
                  日目
                </span>
                <select
                  value={day}
                  onChange={(event) => setDayOverride(Number(event.target.value))}
                  className="w-16 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span
                  className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]"
                  title="Show or hide bout results"
                >
                  勝敗
                </span>
                <div className="grid grid-cols-2 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-1">
                  <button
                    type="button"
                    onClick={() => setShowResults(true)}
                    className={`rounded-[6px] px-3 py-2 text-base transition ${
                      showResults
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "text-[color:var(--ink-soft)]"
                    }`}
                    title="Show bout results"
                  >
                    表示
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResults(false)}
                    className={`rounded-[6px] px-3 py-2 text-base transition ${
                      !showResults
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "text-[color:var(--ink-soft)]"
                    }`}
                    title="Hide bout results"
                  >
                    隠す
                  </button>
                </div>
              </label>

              <div className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Settings">
                  設定
                </span>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="fine-label inline-flex h-[42px] w-[42px] items-center justify-center rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  title="Open settings"
                  aria-label="Open settings"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    ⚙
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.7fr)_320px] lg:px-6 lg:py-5">
          <div className="space-y-5">
            <TorikumiBoard
              torikumi={hydratedTorikumi}
              isLoading={isLoadingTorikumi}
              error={torikumiError}
              nameMode={torikumiNameMode}
              favoriteIds={favoriteIds}
              currentRecordMap={currentRecordMap}
              showResults={showResults}
              onSelectRikishi={setSelectedRikishiId}
              onToggleFavorite={toggleFavorite}
              onRefresh={refreshTorikumiNow}
            />
            <BanzukePanel
              banzuke={hydratedBanzukeMap[division]}
              favoriteIds={favoriteIds}
              nameMode={torikumiNameMode}
              onToggleFavorite={toggleFavorite}
            />
          </div>

          <div className="space-y-5">
            <section className="section-frame p-5 sm:p-6">
              <div className="section-accent" />
              <div className="border-b border-[color:var(--line)] pb-4">
                <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Basho notes">
                  場所覚書
                </div>
                <h2 className="mt-2 text-3xl">概要</h2>
              </div>
              <dl className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <dt className="hover-hint text-lg text-[color:var(--ink-soft)]" title="Start date">
                    開始
                  </dt>
                  <dd className="data-sans text-lg">{formatBashoDate(basho?.startDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="hover-hint text-lg text-[color:var(--ink-soft)]" title="Final day">
                    千秋楽
                  </dt>
                  <dd className="data-sans text-lg">{formatBashoDate(basho?.endDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="hover-hint text-lg text-[color:var(--ink-soft)]" title="Champion">
                    優勝
                  </dt>
                  <dd className="text-lg">{basho?.yusho ?? "進行中"}</dd>
                </div>
              </dl>
            </section>

            <section className="section-frame p-5 sm:p-6">
              <div className="section-accent" />
              <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] pb-4">
                <div>
                  <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Best current tournament records">
                    星取上位
                  </div>
                  <h2 className="mt-2 text-3xl">勝ち星十傑</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaders((current) => !current)}
                  className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  title={showLeaders ? "Hide leader records to avoid spoilers" : "Show leader records"}
                  aria-pressed={showLeaders}
                >
                  {showLeaders ? "隠す" : "見る"}
                </button>
              </div>
              {!showLeaders ? (
                <p className="mt-4 text-sm text-[color:var(--ink-soft)]" title="Leader records hidden.">
                  非表示
                </p>
              ) : topCurrentRecords.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--ink-soft)]" title="No current records available.">
                  記録なし
                </p>
              ) : (
                <ol className="mt-4 space-y-1">
                  {topCurrentRecords.map((entry, index) => {
                    const displayName =
                      torikumiNameMode === "en"
                        ? entry.shikonaEn ?? getDisplayShikona(entry.shikona)
                        : getDisplayShikona(entry.shikona) || entry.shikonaEn || String(entry.rikishiId);
                    const rankLabel = formatRankLabel(entry.rank) || getDivisionLabel(entry.division);
                    const rankTitle = getEnglishRankTitle(entry.division, entry.rank);

                    return (
                      <li
                        key={entry.rikishiId}
                        className="grid grid-cols-[1.5rem_minmax(0,1fr)_6.75rem_3.5rem] items-center gap-2 border-b border-[color:var(--line)] py-1.5"
                      >
                        <span
                          className="data-sans text-sm text-[color:var(--ink-soft)]"
                          title={`Rank in top records: ${index + 1}`}
                        >
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRikishiId(entry.rikishiId)}
                          className="min-w-0 truncate text-left text-lg transition hover:text-[color:var(--accent)]"
                          title={entry.shikonaEn ? `Open rikishi details: ${entry.shikonaEn}` : "Open rikishi details"}
                        >
                          {displayName}
                        </button>
                        <div
                          className="data-sans min-w-0 truncate text-left text-[13px] text-[color:var(--ink-soft)]"
                          title={rankTitle}
                        >
                          {rankLabel}
                        </div>
                        <div
                          className="data-sans shrink-0 text-right text-base text-[color:var(--ink)]"
                          title="Current tournament record"
                        >
                          {formatRecordLabel(entry.wins, entry.losses, entry.absences)}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <FavoritesPanel
              favorites={favorites}
              favoriteIds={favoriteIds}
              rikishiIndex={rikishi}
              nameMode={torikumiNameMode}
              onToggle={toggleFavorite}
              onSelect={setSelectedRikishiId}
            />
          </div>
        </div>
      </div>
      {selectedRikishi ? (
        <RikishiOverlay
          rikishi={selectedRikishi}
          record={selectedRikishiRecord}
          currentRecordMap={currentRecordMap}
          nameMode={torikumiNameMode}
          showResults={showResults}
          onClose={() => setSelectedRikishiId(null)}
        />
      ) : null}
      {showSettings ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(33,25,21,0.52)] px-4 py-6 sm:items-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="texture-panel w-full max-w-md overflow-hidden rounded-[8px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Settings">
                    設定
                  </div>
                  <h2 className="mt-2 text-3xl">環境</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  title="Close settings"
                >
                  閉じる
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Theme">
                  意匠
                </span>
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as ThemeId)}
                  className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
                  title={selectedTheme.description}
                >
                  {THEMES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} {item.description}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span
                  className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]"
                  title="Torikumi shikona display"
                >
                  取組名
                </span>
                <div className="grid grid-cols-2 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-1">
                  <button
                    type="button"
                    onClick={() => setTorikumiNameMode("jp")}
                    className={`rounded-[6px] px-3 py-2 text-base transition ${
                      torikumiNameMode === "jp"
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "text-[color:var(--ink-soft)]"
                    }`}
                    title="Japanese shikona"
                  >
                    日本語
                  </button>
                  <button
                    type="button"
                    onClick={() => setTorikumiNameMode("en")}
                    className={`rounded-[6px] px-3 py-2 text-base transition ${
                      torikumiNameMode === "en"
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "text-[color:var(--ink-soft)]"
                    }`}
                    title="English shikona"
                  >
                    English
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
