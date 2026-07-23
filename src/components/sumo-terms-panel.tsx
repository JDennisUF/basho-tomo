"use client";

import { useMemo, useState } from "react";
import { listSumoTerms } from "@/lib/sumo-terms";

const CATEGORY_LABELS = {
  ring: "Ring",
  rank: "Ranks",
  kimarite: "Winning Techniques",
  record: "Records",
  ritual: "Ritual",
} as const;

export function SumoTermsPanel() {
  const terms = listSumoTerms();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTerms = useMemo(() => {
    if (!normalizedQuery) {
      return terms;
    }

    return terms.filter((term) => {
      const kanji = term.term.toLowerCase();
      const english = term.english.toLowerCase();
      const reading = term.reading.toLowerCase();
      return (
        kanji.includes(normalizedQuery) ||
        english.includes(normalizedQuery) ||
        reading.includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, terms]);

  return (
    <section className="section-frame overflow-hidden">
      <div className="section-accent" />
      <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Sumo terms">
          <div>相撲用語</div>
          <h2 className="mt-1 text-3xl text-[color:var(--ink)]">Common Terms</h2>
          <p className="data-sans mt-1 text-sm text-[color:var(--ink-soft)]">
            Kanji and English for the terms used around the dohyo.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2 sm:items-end">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="用語 / term"
            className="data-sans w-full rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base outline-none placeholder:text-[color:var(--ink-soft)]/70 focus:border-[color:var(--accent)]"
          />
          <div className="data-sans text-sm text-[color:var(--ink-soft)]" title="Matching terms">
            {filteredTerms.length} terms
          </div>
        </div>
      </div>

      {filteredTerms.length === 0 ? (
        <p className="px-4 py-5 text-sm text-[color:var(--ink-soft)] sm:px-5">
          {normalizedQuery ? "No matching terms found." : "No terms available."}
        </p>
      ) : (
        <div className="grid gap-px bg-[color:var(--line)] md:grid-cols-2">
          {filteredTerms.map((term) => (
          <article key={term.id} className="bg-[color:var(--panel)] px-4 py-4 sm:px-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <div className="fine-label text-xs text-[color:var(--ink-soft)]">
                  {CATEGORY_LABELS[term.category]}
                </div>
                <h3 className="mt-1 text-2xl leading-[1.35]">{term.english}</h3>
                <div className="data-sans mt-2 text-sm text-[color:var(--ink-soft)]">
                  {term.reading}
                </div>
              </div>

              <div className="shrink-0 text-right text-3xl leading-[1.25]" title={term.term}>
                {term.term}
              </div>
            </div>

            <div className="mt-3 border-t border-[color:var(--section-inner-line)] pt-3">
              <a
                href={term.dictionaryUrl}
                target="_blank"
                rel="noreferrer"
                className="data-sans inline-flex min-h-8 items-center justify-center rounded-[6px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-2 text-center text-[12px] leading-tight text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                title={`Open dictionary entry for ${term.term}`}
              >
                Jisho
              </a>
            </div>
          </article>
          ))}
        </div>
      )}
    </section>
  );
}
