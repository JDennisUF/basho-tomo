"use client";

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

  return (
    <section className="section-frame overflow-hidden">
      <div className="section-accent" />
      <div className="flex flex-col gap-2 border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
        <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Sumo terms">
          相撲用語
        </div>
        <h2 className="text-3xl">Common Terms</h2>
        <p className="data-sans text-sm text-[color:var(--ink-soft)]">
          Kanji and English for the terms used around the dohyo.
        </p>
      </div>

      <div className="grid gap-px bg-[color:var(--line)] md:grid-cols-2">
        {terms.map((term) => (
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
    </section>
  );
}
