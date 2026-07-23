"use client";

import { useMemo, useState } from "react";
import { formatRankLabel, getDisplayShikona, getDivisionLabel } from "@/lib/sumo-api";
import { Division, RikishiSummary } from "@/lib/types";

type ShikonaSearchPanelProps = {
  rikishi: RikishiSummary[];
  onOpenTorikumi: (division: Division) => void;
  onSelectRikishi: (rikishiId: number) => void;
};

const DIVISION_ORDER: Record<Division, number> = {
  Makuuchi: 0,
  Juryo: 1,
  Makushita: 2,
  Sandanme: 3,
  Jonidan: 4,
  Jonokuchi: 5,
};

function getVisibleKanji(rikishi: RikishiSummary) {
  return getDisplayShikona(rikishi.shikona) || rikishi.shikonaEn || String(rikishi.id);
}

export function ShikonaSearchPanel({
  rikishi,
  onOpenTorikumi,
  onSelectRikishi,
}: ShikonaSearchPanelProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return [...rikishi]
      .filter((entry) => {
        const kanji = getVisibleKanji(entry).toLowerCase();
        const english = (entry.shikonaEn ?? "").toLowerCase();
        return kanji.includes(normalizedQuery) || english.includes(normalizedQuery);
      })
      .sort((left, right) => {
        const divisionDiff = DIVISION_ORDER[left.division] - DIVISION_ORDER[right.division];
        if (divisionDiff !== 0) {
          return divisionDiff;
        }

        return getVisibleKanji(left).localeCompare(getVisibleKanji(right), "ja");
      });
  }, [normalizedQuery, rikishi]);

  return (
    <section className="section-frame overflow-hidden">
      <div className="section-accent" />
      <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
        <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Shikona search">
          四股名検索
        </div>
        <h2 className="text-3xl">Shikona Search</h2>
        <p className="data-sans text-sm text-[color:var(--ink-soft)]">
          Search kanji and English across all divisions.
        </p>
      </div>

      <div className="border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="四股名 / shikona"
          className="data-sans w-full rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base outline-none placeholder:text-[color:var(--ink-soft)]/70 focus:border-[color:var(--accent)]"
        />
      </div>

      {!normalizedQuery ? (
        <p className="px-4 py-5 text-sm text-[color:var(--ink-soft)] sm:px-5">
          Enter part of a kanji or English shikona to search.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-5 text-sm text-[color:var(--ink-soft)] sm:px-5">
          No matching rikishi found.
        </p>
      ) : (
        <div className="grid gap-px bg-[color:var(--line)]">
          {results.map((entry) => (
            <article key={entry.id} className="bg-[color:var(--panel)] px-4 py-4 sm:px-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectRikishi(entry.id)}
                    className="max-w-full truncate text-left text-2xl transition hover:text-[color:var(--accent)]"
                    title={entry.shikonaEn ? `Open rikishi details: ${entry.shikonaEn}` : "Open rikishi details"}
                  >
                    {getVisibleKanji(entry)}
                  </button>
                  <div className="data-sans mt-1 truncate text-sm text-[color:var(--ink-soft)]">
                    {entry.shikonaEn ?? "English unavailable"}
                  </div>
                  <div
                    className="data-sans mt-1 truncate text-[13px] text-[color:var(--ink-soft)]"
                    title={`${entry.rank ?? entry.division} / ${entry.division}`}
                  >
                    {formatRankLabel(entry.rank) || getDivisionLabel(entry.division)} /{" "}
                    {getDivisionLabel(entry.division)} {entry.division}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenTorikumi(entry.division)}
                  className="fine-label inline-flex h-10 items-center justify-center rounded-[6px] border border-[color:var(--line)] px-3 text-sm text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  title={`Open torikumi for ${entry.division}`}
                >
                  View Torikumi
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
