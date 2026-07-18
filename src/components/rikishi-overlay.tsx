"use client";

import { useEffect, useState } from "react";
import { CurrentBashoRecord, RikishiSummary } from "@/lib/types";
import {
  fetchRikishi,
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
  showResults: boolean;
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
      return "border-[color:var(--ink)] bg-[color:var(--loss-mark)] text-transparent";
    case "absent":
      return "border-[color:var(--line-strong)] bg-transparent text-[color:var(--ink-soft)]";
    default:
      return "border-[color:var(--line-strong)] bg-transparent text-[color:var(--ink-soft)]";
  }
}

function formatCentimeters(value?: number) {
  return value === undefined ? "未詳" : `${value} cm`;
}

function formatKilograms(value?: number) {
  return value === undefined ? "未詳" : `${value} kg`;
}

function formatDebut(value?: string) {
  if (!value) {
    return "未詳";
  }

  const match = value.match(/^(\d{4})(\d{2})$/);
  if (!match) {
    return value;
  }

  const [, year, month] = match;
  return `${year}年${Number(month)}月場所`;
}

function calculateAge(birthDate?: string, now = new Date()) {
  if (!birthDate) {
    return undefined;
  }

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return undefined;
  }

  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

function formatAge(birthDate?: string) {
  const age = calculateAge(birthDate);
  return age === undefined ? "未詳" : String(age);
}

function getJsaProfileUrl(nskId?: number) {
  return nskId === undefined
    ? undefined
    : `https://sumo.or.jp/EnSumoDataRikishi/profile/${nskId}/`;
}

function getSumoDbProfileUrl(sumoDbId?: number) {
  return sumoDbId === undefined
    ? undefined
    : `https://sumodb.sumogames.de/Rikishi.aspx?r=${sumoDbId}`;
}

export function RikishiOverlay({
  rikishi,
  record,
  currentRecordMap,
  nameMode,
  showResults,
  onClose,
}: RikishiOverlayProps) {
  const [detail, setDetail] = useState<RikishiSummary | null>(null);

  useEffect(() => {
    let isCurrent = true;

    fetchRikishi(rikishi.id)
      .then((response) => {
        if (isCurrent) {
          setDetail(response);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setDetail(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [rikishi.id]);

  const rikishiDetail = detail?.id === rikishi.id ? { ...rikishi, ...detail } : rikishi;
  const displayName = getVisibleShikona(rikishiDetail, nameMode);
  const jsaProfileUrl = getJsaProfileUrl(rikishiDetail.nskId);
  const sumoDbProfileUrl = getSumoDbProfileUrl(rikishiDetail.sumoDbId);

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
              <h2 className="mt-2 text-3xl sm:text-4xl" title={rikishiDetail.shikonaEn}>
                {getDisplayShikona(rikishiDetail.shikona) || displayName}
                {rikishiDetail.shikonaEn ? ` - ${rikishiDetail.shikonaEn}` : ""}
              </h2>
              {jsaProfileUrl || sumoDbProfileUrl ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {jsaProfileUrl ? (
                    <a
                      href={jsaProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="fine-label inline-flex rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      title="Open Japan Sumo Association rikishi profile"
                    >
                      協会プロフィール
                    </a>
                  ) : null}
                  {sumoDbProfileUrl ? (
                    <a
                      href={sumoDbProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="fine-label inline-flex rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      title="Open Sumo DB rikishi profile"
                    >
                      Sumo DB
                    </a>
                  ) : null}
                </div>
              ) : null}
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
                  <dd className="text-right text-lg">
                    {record?.rank ?? rikishiDetail.currentRank ?? rikishiDetail.rank ?? "未詳"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Division">
                    部屋別
                  </dt>
                  <dd className="text-right text-lg">
                    {getDivisionLabel(record?.division ?? rikishiDetail.division)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Stable">
                    部屋
                  </dt>
                  <dd className="text-right text-lg">{record?.heya ?? rikishiDetail.heya ?? "未詳"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Age">
                    年齢
                  </dt>
                  <dd className="data-sans text-right text-lg">
                    {formatAge(rikishiDetail.birthDate)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Height">
                    身長
                  </dt>
                  <dd className="data-sans text-right text-lg">
                    {formatCentimeters(rikishiDetail.height)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Weight">
                    体重
                  </dt>
                  <dd className="data-sans text-right text-lg">
                    {formatKilograms(rikishiDetail.weight)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Debut">
                    初土俵
                  </dt>
                  <dd className="data-sans text-right text-lg">
                    {formatDebut(rikishiDetail.debut)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-lg text-[color:var(--ink-soft)]" title="Current tournament record">
                    星取
                  </dt>
                  <dd className="data-sans text-right text-2xl">
                    {showResults && record
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
                    const isCompleted = ["win", "loss", "absent"].includes(
                      (opponent.result ?? "").toLowerCase(),
                    );
                    const isResultHidden = !showResults && isCompleted;
                    const kinboshi = showResults && isKinboshiWin({
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
                        className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 ${
                          isResultHidden ? "text-[color:var(--ink-soft)] opacity-65" : ""
                        }`}
                      >
                        <div
                          className={`fine-label flex ${kinboshi ? "h-7 w-7" : "h-6 w-6"} items-center justify-center rounded-full border text-[13px] ${
                            isResultHidden
                              ? "border-[color:var(--line-strong)] bg-transparent text-[color:var(--ink-soft)]"
                              : getOpponentResultClass(opponent.result, kinboshi)
                          }`}
                          title={
                            isResultHidden
                              ? "Result hidden"
                              : kinboshi
                              ? "Kinboshi: gold star win over Yokozuna"
                              : `Result: ${opponent.result ?? "scheduled"}`
                          }
                        >
                          {isResultHidden ? (
                            "?"
                          ) : kinboshi ? (
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
                              isResultHidden
                                ? "Result hidden"
                                : opponent.kimarite
                                ? `Winning technique: ${opponent.kimarite}`
                                : "No kimarite recorded"
                            }
                          >
                            {isResultHidden ? "非表示" : opponent.kimarite || "予定"}
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
