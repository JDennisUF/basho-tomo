"use client";

import { BanzukeResponse, Division } from "@/lib/types";
import { formatRankLabel, getDisplayShikona, getDivisionLabel } from "@/lib/sumo-api";
import {
  getCharacterDictionaryUrl,
  getCharacterStudyLabel,
  splitJapaneseName,
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

function CharacterLink({ character }: { character: string }) {
  const label = getCharacterStudyLabel(character);

  return (
    <a
      href={getCharacterDictionaryUrl(character)}
      target="_blank"
      rel="noreferrer"
      className="data-sans inline-flex min-h-8 min-w-[5.75rem] items-center justify-center rounded-[6px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-2 text-center text-[12px] leading-tight text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
      title={`Open dictionary entry for ${character}`}
    >
      {label}
    </a>
  );
}

export function ShikonaStudyPanel({ banzuke, division }: ShikonaStudyPanelProps) {
  const rikishi = getStudyRikishi(banzuke);

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
          <h2 className="mt-1 text-3xl">{getDivisionLabel(division)}</h2>
        </div>
        <div className="data-sans text-sm text-[color:var(--ink-soft)]" title="Rikishi in division">
          {rikishi.length} rikishi
        </div>
      </div>

      {rikishi.length === 0 ? (
        <p className="px-4 py-5 text-sm text-[color:var(--ink-soft)] sm:px-5" title="No shikona available">
          記録なし
        </p>
      ) : (
        <div className="grid gap-px bg-[color:var(--line)] sm:grid-cols-2 xl:grid-cols-3">
          {rikishi.map((entry) => {
            const characters = splitJapaneseName(entry.shikonaJp);

            return (
              <article
                key={entry.id}
                className="bg-[color:var(--panel)] px-4 py-4 sm:px-5"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[color:var(--section-inner-line)] pb-3">
                  <div className="min-w-0">
                    <h3
                      className="truncate text-2xl leading-[1.2]"
                      title={entry.shikonaEn ?? entry.shikonaJp}
                    >
                      {entry.shikonaEn ?? entry.shikonaJp}
                    </h3>
                    <div
                      className="data-sans mt-1 truncate text-[13px] text-[color:var(--ink-soft)]"
                      title={entry.rank}
                    >
                      {formatRankLabel(entry.rank) || getDivisionLabel(division)}
                    </div>
                  </div>
                  <div
                    className="shrink-0 text-3xl leading-none [writing-mode:vertical-rl]"
                    title={entry.shikonaJp}
                  >
                    {entry.shikonaJp}
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <div
                    className="grid shrink-0 gap-2 text-center text-3xl leading-none"
                    aria-label={`${entry.shikonaJp} characters`}
                  >
                    {characters.map((character, index) => (
                      <span key={`${entry.id}-${character}-${index}`}>{character}</span>
                    ))}
                  </div>
                  <div className="grid min-w-0 gap-2">
                    {characters.map((character, index) => (
                      <CharacterLink
                        key={`${entry.id}-${character}-meaning-${index}`}
                        character={character}
                      />
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
