"use client";

import { TorikumiResponse } from "@/lib/types";
import { VerticalName } from "@/components/vertical-name";
import { formatRankLabel, getDisplayShikona } from "@/lib/sumo-api";

type TorikumiBoardProps = {
  torikumi: TorikumiResponse | null;
  isLoading: boolean;
  error: string | null;
  nameMode: "jp" | "en";
};

function WinnerMark({ active }: { active?: boolean }) {
  return (
    <span
      className={`h-5 w-5 rounded-full border ${
        active
          ? "border-[color:var(--ink)] bg-white"
          : "border-[color:var(--ink)] bg-[color:var(--ink)]"
      }`}
      title={active ? "Winner: white circle" : "Loser: black circle"}
    />
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

export function TorikumiBoard({
  torikumi,
  isLoading,
  error,
  nameMode,
}: TorikumiBoardProps) {
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
    <section className="section-frame overflow-hidden">
      <div className="section-accent" />
      <div className="border-b border-[color:var(--line)] px-4 py-3 sm:px-5">
        <div className="fine-label text-xl text-[color:var(--ink-soft)]" title="Today's torikumi">
          本日取組
        </div>
      </div>
      <div className="divide-y divide-[color:var(--line)]">
        {torikumi.matches.map((match, index) => (
          <article
            key={`${match.day ?? torikumi.day}-${match.matchNo ?? index}`}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 px-4 py-4 sm:px-5"
          >
            <div className="flex min-w-0 items-center justify-start gap-4">
              <WinnerMark active={match.west?.win} />
              <VerticalName
                primary={
                  nameMode === "jp"
                    ? getDisplayShikona(match.west?.shikona)
                    : (match.west?.shikonaEn ?? "")
                }
                secondary={match.west?.shikonaEn}
                emphasized={match.west?.win}
              />
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-5 text-[15px] text-[color:var(--ink-soft)]">
                <span className="max-w-28 truncate text-right" title={match.west?.rank}>
                  {formatRankLabel(match.west?.rank)}
                </span>
                <span
                  className="fine-label data-sans text-[13px] uppercase text-[color:var(--ink-soft)]"
                  title="Bout number"
                >
                  {String(match.matchNo ?? index + 1).padStart(2, "0")}
                </span>
                <span className="max-w-28 truncate text-left" title={match.east?.rank}>
                  {formatRankLabel(match.east?.rank)}
                </span>
              </div>
              <div
                className="hover-hint max-w-24 text-center text-[15px] leading-6 text-[color:var(--ink-soft)]"
                title={match.kimarite ? `Winning technique: ${match.kimarite}` : "Scheduled bout"}
              >
                {match.kimarite ?? "予定"}
              </div>
              <div className="flex w-full justify-between">
                <MatchIdentityDebug
                  id={match.west?.rikishiId}
                  matchedById={match.west?.matchedById}
                />
                <MatchIdentityDebug
                  id={match.east?.rikishiId}
                  matchedById={match.east?.matchedById}
                />
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-4">
              <VerticalName
                primary={
                  nameMode === "jp"
                    ? getDisplayShikona(match.east?.shikona)
                    : (match.east?.shikonaEn ?? "")
                }
                secondary={match.east?.shikonaEn}
                emphasized={match.east?.win}
                reverse
              />
              <WinnerMark active={match.east?.win} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
