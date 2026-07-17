"use client";

import { useEffect, useMemo, useState } from "react";
import { BanzukePanel } from "@/components/banzuke-panel";
import { FavoritesPanel } from "@/components/favorites-panel";
import { TorikumiBoard } from "@/components/torikumi-board";
import { readCache, readPreference, readTimedCache, writeCache, writePreference } from "@/lib/cache";
import {
  extractRikishiFromBanzuke,
  fetchBanzuke,
  fetchBasho,
  fetchTorikumi,
  getBashoLabel,
  getCurrentBashoId,
  getDefaultDay,
  getDivisionLabel,
  listRecentBashoIds,
} from "@/lib/sumo-api";
import { BashoSummary, BanzukeResponse, Division, RikishiSummary, TorikumiResponse } from "@/lib/types";

const DIVISIONS: Division[] = ["Makuuchi", "Juryo"];
const STABLE_VERSION = "v1-banzuke-cache";
const TORIKUMI_VERSION = "v1-torikumi-cache";
const TORIKUMI_MAX_AGE_MS = 1000 * 60 * 10;

export function AppShell() {
  const [bashoId, setBashoId] = useState(getCurrentBashoId);
  const [division, setDivision] = useState<Division>(() =>
    readPreference<Division>("division", "Makuuchi"),
  );
  const [day, setDay] = useState(getDefaultDay);
  const [basho, setBasho] = useState<BashoSummary | null>(null);
  const [banzukeMap, setBanzukeMap] = useState<Record<Division, BanzukeResponse | null>>({
    Makuuchi: null,
    Juryo: null,
  });
  const [rikishi, setRikishi] = useState<RikishiSummary[]>([]);
  const [torikumi, setTorikumi] = useState<TorikumiResponse | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    readPreference<number[]>("favorites", []),
  );
  const [isLoadingTorikumi, setIsLoadingTorikumi] = useState(true);
  const [torikumiError, setTorikumiError] = useState<string | null>(null);

  useEffect(() => {
    writePreference("division", division);
  }, [division]);

  useEffect(() => {
    writePreference("favorites", favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadStableData() {
      const cachedBasho = readCache<BashoSummary>(`basho:${bashoId}`, STABLE_VERSION);
      const cachedMakuuchi = readCache<BanzukeResponse>(
        `banzuke:${bashoId}:Makuuchi`,
        STABLE_VERSION,
      );
      const cachedJuryo = readCache<BanzukeResponse>(`banzuke:${bashoId}:Juryo`, STABLE_VERSION);
      const cachedRikishi = readCache<RikishiSummary[]>(`rikishi:${bashoId}`, STABLE_VERSION);

      if (cachedBasho && cachedMakuuchi && cachedJuryo && cachedRikishi) {
        if (!cancelled) {
          setBasho(cachedBasho);
          setBanzukeMap({ Makuuchi: cachedMakuuchi, Juryo: cachedJuryo });
          setRikishi(cachedRikishi);
        }
        return;
      }

      const [nextBasho, nextMakuuchi, nextJuryo] = await Promise.all([
        fetchBasho(bashoId),
        fetchBanzuke(bashoId, "Makuuchi"),
        fetchBanzuke(bashoId, "Juryo"),
      ]);

      const nextRikishi = extractRikishiFromBanzuke(bashoId, [nextMakuuchi, nextJuryo]);

      writeCache(`basho:${bashoId}`, STABLE_VERSION, nextBasho);
      writeCache(`banzuke:${bashoId}:Makuuchi`, STABLE_VERSION, nextMakuuchi);
      writeCache(`banzuke:${bashoId}:Juryo`, STABLE_VERSION, nextJuryo);
      writeCache(`rikishi:${bashoId}`, STABLE_VERSION, nextRikishi);

      if (!cancelled) {
        setBasho(nextBasho);
        setBanzukeMap({ Makuuchi: nextMakuuchi, Juryo: nextJuryo });
        setRikishi(nextRikishi);
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

  useEffect(() => {
    let cancelled = false;

    async function loadTorikumi() {
      setIsLoadingTorikumi(true);
      setTorikumiError(null);

      const cacheKey = `torikumi:${bashoId}:${division}:${day}`;
      const cached = readTimedCache<TorikumiResponse>(
        cacheKey,
        TORIKUMI_VERSION,
        TORIKUMI_MAX_AGE_MS,
      );

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
  }, [bashoId, day, division]);

  const favorites = useMemo(
    () => rikishi.filter((entry) => favoriteIds.includes(entry.id)),
    [favoriteIds, rikishi],
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

  const recentBashoIds = listRecentBashoIds(bashoId);

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="texture-panel overflow-hidden rounded-[8px]">
        <header className="border-b border-[color:var(--line)] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                className="fine-label hover-hint text-xs text-[color:var(--ink-soft)]"
                title="Current grand sumo basho"
              >
                本場所案内
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl">{getBashoLabel(bashoId)}</h1>
              <p className="data-sans mt-2 max-w-2xl text-sm leading-5 text-[color:var(--ink-soft)]">
                本日の取組を中心に、幕内と十両を静かに追うための場。
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-[10px] text-[color:var(--ink-soft)]" title="Basho">
                  場所
                </span>
                <select
                  value={bashoId}
                  onChange={(event) => setBashoId(event.target.value)}
                  className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-1.5 text-sm"
                >
                  {recentBashoIds.map((value) => (
                    <option key={value} value={value}>
                      {getBashoLabel(value)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="fine-label hover-hint text-[10px] text-[color:var(--ink-soft)]" title="Division">
                  番付
                </span>
                <div className="grid grid-cols-2 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] p-1">
                  {DIVISIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDivision(item)}
                      className={`rounded-[6px] px-3 py-1.5 text-sm transition ${
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
                <span className="fine-label hover-hint text-[10px] text-[color:var(--ink-soft)]" title="Day">
                  日目
                </span>
                <select
                  value={day}
                  onChange={(event) => setDay(Number(event.target.value))}
                  className="rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-1.5 text-sm"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}日目
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        <section className="grid gap-3 border-b border-[color:var(--line)] px-5 py-3 sm:grid-cols-3 sm:px-8">
          <div>
            <div className="fine-label hover-hint text-[10px] text-[color:var(--ink-soft)]" title="Current division">
              現在
            </div>
            <div className="mt-1 text-base">{getDivisionLabel(division)}</div>
          </div>
          <div>
            <div className="fine-label hover-hint text-[10px] text-[color:var(--ink-soft)]" title="Selected day">
              本日
            </div>
            <div className="mt-1 text-base">{day}日目</div>
          </div>
          <div>
            <div className="fine-label hover-hint text-[10px] text-[color:var(--ink-soft)]" title="Cached rikishi count">
              人数
            </div>
            <div className="mt-1 text-base data-sans" title="Cached basho rikishi">
              {rikishi.length} 名
            </div>
          </div>
        </section>

        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.7fr)_320px] lg:px-6 lg:py-5">
          <div className="space-y-5">
            <TorikumiBoard torikumi={torikumi} isLoading={isLoadingTorikumi} error={torikumiError} />
            <BanzukePanel
              banzuke={banzukeMap[division]}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          </div>

          <div className="space-y-5">
            <section className="section-frame p-5 sm:p-6">
              <div className="section-accent" />
              <div className="border-b border-[color:var(--line)] pb-4">
                <div className="fine-label text-xs text-[color:var(--ink-soft)]" title="Basho notes">
                  場所覚書
                </div>
                <h2 className="mt-2 text-xl">概要</h2>
              </div>
              <dl className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <dt className="hover-hint text-sm text-[color:var(--ink-soft)]" title="Start date">
                    開始
                  </dt>
                  <dd className="data-sans text-[13px]">{basho?.startDate ?? "未詳"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="hover-hint text-sm text-[color:var(--ink-soft)]" title="Final day">
                    千秋楽
                  </dt>
                  <dd className="data-sans text-[13px]">{basho?.endDate ?? "未詳"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="hover-hint text-sm text-[color:var(--ink-soft)]" title="Champion">
                    優勝
                  </dt>
                  <dd className="text-[13px]">{basho?.yusho ?? "進行中"}</dd>
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
