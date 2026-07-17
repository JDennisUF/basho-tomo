"use client";

import { BanzukeResponse, RikishiSummary } from "@/lib/types";
import { getDisplayShikona } from "@/lib/sumo-api";

type BanzukePanelProps = {
  banzuke: BanzukeResponse | null;
  favoriteIds: number[];
  onToggleFavorite: (rikishi: RikishiSummary) => void;
};

function FavoriteButton({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ? `Favorite rikishi: ${title}` : "Favorite rikishi"}
      className={`fine-label rounded-full border px-2 py-1 text-[10px] transition ${
        active
          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
          : "border-[color:var(--line)] text-[color:var(--ink-soft)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
      }`}
    >
      贔屓
    </button>
  );
}

export function BanzukePanel({
  banzuke,
  favoriteIds,
  onToggleFavorite,
}: BanzukePanelProps) {
  if (!banzuke) {
    return (
      <section className="section-frame p-6">
        <div className="section-accent" />
        <div className="fine-label text-xs text-[color:var(--ink-soft)]" title="Loading banzuke">
          番付 読込中
        </div>
      </section>
    );
  }

  return (
    <section className="section-frame overflow-hidden">
      <div className="section-accent" />
      <div className="border-b border-[color:var(--line)] px-4 py-3">
        <div className="fine-label text-xs text-[color:var(--ink-soft)]" title="Banzuke">
          番付
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr] border-b border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--ink-soft)]">
        <div title="West">西</div>
        <div className="text-right" title="East">
          東
        </div>
      </div>
      <div className="divide-y divide-[color:var(--line)]">
        {banzuke.records.map((record, index) => (
          <article
            key={`${record.east?.rikishiID ?? "e"}-${record.west?.rikishiID ?? "w"}-${index}`}
            className="grid grid-cols-[1fr_1fr] gap-3 px-3 py-2.5 sm:px-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base">
                  {getDisplayShikona(record.west?.shikonaJp) || record.west?.shikonaEn || "空位"}
                </div>
                <div className="data-sans mt-0.5 text-[11px] text-[color:var(--ink-soft)]">
                  {record.west?.rank ?? ""}
                </div>
              </div>
              {record.west?.rikishiID ? (
                <FavoriteButton
                  active={favoriteIds.includes(record.west.rikishiID)}
                  onClick={() =>
                    onToggleFavorite({
                      id: record.west?.rikishiID ?? 0,
                      shikona:
                        getDisplayShikona(record.west?.shikonaJp) ||
                        record.west?.shikonaEn ||
                        String(record.west?.rikishiID),
                      shikonaEn: record.west?.shikonaEn,
                      rank: record.west?.rank,
                      division: banzuke.division,
                    })
                  }
                  title={record.west.shikonaEn}
                />
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 text-right">
              {record.east?.rikishiID ? (
                <FavoriteButton
                  active={favoriteIds.includes(record.east.rikishiID)}
                  onClick={() =>
                    onToggleFavorite({
                      id: record.east?.rikishiID ?? 0,
                      shikona:
                        getDisplayShikona(record.east?.shikonaJp) ||
                        record.east?.shikonaEn ||
                        String(record.east?.rikishiID),
                      shikonaEn: record.east?.shikonaEn,
                      rank: record.east?.rank,
                      division: banzuke.division,
                    })
                  }
                  title={record.east.shikonaEn}
                />
              ) : null}
              <div>
                <div className="text-base">
                  {getDisplayShikona(record.east?.shikonaJp) || record.east?.shikonaEn || "空位"}
                </div>
                <div className="data-sans mt-0.5 text-[11px] text-[color:var(--ink-soft)]">
                  {record.east?.rank ?? ""}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
