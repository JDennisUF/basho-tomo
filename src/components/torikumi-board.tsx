"use client";

import { TorikumiResponse } from "@/lib/types";
import { VerticalName } from "@/components/vertical-name";

type TorikumiBoardProps = {
  torikumi: TorikumiResponse | null;
  isLoading: boolean;
  error: string | null;
};

function WinnerMark({ active }: { active?: boolean }) {
  return (
    <span
      className={`h-6 w-6 rounded-full border text-center text-[11px] leading-6 ${
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
          : "border-[color:var(--line)] text-[color:var(--line-strong)]"
      }`}
      title={active ? "Winner mark" : "No winner mark"}
    >
      勝
    </span>
  );
}

export function TorikumiBoard({ torikumi, isLoading, error }: TorikumiBoardProps) {
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
        <div className="fine-label text-xs text-[color:var(--ink-soft)]" title="Today's torikumi">
          本日取組
        </div>
      </div>
      <div className="divide-y divide-[color:var(--line)]">
        {torikumi.matches.map((match, index) => (
          <article
            key={`${match.day ?? torikumi.day}-${match.matchNo ?? index}`}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 sm:px-4"
          >
            <div className="flex items-center justify-start gap-2">
              <WinnerMark active={match.west?.win} />
              <VerticalName
                primary={match.west?.shikona ?? "未定"}
                secondary={match.west?.shikonaEn}
                emphasized={match.west?.win}
              />
              <div>
                <div
                  className="fine-label data-sans text-[10px] uppercase text-[color:var(--ink-soft)]"
                  title="West"
                >
                  西
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--ink-soft)]" title={match.west?.shikonaEn}>
                  {match.west?.rank ?? ""}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <div
                className="fine-label data-sans text-[9px] uppercase text-[color:var(--ink-soft)]"
                title="Bout number"
              >
                {String(match.matchNo ?? index + 1).padStart(2, "0")}
              </div>
              <div
                className="hover-hint max-w-16 text-center text-[11px] leading-4 text-[color:var(--ink-soft)]"
                title={match.kimarite ? `Winning technique: ${match.kimarite}` : "Scheduled bout"}
              >
                {match.kimarite ?? "予定"}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <div className="text-right">
                <div
                  className="fine-label data-sans text-[10px] uppercase text-[color:var(--ink-soft)]"
                  title="East"
                >
                  東
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--ink-soft)]" title={match.east?.shikonaEn}>
                  {match.east?.rank ?? ""}
                </div>
              </div>
              <VerticalName
                primary={match.east?.shikona ?? "未定"}
                secondary={match.east?.shikonaEn}
                emphasized={match.east?.win}
              />
              <WinnerMark active={match.east?.win} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
