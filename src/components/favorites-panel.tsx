"use client";

import { useMemo, useState } from "react";
import { RikishiSummary } from "@/lib/types";
import { getDivisionLabel, getDisplayShikona } from "@/lib/sumo-api";

type FavoritesPanelProps = {
  favorites: RikishiSummary[];
  favoriteIds: number[];
  rikishiIndex: RikishiSummary[];
  nameMode: "jp" | "en";
  onToggle: (rikishi: RikishiSummary) => void;
  onSelect: (rikishiId: number) => void;
};

export function FavoritesPanel({
  favorites,
  favoriteIds,
  rikishiIndex,
  nameMode,
  onToggle,
  onSelect,
}: FavoritesPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredRikishi = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const sorted = [...rikishiIndex].sort((left, right) =>
      getDisplayShikona(left.shikona).localeCompare(getDisplayShikona(right.shikona), "ja"),
    );

    if (!normalized) {
      return sorted.slice(0, 120);
    }

    return sorted
      .filter((rikishi) => {
        const jp = getDisplayShikona(rikishi.shikona).toLowerCase();
        const en = (rikishi.shikonaEn ?? "").toLowerCase();
        return jp.includes(normalized) || en.includes(normalized);
      })
      .slice(0, 120);
  }, [query, rikishiIndex]);

  function getRikishiMetaTitle(rikishi: RikishiSummary) {
    const rank = rikishi.rank ?? "Rank unavailable";
    const division = rikishi.division;
    return `${rank} / ${division}`;
  }

  function getVisibleShikona(rikishi: RikishiSummary) {
    if (nameMode === "en") {
      return rikishi.shikonaEn ?? getDisplayShikona(rikishi.shikona);
    }

    return getDisplayShikona(rikishi.shikona) || rikishi.shikonaEn || String(rikishi.id);
  }

  return (
    <>
      <section className="section-frame p-5 sm:p-6">
        <div className="section-accent" />
        <div className="flex items-end justify-between gap-4 border-b border-[color:var(--line)] pb-4">
          <div>
            <div className="fine-label text-base text-[color:var(--ink-soft)]" title="Favorites">
              贔屓
            </div>
            <h2 className="mt-2 text-[34px] leading-none" title="Favorite rikishi">
              気になる力士
            </h2>
          </div>
          <div className="text-right">
            <div className="data-sans text-base text-[color:var(--ink-soft)]" title="Favorite rikishi">
              {favoriteIds.length} 名
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="fine-label mt-2 rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              title="Manage favorite rikishi"
            >
              選択
            </button>
          </div>
        </div>

        {favorites.length === 0 ? (
          <p
            className="mt-4 text-sm text-[color:var(--ink-soft)]"
            title="No favorites yet. Add rikishi from the banzuke, torikumi, or search here."
          >
            まだ登録なし。番付か取組から選ぶか、ここで直接探せます。
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {favorites.map((rikishi) => (
              <li
                key={rikishi.id}
                className="flex items-center justify-between border-b border-[color:var(--line)] pb-2"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(rikishi.id)}
                    className="max-w-full truncate text-left text-xl transition hover:text-[color:var(--accent)]"
                    title={rikishi.shikonaEn ? `Open rikishi details: ${rikishi.shikonaEn}` : "Open rikishi details"}
                  >
                    {getVisibleShikona(rikishi)}
                  </button>
                  <div
                    className="data-sans mt-0.5 text-[15px] text-[color:var(--ink-soft)]"
                    title={getRikishiMetaTitle(rikishi)}
                  >
                    {rikishi.rank ?? "番付未詳"} / {getDivisionLabel(rikishi.division)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(rikishi)}
                  className="fine-label rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  title={rikishi.shikonaEn ? `Remove favorite: ${rikishi.shikonaEn}` : "Remove favorite"}
                >
                  外す
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(33,25,21,0.45)] px-4 py-8 sm:items-center">
          <div className="section-frame max-h-[min(80vh,720px)] w-full max-w-2xl overflow-hidden">
            <div className="section-accent" />
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4">
              <div>
                <div className="fine-label text-sm text-[color:var(--ink-soft)]" title="Favorites selection">
                  贔屓選択
                </div>
                <h3 className="mt-2 text-3xl leading-none" title="Find rikishi">
                  力士を探す
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="fine-label rounded-[6px] border border-[color:var(--line)] px-3 py-1.5 text-xs text-[color:var(--ink-soft)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                title="Close favorites dialog"
              >
                閉じる
              </button>
            </div>

            <div className="border-b border-[color:var(--line)] px-5 py-4">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="四股名 / shikona"
                className="data-sans w-full rounded-[8px] border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-base outline-none placeholder:text-[color:var(--ink-soft)]/70 focus:border-[color:var(--accent)]"
              />
            </div>

            <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
              <ul className="space-y-2">
                {filteredRikishi.map((rikishi) => {
                  const active = favoriteIds.includes(rikishi.id);

                  return (
                    <li
                      key={rikishi.id}
                      className={`flex items-center justify-between gap-3 border-b border-[color:var(--line)] pb-2 ${
                        active ? "text-[color:var(--accent)]" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className="truncate text-xl"
                          title={rikishi.shikonaEn ?? "English shikona unavailable"}
                        >
                          {getVisibleShikona(rikishi)}
                        </div>
                        <div
                          className="data-sans mt-0.5 truncate text-[14px] text-[color:var(--ink-soft)]"
                          title={getRikishiMetaTitle(rikishi)}
                        >
                          {(rikishi.shikonaEn ?? "English unavailable")} /{" "}
                          {rikishi.rank ?? "番付未詳"} / {getDivisionLabel(rikishi.division)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggle(rikishi)}
                        className={`fine-label inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm leading-none transition ${
                          active
                            ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                            : "border-[color:var(--line)] text-[color:var(--ink-soft)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                        }`}
                        title={
                          rikishi.shikonaEn
                            ? `${active ? "Remove favorite" : "Add favorite"}: ${rikishi.shikonaEn}`
                            : active
                              ? "Remove favorite"
                              : "Add favorite"
                        }
                        aria-pressed={active}
                      >
                        ♡
                      </button>
                    </li>
                  );
                })}
              </ul>

              {filteredRikishi.length === 0 ? (
                <p className="pt-2 text-sm text-[color:var(--ink-soft)]" title="No matching rikishi found.">
                  一致する力士なし。
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
