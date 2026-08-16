import { CircleAlert, Languages, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { deleteSubtitle, downloadSubtitle } from "@/app/actions";

export interface SubtitleSummary {
  id: number;
  language: string;
  languageCode: string;
  provider: string;
  path: string | null;
  subtitlesPath: string | null;
  missing: boolean;
  hi: boolean;
  forced: boolean;
}

export interface SubtitleSuggestion {
  id: string | number;
  language: string;
  languageCode: string;
  provider: string;
  score: number | null;
  release: string | null;
  url: string | null;
  hi: boolean;
  forced: boolean;
}

export function SubtitleOverview({
  subtitles,
  suggestions,
  searchError,
  episodeLabel,
  returnTo,
  subtitlesError,
  mediaKind,
  seriesId,
  radarrId,
  episodeId,
}: {
  subtitles: SubtitleSummary[];
  suggestions: SubtitleSuggestion[];
  searchError: string | null;
  episodeLabel: string;
  returnTo: string;
  subtitlesError: string | null;
  mediaKind: "series" | "movie";
  seriesId?: number;
  radarrId?: number;
  episodeId?: number;
}) {
  if (subtitlesError) {
    return (
      <section className="surface-card min-card">
        <EmptyState
          icon={CircleAlert}
          title="Bazarr error"
          description={subtitlesError}
        />
      </section>
    );
  }
  return (
    <div className="stack">
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Episode</p>
            <h2>{episodeLabel}</h2>
          </div>
        </div>
        {subtitles.length === 0 ? (
          <section className="surface-card min-card">
            <EmptyState
              icon={Languages}
              title="No subtitles tracked"
              description="Bazarr has no record of subtitles for this episode yet."
            />
          </section>
        ) : (
          <div className="subtitle-grid">
            {subtitles.map((sub) => (
              <article
                className="subtitle-card"
                key={`${sub.languageCode}-${sub.forced}-${sub.hi}-${sub.id}`}
                data-missing={sub.missing}
                data-present={!sub.missing}
              >
                <header>
                  <strong>{sub.language}</strong>
                  <em>
                    {sub.missing ? "Missing" : sub.provider}
                    {sub.hi ? " · HI" : ""}
                    {sub.forced ? " · Forced" : ""}
                  </em>
                </header>
                {!sub.missing && sub.path && (
                  <form className="danger-form" action={deleteSubtitle}>
                    <input type="hidden" name="mediaKind" value={mediaKind} />
                    {seriesId && (
                      <input type="hidden" name="seriesId" value={seriesId} />
                    )}
                    {episodeId && (
                      <input type="hidden" name="episodeId" value={episodeId} />
                    )}
                    {radarrId && (
                      <input type="hidden" name="radarrId" value={radarrId} />
                    )}
                    <input
                      type="hidden"
                      name="language"
                      value={sub.languageCode || sub.language}
                    />
                    <input
                      type="hidden"
                      name="forced"
                      value={String(sub.forced)}
                    />
                    <input type="hidden" name="hi" value={String(sub.hi)} />
                    <input type="hidden" name="path" value={sub.path} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="secondary-button" type="submit">
                      <Trash2 size={14} /> Remove
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Subtitle search</p>
            <h2>Browse available</h2>
          </div>
        </div>
        {searchError && (
          <section className="surface-card min-card">
            <EmptyState
              icon={CircleAlert}
              title="Search failed"
              description={searchError}
            />
          </section>
        )}
        {!searchError && suggestions.length === 0 && (
          <section className="surface-card min-card">
            <EmptyState
              icon={Search}
              title="No search results"
              description="Bazarr returned no candidates."
            />
          </section>
        )}
        {suggestions.length > 0 && (
          <div className="subtitle-grid">
            {suggestions.map((sub) => (
              <article
                className="subtitle-card"
                key={String(sub.id)}
                data-missing="false"
              >
                <header>
                  <strong>{sub.language}</strong>
                  <em>{sub.provider}</em>
                </header>
                <small>
                  {sub.release ?? "Untitled release"}
                  {sub.score !== null ? ` · score ${sub.score}` : ""}
                </small>
                <form action={downloadSubtitle} className="danger-form">
                  <input type="hidden" name="mediaKind" value={mediaKind} />
                  {seriesId && (
                    <input type="hidden" name="seriesId" value={seriesId} />
                  )}
                  {episodeId && (
                    <input type="hidden" name="episodeId" value={episodeId} />
                  )}
                  {radarrId && (
                    <input type="hidden" name="radarrId" value={radarrId} />
                  )}
                  <input type="hidden" name="provider" value={sub.provider} />
                  <input type="hidden" name="subtitle" value={String(sub.id)} />
                  <input type="hidden" name="hi" value={String(sub.hi)} />
                  <input
                    type="hidden"
                    name="forced"
                    value={String(sub.forced)}
                  />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="primary-button" type="submit">
                    <Plus size={14} /> Download
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
