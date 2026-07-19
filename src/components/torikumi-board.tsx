"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CurrentBashoRecord,
  HeadToHeadResponse,
  MatchSide,
  RikishiSummary,
  TorikumiMatch,
  TorikumiResponse,
} from "@/lib/types";
import { VerticalName } from "@/components/vertical-name";
import {
  fetchHeadToHead,
  formatRankLabel,
  formatRecordLabel,
  getBashoLabel,
  getDisplayShikona,
  getDivisionLabel,
  isKinboshiWin,
} from "@/lib/sumo-api";

type TorikumiBoardProps = {
  torikumi: TorikumiResponse | null;
  isLoading: boolean;
  error: string | null;
  nameMode: "jp" | "en";
  swapSides: boolean;
  favoriteIds: number[];
  currentRecordMap: Record<number, CurrentBashoRecord>;
  showResults: boolean;
  onSelectRikishi: (rikishiId: number) => void;
  onToggleFavorite: (rikishi: RikishiSummary) => void;
  onToggleSwapSides: () => void;
  onRefresh: () => void;
};

type TorikumiSideKey = "west" | "east";

function KinboshiStar() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 drop-shadow-[0_0_4px_rgba(255,208,64,0.6)]"
    >
      <path
        d="M12 2.4l2.82 5.72 6.31.92-4.57 4.45 1.08 6.28L12 16.8l-5.64 2.97 1.08-6.28L2.87 9.04l6.31-.92L12 2.4z"
        fill="#ffd24a"
        stroke="#8a5a00"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WinnerMark({
  active,
  kinboshi = false,
  showResults = true,
}: {
  active?: boolean;
  kinboshi?: boolean;
  showResults?: boolean;
}) {
  const slotClass = "flex h-7 w-7 items-center justify-center";

  if (!showResults) {
    return (
      <span
        className={`${slotClass} rounded-full border border-[color:var(--line-strong)] bg-[color:var(--line)]`}
        title="Result hidden"
      />
    );
  }

  if (active && kinboshi) {
    return (
      <span
        className={slotClass}
        title="Kinboshi: gold star win over Yokozuna"
      >
        <KinboshiStar />
      </span>
    );
  }

  return (
    <span
      className={`${slotClass} rounded-full border ${
        active
          ? "border-[color:var(--ink)] bg-white"
          : "border-[color:var(--ink)] bg-[color:var(--loss-mark)]"
      }`}
      title={active ? "Winner: white circle" : "Loser: black circle"}
    />
  );
}

function RecordSlot({
  align,
  showResults,
  recordLabel,
}: {
  align: "left" | "right";
  showResults: boolean;
  recordLabel?: string;
}) {
  const widthClass = "w-[2.75rem] sm:w-[3.25rem]";
  const alignClass = align === "left" ? "text-left" : "text-right";

  if (!showResults || !recordLabel) {
    return <span aria-hidden="true" className={`${widthClass} block`} />;
  }

  return (
    <span
      className={`data-sans ${widthClass} ${alignClass} text-[16px] leading-[1.12] text-[color:var(--ink-soft)] sm:text-[19px]`}
      title="Current tournament record"
    >
      {recordLabel}
    </span>
  );
}

function MatchIdentityDebug({
  id,
  matchedById,
}: {
  id?: number;
  matchedById?: boolean;
}) {
  if (!id || matchedById) {
    return null;
  }

  return (
    <div className="mt-1 text-[10px] text-[color:var(--accent)]" title="Rikishi ID did not match cached rikishi index">
      ID未一致 {id}
    </div>
  );
}

function TorikumiFavoriteButton({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`rounded-full border px-2 py-1 text-[11px] leading-none transition ${
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
          : "border-[color:var(--line)] text-[color:var(--ink-soft)] opacity-0 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] group-hover:opacity-100 focus-visible:opacity-100"
      }`}
      title={title}
      aria-pressed={active}
    >
      贔
    </button>
  );
}

function getVisibleShikona(
  shikona: string | undefined,
  shikonaEn: string | undefined,
  nameMode: "jp" | "en",
) {
  if (nameMode === "en") {
    return shikonaEn ?? getDisplayShikona(shikona);
  }

  return getDisplayShikona(shikona) || shikonaEn || "未詳";
}

function getMatchSide(match: TorikumiMatch, side: TorikumiSideKey): MatchSide | undefined {
  return side === "west" ? match.west : match.east;
}

function TechniqueList({
  title,
  titleEn,
  values,
}: {
  title: string;
  titleEn: string;
  values: Record<string, number>;
}) {
  const entries = Object.entries(values).sort((left, right) => right[1] - left[1]);

  return (
    <section className="section-frame p-4">
      <div className="section-accent" />
      <div className="fine-label text-sm text-[color:var(--ink-soft)]" title={titleEn}>
        {title}
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--ink-soft)]" title="No recorded techniques.">
          記録なし
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map(([kimarite, count]) => (
            <li key={kimarite} className="flex items-center justify-between gap-3 text-sm">
              <span className="hover-hint text-[color:var(--ink-soft)]" title={`Technique: ${kimarite}`}>
                {kimarite}
              </span>
              <span className="data-sans text-[color:var(--ink)]">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MatchDialog({
  match,
  nameMode,
  currentRecordMap,
  onClose,
}: {
  match: TorikumiMatch;
  nameMode: "jp" | "en";
  currentRecordMap: Record<number, CurrentBashoRecord>;
  onClose: () => void;
}) {
  const westId = match.west?.rikishiId;
  const eastId = match.east?.rikishiId;
  const [headToHeadState, setHeadToHeadState] = useState<{
    key: string | null;
    data: HeadToHeadResponse | null;
    error: string | null;
  }>({
    key: null,
    data: null,
    error: null,
  });
  const requestKey = westId && eastId ? `${westId}:${eastId}` : null;

  useEffect(() => {
    if (!westId || !eastId) {
      return;
    }

    let cancelled = false;

    fetchHeadToHead(westId, eastId)
      .then((result) => {
        if (!cancelled) {
          setHeadToHeadState({
            key: `${westId}:${eastId}`,
            data: result,
            error: null,
          });
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setHeadToHeadState({
            key: `${westId}:${eastId}`,
            data: null,
            error: fetchError instanceof Error ? fetchError.message : "読込失敗",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eastId, westId]);

  const headToHead = requestKey === headToHeadState.key ? headToHeadState.data : null;
  const error = requestKey === headToHeadState.key ? headToHeadState.error : null;
  const isLoading = !!requestKey && requestKey !== headToHeadState.key;
  const currentWestName = getVisibleShikona(match.west?.shikona, match.west?.shikonaEn, nameMode);
  const currentEastName = getVisibleShikona(match.east?.shikona, match.east?.shikonaEn, nameMode);
  const currentKimarite = match.kimarite ?? "予定";
  const displayError = !westId || !eastId ? "対戦情報なし" : error;
  const westRecord = westId ? currentRecordMap[westId] : undefined;
  const eastRecord = eastId ? currentRecordMap[eastId] : undefined;
  const total = headToHead?.total ?? 0;
  const westWins = headToHead?.rikishiWins ?? 0;
  const eastWins = headToHead?.opponentWins ?? 0;
  const history = useMemo(() => headToHead?.matches ?? [], [headToHead]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(33,25,21,0.52)] px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="texture-panel max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[8px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Match details">
                一番詳細
              </div>
              <h2 className="mt-2 text-3xl sm:text-4xl">
                {currentWestName} <span className="text-[color:var(--ink-soft)]">対</span> {currentEastName}
              </h2>
              <p className="data-sans mt-2 text-sm text-[color:var(--ink-soft)]">
                {formatRankLabel(match.west?.rank)} / {formatRankLabel(match.east?.rank)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              title="Close match details"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
            <div className="section-frame p-5">
              <div className="section-accent" />
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Selected bout">
                本日一番
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="text-left">
                  <div className="text-2xl" title={match.west?.shikonaEn}>
                    {currentWestName}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--ink-soft)]" title={match.west?.rank}>
                    {formatRankLabel(match.west?.rank)}
                  </div>
                  {westRecord ? (
                    <div
                      className="data-sans mt-1 text-sm text-[color:var(--ink-soft)]"
                      title="Current tournament record"
                    >
                      {formatRecordLabel(westRecord.wins, westRecord.losses, westRecord.absences)}
                    </div>
                  ) : null}
                </div>
                <div className="text-center">
                  <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Bout number">
                    {String(match.matchNo ?? 0).padStart(2, "0")}
                  </div>
                  <div
                    className="mt-2 hover-hint text-sm text-[color:var(--ink-soft)]"
                    title={match.kimarite ? `Winning technique: ${match.kimarite}` : "Scheduled bout"}
                  >
                    {currentKimarite}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl" title={match.east?.shikonaEn}>
                    {currentEastName}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--ink-soft)]" title={match.east?.rank}>
                    {formatRankLabel(match.east?.rank)}
                  </div>
                  {eastRecord ? (
                    <div
                      className="data-sans mt-1 text-sm text-[color:var(--ink-soft)]"
                      title="Current tournament record"
                    >
                      {formatRecordLabel(eastRecord.wins, eastRecord.losses, eastRecord.absences)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="section-frame p-5">
              <div className="section-accent" />
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Head to head summary">
                対戦成績
              </div>
              {isLoading ? (
                <p className="mt-4 text-sm text-[color:var(--ink-soft)]" title="Loading head to head records.">
                  読込中
                </p>
              ) : displayError ? (
                <p className="mt-4 text-sm text-[color:var(--accent)]" title="Head to head load failed.">
                  {displayError}
                </p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-3xl">{westWins}</div>
                      <div
                        className="fine-label mt-1 text-xs text-[color:var(--ink-soft)]"
                        title={`Wins for ${match.west?.shikonaEn ?? currentWestName}`}
                      >
                        {currentWestName}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl data-sans">{total}</div>
                      <div className="fine-label mt-1 text-xs text-[color:var(--ink-soft)]" title="Total head to head matches">
                        合計
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl">{eastWins}</div>
                      <div
                        className="fine-label mt-1 text-xs text-[color:var(--ink-soft)]"
                        title={`Wins for ${match.east?.shikonaEn ?? currentEastName}`}
                      >
                        {currentEastName}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[color:var(--line)] pt-4 text-sm text-[color:var(--ink-soft)]">
                    {headToHead?.matches.length ? (
                      <div title="Most recent meeting">
                        直近: {getBashoLabel(headToHead.matches[0]?.bashoId ?? "")}{" "}
                        {headToHead.matches[0]?.day ?? "-"}日目
                      </div>
                    ) : (
                      <div title="No recorded meetings">初顔合わせ</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {!isLoading && !error && headToHead ? (
            <section className="mt-4 grid gap-4 lg:grid-cols-2">
              <TechniqueList title="決まり手勝ち" titleEn="Winning techniques" values={headToHead.kimariteWins} />
              <TechniqueList title="決まり手負け" titleEn="Losing techniques" values={headToHead.kimariteLosses} />
            </section>
          ) : null}

          <section className="section-frame mt-4 p-5">
            <div className="section-accent" />
            <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Head to head history">
              対戦履歴
            </div>
            {isLoading ? (
              <p className="mt-4 text-sm text-[color:var(--ink-soft)]">読込中</p>
            ) : displayError ? (
              <p className="mt-4 text-sm text-[color:var(--accent)]">{displayError}</p>
            ) : history.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--ink-soft)]" title="No prior matches recorded.">
                対戦記録なし
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[color:var(--line)]">
                {history.map((entry, index) => {
                  const westWon = entry.winnerId && entry.westId ? entry.winnerId === entry.westId : false;
                  const eastWon = entry.winnerId && entry.eastId ? entry.winnerId === entry.eastId : false;
                  const historyWestName = getVisibleShikona(
                    entry.westShikona,
                    entry.westId === westId ? match.west?.shikonaEn : match.east?.shikonaEn,
                    nameMode,
                  );
                  const historyEastName = getVisibleShikona(
                    entry.eastShikona,
                    entry.eastId === eastId ? match.east?.shikonaEn : match.west?.shikonaEn,
                    nameMode,
                  );

                  return (
                    <article
                      key={`${entry.bashoId}-${entry.day ?? 0}-${entry.matchNo ?? index}`}
                      className="grid gap-3 py-3 sm:grid-cols-[140px_1fr_auto]"
                    >
                      <div className="data-sans text-sm text-[color:var(--ink-soft)]">
                        <div>{getBashoLabel(entry.bashoId)}</div>
                        <div className="mt-1">
                          {getDivisionLabel(entry.division)} {entry.day ?? "-"}日目
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-base">
                          <span className={westWon ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]"}>
                            {historyWestName}
                          </span>
                          <span className="text-[color:var(--ink-soft)]">対</span>
                          <span className={eastWon ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]"}>
                            {historyEastName}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-[color:var(--ink-soft)]">
                          {formatRankLabel(entry.westRank)} / {formatRankLabel(entry.eastRank)}
                        </div>
                      </div>
                      <div
                        className="text-right text-sm text-[color:var(--ink-soft)]"
                        title={entry.kimarite ? `Winning technique: ${entry.kimarite}` : "No technique recorded"}
                      >
                        {entry.kimarite ?? "未詳"}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function TorikumiBoard({
  torikumi,
  isLoading,
  error,
  nameMode,
  swapSides,
  favoriteIds,
  currentRecordMap,
  showResults,
  onSelectRikishi,
  onToggleFavorite,
  onToggleSwapSides,
  onRefresh,
}: TorikumiBoardProps) {
  const [selectedMatch, setSelectedMatch] = useState<TorikumiMatch | null>(null);

  if (isLoading) {
    return (
      <section className="section-frame min-h-96 p-6 sm:p-8">
        <div className="section-accent" />
        <div className="fine-label text-xs text-[color:var(--ink-soft)]" title="Loading torikumi">
          取組 読込中
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section-frame min-h-96 p-6 sm:p-8">
        <div className="section-accent" />
        <div className="fine-label text-xs text-[color:var(--accent)]" title="Load failed">
          読込失敗
        </div>
        <p className="mt-4 text-sm text-[color:var(--ink-soft)]">{error}</p>
      </section>
    );
  }

  if (!torikumi || torikumi.matches.length === 0) {
    return (
      <section className="section-frame min-h-96 p-6 sm:p-8">
        <div className="section-accent" />
        <div className="fine-label text-xs text-[color:var(--ink-soft)]" title="No torikumi">
          取組なし
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="section-frame overflow-hidden">
        <div className="section-accent" />
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="fine-label text-3xl text-[color:var(--ink-soft)] sm:text-4xl" title="Today's torikumi">
            本日取組
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSwapSides}
              className={`fine-label relative top-[4px] inline-flex h-10 items-center justify-center self-center rounded-[6px] border px-3 leading-none text-sm transition ${
                swapSides
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                  : "border-[color:var(--line)] text-[color:var(--ink-soft)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              }`}
              title="Show East rikishi on the left"
              aria-label="Show East rikishi on the left"
              aria-pressed={swapSides}
            >
              東左
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="fine-label relative top-[4px] inline-flex h-10 items-center justify-center self-center rounded-[6px] border border-[color:var(--line)] px-3 leading-none text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              title="Refresh torikumi now"
            >
              更新
            </button>
          </div>
        </div>
        <div className="divide-y divide-[color:var(--line)]">
          {torikumi.matches.map((match, index) => (
            (() => {
              const leftSideKey: TorikumiSideKey = swapSides ? "east" : "west";
              const rightSideKey: TorikumiSideKey = swapSides ? "west" : "east";
              const leftSide = getMatchSide(match, leftSideKey);
              const rightSide = getMatchSide(match, rightSideKey);
              const leftFavorite = leftSide?.rikishiId
                ? favoriteIds.includes(leftSide.rikishiId)
                : false;
              const rightFavorite = rightSide?.rikishiId
                ? favoriteIds.includes(rightSide.rikishiId)
                : false;
              const hasFavorite = leftFavorite || rightFavorite;
              const hasMatchDetails = !!match.west?.rikishiId && !!match.east?.rikishiId;
              const leftRecord = leftSide?.rikishiId
                ? currentRecordMap[leftSide.rikishiId]
                : undefined;
              const rightRecord = rightSide?.rikishiId
                ? currentRecordMap[rightSide.rikishiId]
                : undefined;
              const leftOpponent = getMatchSide(match, rightSideKey);
              const rightOpponent = getMatchSide(match, leftSideKey);
              const leftKinboshi = showResults &&
                !!leftSide?.win &&
                isKinboshiWin({
                  winnerRank: leftSide?.rank,
                  opponentRank: leftOpponent?.rank,
                  winnerDivision: torikumi.division,
                });
              const rightKinboshi = showResults &&
                !!rightSide?.win &&
                isKinboshiWin({
                  winnerRank: rightSide?.rank,
                  opponentRank: rightOpponent?.rank,
                  winnerDivision: torikumi.division,
                });
              const leftRecordLabel = leftRecord
                ? formatRecordLabel(leftRecord.wins, leftRecord.losses, leftRecord.absences)
                : undefined;
              const rightRecordLabel = rightRecord
                ? formatRecordLabel(rightRecord.wins, rightRecord.losses, rightRecord.absences)
                : undefined;

              return (
                <article
                  key={`${match.day ?? torikumi.day}-${match.matchNo ?? index}`}
                  className={`group grid grid-cols-[1fr_auto_1fr] items-center gap-1 px-4 py-2 transition sm:gap-1.5 sm:px-5 ${
                    hasFavorite ? "bg-[color:var(--accent-soft)]/60" : ""
                  } ${hasMatchDetails ? "cursor-pointer hover:bg-[color:var(--accent-soft)]/40" : ""}`}
                  role={hasMatchDetails ? "button" : undefined}
                  tabIndex={hasMatchDetails ? 0 : undefined}
                  onClick={hasMatchDetails ? () => setSelectedMatch(match) : undefined}
                  onKeyDown={
                    hasMatchDetails
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedMatch(match);
                          }
                        }
                      : undefined
                  }
                  title={hasMatchDetails ? "Open match details" : undefined}
                >
                  <div className="grid min-w-0 grid-cols-[auto_auto_10rem_2.75rem] items-center justify-start gap-2 sm:grid-cols-[auto_auto_12.5rem_3.25rem] sm:gap-2">
                    <TorikumiFavoriteButton
                      active={leftFavorite}
                      onClick={() => {
                        if (!leftSide?.rikishiId) {
                          return;
                        }

                        onToggleFavorite({
                          id: leftSide.rikishiId,
                          shikona:
                            getDisplayShikona(leftSide.shikona) ||
                            leftSide.shikonaEn ||
                            String(leftSide.rikishiId),
                          shikonaEn: leftSide.shikonaEn,
                          rank: leftSide.rank,
                          division: torikumi.division,
                        });
                      }}
                      title={
                        leftSide?.shikonaEn
                          ? `${leftFavorite ? "Remove favorite" : "Add favorite"}: ${leftSide.shikonaEn}`
                          : leftFavorite
                            ? "Remove favorite"
                            : "Add favorite"
                      }
                    />
                    <WinnerMark
                      active={leftSide?.win}
                      kinboshi={leftKinboshi}
                      showResults={showResults}
                    />
                    <div className="w-[10rem] overflow-hidden sm:w-[12.5rem]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (leftSide?.rikishiId) {
                            onSelectRikishi(leftSide.rikishiId);
                          }
                        }}
                        className="block w-full text-left"
                        title={leftSide?.shikonaEn ? `Open rikishi details: ${leftSide.shikonaEn}` : "Open rikishi details"}
                      >
                        <VerticalName
                          primary={getVisibleShikona(leftSide?.shikona, leftSide?.shikonaEn, nameMode)}
                          secondary={leftSide?.shikonaEn}
                          emphasized={showResults && !!leftSide?.win}
                        />
                      </button>
                    </div>
                    <RecordSlot
                      align="right"
                      showResults={showResults}
                      recordLabel={leftRecordLabel}
                    />
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex w-full min-w-[13rem] items-center justify-center gap-3 text-[12px] text-[color:var(--ink-soft)] sm:min-w-[17rem]">
                      <span className="min-w-0 flex-1 truncate text-right" title={leftSide?.rank}>
                        {formatRankLabel(leftSide?.rank)}
                      </span>
                      <span
                        className="fine-label data-sans shrink-0 text-[13px] uppercase text-[color:var(--ink-soft)]"
                        title="Bout number"
                      >
                        {String(match.matchNo ?? index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-left" title={rightSide?.rank}>
                        {formatRankLabel(rightSide?.rank)}
                      </span>
                    </div>
                    <div
                      className="hover-hint max-w-24 text-center text-[14px] leading-4 text-[color:var(--ink-soft)]"
                      title={match.kimarite ? `Winning technique: ${match.kimarite}` : "Scheduled bout"}
                    >
                      {match.kimarite ?? "予定"}
                    </div>
                    <div className="flex w-full justify-between">
                      <MatchIdentityDebug
                        id={leftSide?.rikishiId}
                        matchedById={leftSide?.matchedById}
                      />
                      <MatchIdentityDebug
                        id={rightSide?.rikishiId}
                        matchedById={rightSide?.matchedById}
                      />
                    </div>
                  </div>

                  <div className="grid w-full min-w-0 grid-cols-[2.75rem_10rem_auto_auto] items-center justify-end gap-2 sm:grid-cols-[3.25rem_12.5rem_auto_auto] sm:gap-2">
                    <RecordSlot
                      align="left"
                      showResults={showResults}
                      recordLabel={rightRecordLabel}
                    />
                    <div className="w-[10rem] overflow-hidden sm:w-[12.5rem]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (rightSide?.rikishiId) {
                            onSelectRikishi(rightSide.rikishiId);
                          }
                        }}
                        className="block w-full text-right"
                        title={rightSide?.shikonaEn ? `Open rikishi details: ${rightSide.shikonaEn}` : "Open rikishi details"}
                      >
                        <VerticalName
                          primary={getVisibleShikona(rightSide?.shikona, rightSide?.shikonaEn, nameMode)}
                          secondary={rightSide?.shikonaEn}
                          emphasized={showResults && !!rightSide?.win}
                          reverse
                        />
                      </button>
                    </div>
                    <WinnerMark
                      active={rightSide?.win}
                      kinboshi={rightKinboshi}
                      showResults={showResults}
                    />
                    <TorikumiFavoriteButton
                      active={rightFavorite}
                      onClick={() => {
                        if (!rightSide?.rikishiId) {
                          return;
                        }

                        onToggleFavorite({
                          id: rightSide.rikishiId,
                          shikona:
                            getDisplayShikona(rightSide.shikona) ||
                            rightSide.shikonaEn ||
                            String(rightSide.rikishiId),
                          shikonaEn: rightSide.shikonaEn,
                          rank: rightSide.rank,
                          division: torikumi.division,
                        });
                      }}
                      title={
                        rightSide?.shikonaEn
                          ? `${rightFavorite ? "Remove favorite" : "Add favorite"}: ${rightSide.shikonaEn}`
                          : rightFavorite
                            ? "Remove favorite"
                            : "Add favorite"
                      }
                    />
                  </div>
                </article>
              );
            })()
          ))}
        </div>
      </section>
      {selectedMatch ? (
        <MatchDialog
          match={selectedMatch}
          nameMode={nameMode}
          currentRecordMap={currentRecordMap}
          onClose={() => setSelectedMatch(null)}
        />
      ) : null}
    </>
  );
}
