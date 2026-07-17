"use client";

import { RikishiSummary } from "@/lib/types";
import { getDisplayShikona } from "@/lib/sumo-api";

type FavoritesPanelProps = {
  favorites: RikishiSummary[];
  favoriteIds: number[];
  onToggle: (id: number) => void;
};

export function FavoritesPanel({
  favorites,
  favoriteIds,
  onToggle,
}: FavoritesPanelProps) {
  return (
    <section className="section-frame p-5 sm:p-6">
      <div className="section-accent" />
      <div className="flex items-end justify-between gap-4 border-b border-[color:var(--line)] pb-4">
        <div>
          <div className="fine-label text-base text-[color:var(--ink-soft)]" title="Favorites">
            贔屓
          </div>
          <h2 className="mt-2 text-[34px] leading-none">気になる力士</h2>
        </div>
        <div className="data-sans text-base text-[color:var(--ink-soft)]" title="Favorite rikishi">
          {favoriteIds.length} 名
        </div>
      </div>

      {favorites.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
          まだ登録なし。番付から力士を選ぶと、ここに残ります。
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {favorites.map((rikishi) => (
            <li
              key={rikishi.id}
              className="flex items-center justify-between border-b border-[color:var(--line)] pb-2"
            >
              <div>
                <div className="text-xl">{getDisplayShikona(rikishi.shikona)}</div>
                <div className="data-sans mt-0.5 text-[15px] text-[color:var(--ink-soft)]">
                  {rikishi.rank ?? "番付未詳"} / {rikishi.division === "Makuuchi" ? "幕内" : "十両"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(rikishi.id)}
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
  );
}
