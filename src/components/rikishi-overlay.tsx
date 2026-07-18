"use client";

import { CurrentBashoRecord, RikishiSummary } from "@/lib/types";
import {
  formatRecordLabel,
  getDisplayShikona,
  getDivisionLabel,
  isKinboshiWin,
} from "@/lib/sumo-api";

type RikishiOverlayProps = {
  rikishi: RikishiSummary;
  record?: CurrentBashoRecord;
  currentRecordMap: Record<number, CurrentBashoRecord>;
  nameMode: "jp" | "en";
  onClose: () => void;
};

function KinboshiStar() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6.5 w-6.5 drop-shadow-[0_0_4px_rgba(255,208,64,0.6)]"
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

function getVisibleShikona(rikishi: RikishiSummary, nameMode: "jp" | "en") {
  if (nameMode === "en") {
    return rikishi.shikonaEn ?? getDisplayShikona(rikishi.shikona);
  }

  return getDisplayShikona(rikishi.shikona) || rikishi.shikonaEn || String(rikishi.id);
}

function getOpponentResultLabel(result?: string, kinboshi = false) {
  if (kinboshi && (result ?? "").toLowerCase() === "win") {
    return "";
  }

  switch ((result ?? "").toLowerCase()) {
    case "win":
      return "○";
    case "loss":
      return "●";
    case "absent":
      return "休";
    default:
      return "予定";
  }
}

function getOpponentResultClass(result?: string, kinboshi = false) {
  if (kinboshi && (result ?? "").toLowerCase() === "win") {
    return "border-transparent bg-transparent text-transparent";
  }

  switch ((result ?? "").toLowerCase()) {
    case "win":
      return "border-[color:var(--ink)] bg-white text-transparent";
    case "loss":
      return "border-[color:var(--ink)] bg-[color:var(--ink)] text-transparent";
    case "absent":
      return "border-[color:var(--line-strong)] bg-transparent text-[color:var(--ink-soft)]";
    default:
      return "border-[color:var(--line-strong)] bg-transparent text-[color:var(--ink-soft)]";
  }
}

export function RikishiOverlay({
  rikishi,
  record,
  currentRecordMap,
  nameMode,
  onClose,
}: RikishiOverlayProps) {
  const displayName = getVisibleShikona(rikishi, nameMode);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(33,25,21,0.52)] px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="texture-panel max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[8px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Rikishi details">
                力士詳細
              </div>
              <h2 className="mt-2 text-3xl sm:text-4xl" title={rikishi.shikonaEn}>
                {getDisplayShikona(rikishi.shikona) || displayName}
                {rikishi.shikonaEn ? ` - ${rikishi.shikonaEn}` : ""}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              title="Close rikishi details"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="section-frame p-5">
              <div className="section-accent" />
              <div className="fine-label text-base text-[color:var(--ink-soft)]" title="Rikishi information">
                力士情報
              </div>
              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Rank">
                    番付
                  </dt>
                  <dd className="text-right text-lg">{record?.rank ?? rikishi.rank ?? "未詳"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Division">
                    部屋別
                  </dt>
                  <dd className="text-right text-lg">{getDivisionLabel(record?.division ?? rikishi.division)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Stable">
                    部屋
                  </dt>
                  <dd className="text-right text-lg">{record?.heya ?? rikishi.heya ?? "未詳"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Current tournament record">
                    星取
                  </dt>
                  <dd className="data-sans text-right text-2xl">
                    {record
                      ? formatRecordLabel(record.wins, record.losses, record.absences)
                      : "未詳"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="section-frame p-5">
              <div className="section-accent" />
              <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Current basho results">
                本場所成績
              </div>
              {!record || record.opponents.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--ink-soft)]" title="No current basho opponent results available.">
                  記録なし
                </p>
              ) : (
                <div className="mt-4 divide-y divide-[color:var(--line)]">
                  {record.opponents.map((opponent, index) => {
                    const opponentRecord = opponent.opponentID
                      ? currentRecordMap[opponent.opponentID]
                      : undefined;
                    const kinboshi = isKinboshiWin({
                      winnerRank: record.rank,
                      opponentRank: opponentRecord?.rank,
                      winnerDivision: record.division,
                    }) && (opponent.result ?? "").toLowerCase() === "win";
                    const opponentName =
                      nameMode === "en"
                        ? opponent.opponentShikonaEn ??
                          getDisplayShikona(opponent.opponentShikonaJp) ??
                          "TBD"
                        : getDisplayShikona(opponent.opponentShikonaJp) ||
                          opponent.opponentShikonaEn ||
                          "未定";

                    return (
                      <article
                        key={`${opponent.opponentID ?? "unknown"}-${index}`}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
                      >
                        <div
                          className={`fine-label flex ${kinboshi ? "h-7 w-7" : "h-6 w-6"} items-center justify-center rounded-full border text-[13px] ${getOpponentResultClass(opponent.result, kinboshi)}`}
                          title={
                            kinboshi
                              ? "Kinboshi: gold star win over Yokozuna"
                              : `Result: ${opponent.result ?? "scheduled"}`
                          }
                        >
                          {kinboshi ? (
                            <KinboshiStar />
                          ) : (
                            getOpponentResultLabel(opponent.result, kinboshi)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-lg" title={opponent.opponentShikonaEn}>
                            {opponentName}
                          </div>
                          <div
                            className="data-sans mt-1 truncate text-sm text-[color:var(--ink-soft)]"
                            title={
                              opponent.kimarite
                                ? `Winning technique: ${opponent.kimarite}`
                                : "No kimarite recorded"
                            }
                          >
                            {opponent.kimarite || "予定"}
                          </div>
                        </div>
                        <div className="data-sans text-sm text-[color:var(--ink-soft)]">
                          {index + 1}日
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}
