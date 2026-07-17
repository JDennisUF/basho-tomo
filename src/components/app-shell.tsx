"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BanzukePanel } from "@/components/banzuke-panel";
import { FavoritesPanel } from "@/components/favorites-panel";
import { TorikumiBoard } from "@/components/torikumi-board";
import { readCache, readPreference, readTimedCache, writeCache, writePreference } from "@/lib/cache";
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
  BashoSummary,
  BanzukeResponse,
  Division,
  RikishiSummary,
  TorikumiResponse,
} from "@/lib/types";

const DIVISIONS: Division[] = [
  "Makuuchi",
  "Juryo",
  "Makushita",
  "Sandanme",
  "Jonidan",
  "Jonokuchi",
];
const STABLE_VERSION = "v2-banzuke-cache";
const BASHO_SUMMARY_VERSION = "v2-basho-summary-cache";
const TORIKUMI_VERSION = "v6-torikumi-cache";
const RIKISHI_INDEX_VERSION = "v2-rikishi-index-cache";
const CURRENT_BASHO_SUMMARY_MAX_AGE_MS = 1000 * 60 * 60 * 12;

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
  const [torikumiRefreshNonce, setTorikumiRefreshNonce] = useState(0);
  const [isLoadingTorikumi, setIsLoadingTorikumi] = useState(true);
  const [torikumiError, setTorikumiError] = useState<string | null>(null);

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
      const cachedBasho =
        bashoId === currentBashoId
          ? readTimedCache<BashoSummary>(
              `basho:${bashoId}`,
              BASHO_SUMMARY_VERSION,
              CURRENT_BASHO_SUMMARY_MAX_AGE_MS,
            )
          : readCache<BashoSummary>(`basho:${bashoId}`, BASHO_SUMMARY_VERSION);
      const cachedMakuuchi = readCache<BanzukeResponse>(
        `banzuke:${bashoId}:Makuuchi`,
        STABLE_VERSION,
      );
      const cachedJuryo = readCache<BanzukeResponse>(`banzuke:${bashoId}:Juryo`, STABLE_VERSION);
      const cachedMakushita = readCache<BanzukeResponse>(
        `banzuke:${bashoId}:Makushita`,
        STABLE_VERSION,
      );
      const cachedSandanme = readCache<BanzukeResponse>(
        `banzuke:${bashoId}:Sandanme`,
        STABLE_VERSION,
      );
      const cachedJonidan = readCache<BanzukeResponse>(
        `banzuke:${bashoId}:Jonidan`,
        STABLE_VERSION,
      );
      const cachedJonokuchi = readCache<BanzukeResponse>(
        `banzuke:${bashoId}:Jonokuchi`,
        STABLE_VERSION,
      );
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

  function toggleFavorite(rikishiEntry: RikishiSummary) {
    setFavoriteIds((current) =>
      current.includes(rikishiEntry.id)
        ? current.filter((id) => id !== rikishiEntry.id)
        : [...current, rikishiEntry.id],
    );
  }

  function toggleFavoriteById(id: number) {
    setFavoriteIds((current) => current.filter((entry) => entry !== id));
  }

  function refreshTorikumiNow() {
    setTorikumiRefreshNonce((current) => current + 1);
  }

  const recentBashoIds = listRecentBashoIds(bashoId);

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="texture-panel overflow-hidden rounded-[8px]">
        <header className="border-b border-[color:var(--line)] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                className="fine-label hover-hint text-base text-[color:var(--ink-soft)]"
                title="Current grand sumo basho"
              >
                本場所案内
              </div>
              <h1 className="mt-2 text-4xl sm:text-5xl">{getBashoLabel(bashoId)}</h1>
              <p className="data-sans mt-2 max-w-2xl text-base leading-6 text-[color:var(--ink-soft)]">
                本日の取組を中心に、幕内と十両を静かに追うための場。
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
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
                <div className="grid grid-cols-3 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-1">
                  {DIVISIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDivision(item)}
                      className={`rounded-[6px] px-2 py-2 text-sm transition ${
                        division === item
                          ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                          : "text-[color:var(--ink-soft)]"
                      }`}
                      title={item}
                    >
                      {getDivisionLabel(item)}
                    </button>
                  ))}
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Day">
                  日目
                </span>
                <select
                  value={day}
                  onChange={(event) => setDayOverride(Number(event.target.value))}
                  className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}日目
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
        </header>

        <section className="grid gap-3 border-b border-[color:var(--line)] px-5 py-3 sm:grid-cols-4 sm:px-8">
          <div>
            <div className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Current division">
              現在
            </div>
            <div className="mt-1 text-xl sm:text-2xl">{getDivisionLabel(division)}</div>
          </div>
          <div>
            <div className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Selected day">
              本日
            </div>
            <div className="mt-1 text-xl sm:text-2xl">{day}日目</div>
          </div>
          <div>
            <div className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Cached rikishi count">
              人数
            </div>
            <div className="mt-1 text-xl data-sans sm:text-2xl" title="Cached basho rikishi">
              {rikishi.length} 名
            </div>
          </div>
          <div>
            <div className="fine-label hover-hint text-sm text-[color:var(--ink-soft)]" title="Cache mode for selected torikumi">
              保持
            </div>
            <div className="mt-1 text-xl sm:text-2xl">{cacheModeLabel}</div>
          </div>
        </section>

        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.7fr)_320px] lg:px-6 lg:py-5">
          <div className="space-y-5">
            <TorikumiBoard
              torikumi={hydratedTorikumi}
              isLoading={isLoadingTorikumi}
              error={torikumiError}
              nameMode={torikumiNameMode}
              onRefresh={refreshTorikumiNow}
            />
            <BanzukePanel
              banzuke={hydratedBanzukeMap[division]}
              favoriteIds={favoriteIds}
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

            <FavoritesPanel
              favorites={favorites}
              favoriteIds={favoriteIds}
              onToggle={toggleFavoriteById}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
