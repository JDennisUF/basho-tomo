"use client";

import { useMemo, useState } from "react";
import { BanzukeResponse, Division } from "@/lib/types";
import { formatRankLabel, getDisplayShikona, getDivisionLabel } from "@/lib/sumo-api";
import {
  getShikonaStudyUnits,
  ShikonaStudyUnit,
} from "@/lib/shikona-characters";

type ShikonaStudyPanelProps = {
  banzuke: BanzukeResponse | null;
  division: Division;
};

type StudyRikishi = {
  id: number;
  shikonaJp: string;
  shikonaEn?: string;
  rank?: string;
};

function getStudyRikishi(banzuke: BanzukeResponse | null) {
  if (!banzuke) {
    return [];
  }

  const seen = new Set<number>();
  const entries: StudyRikishi[] = [];

  for (const record of banzuke.records) {
    for (const side of [record.east, record.west]) {
      if (!side?.rikishiID || seen.has(side.rikishiID)) {
        continue;
      }

      const shikonaJp = getDisplayShikona(side.shikonaJp) || side.shikonaEn || "";
      if (!shikonaJp) {
        continue;
      }

      seen.add(side.rikishiID);
      entries.push({
        id: side.rikishiID,
        shikonaJp,
        shikonaEn: side.shikonaEn,
        rank: side.rank,
      });
    }
  }

  return entries;
}

function StudyLink({ unit }: { unit: ShikonaStudyUnit }) {
  return (
    <a
      href={unit.dictionaryUrl}
      target="_blank"
      rel="noreferrer"
      className="data-sans inline-flex min-h-8 min-w-[5.75rem] items-center justify-center rounded-[6px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-2 text-center text-[12px] leading-tight text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
      title={`Open dictionary entry for ${unit.text}`}
    >
      {unit.label}
    </a>
  );
}

export function ShikonaStudyPanel({ banzuke, division }: ShikonaStudyPanelProps) {
  const rikishi = getStudyRikishi(banzuke);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRikishi = useMemo(() => {
    if (!normalizedQuery) {
      return rikishi;
    }

    return rikishi.filter((entry) => {
      const jp = entry.shikonaJp.toLowerCase();
      const en = (entry.shikonaEn ?? "").toLowerCase();
      return jp.includes(normalizedQuery) || en.includes(normalizedQuery);
    });
  }, [normalizedQuery, rikishi]);

  if (!banzuke) {
    return (
      <section className="section-frame p-6">
        <div className="section-accent" />
        <div
          className="fine-label text-xs text-[color:var(--ink-soft)]"
          title="Loading shikona study"
        >
          四股名 読込中
        </div>
      </section>
    );
  }

  return (
    <section className="section-frame overflow-hidden">
      <div className="section-accent" />
      <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Shikona study">
            四股名
          </div>
          <h2 className="mt-1 text-3xl">Shikona Study</h2>
          <p className="data-sans mt-1 text-sm text-[color:var(--ink-soft)]">
            {getDivisionLabel(division)}
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2 sm:items-end">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="四股名 / shikona"
            className="data-sans w-full rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base outline-none placeholder:text-[color:var(--ink-soft)]/70 focus:border-[color:var(--accent)]"
          />
          <div className="data-sans text-sm text-[color:var(--ink-soft)]" title="Rikishi in division">
            {filteredRikishi.length} rikishi
          </div>
        </div>
      </div>

      {filteredRikishi.length === 0 ? (
        <p className="px-4 py-5 text-sm text-[color:var(--ink-soft)] sm:px-5" title="No shikona available">
          {normalizedQuery ? "一致なし" : "記録なし"}
        </p>
      ) : (
        <div className="grid gap-px bg-[color:var(--line)] sm:grid-cols-2 xl:grid-cols-3">
          {filteredRikishi.map((entry) => {
            const units = getShikonaStudyUnits(entry.shikonaJp);

            return (
              <article
                key={entry.id}
                className="bg-[color:var(--panel)] px-4 py-4 sm:px-5"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0">
                    {entry.shikonaEn ? (
                      <h3
                        className="truncate pb-1 text-2xl leading-[1.35]"
                        title={entry.shikonaEn}
                      >
                        {entry.shikonaEn}
                      </h3>
                    ) : null}
                    <div
                      className={`data-sans truncate text-[13px] text-[color:var(--ink-soft)] ${
                        entry.shikonaEn ? "mt-1" : ""
                      }`}
                      title={entry.rank}
                    >
                      {formatRankLabel(entry.rank) || getDivisionLabel(division)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right text-3xl leading-[1.25]" title={entry.shikonaJp}>
                    {entry.shikonaJp}
                  </div>
                </div>

                <div
                  className="mt-3 grid gap-2 border-t border-[color:var(--section-inner-line)] pt-3"
                  aria-label={`${entry.shikonaJp} kanji meanings`}
                >
                  {units.map((unit, index) => (
                    <div
                      key={`${entry.id}-${unit.text}-${index}`}
                      className="grid grid-cols-[minmax(2rem,auto)_minmax(5.75rem,auto)] items-center justify-start gap-2"
                    >
                      <span className="text-center text-3xl leading-none">{unit.text}</span>
                      <StudyLink unit={unit} />
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
