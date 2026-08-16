import {
  ArrowLeft,
  ArrowDown,
  CircleAlert,
  ExternalLink,
  Filter,
  Search as SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { getSeriesDetail, getSonarrAdapter } from "@/server/media";
import { blocklistRelease, grabRelease } from "@/app/actions";

export const metadata = { title: "Search releases" };
export const dynamic = "force-dynamic";

const errorCopy: Record<string, string> = {
  authentication: "Sonarr rejected the API key.",
  timeout: "Sonarr timed out.",
  unreachable: "Could not reach Sonarr.",
  "malformed-response": "Sonarr returned unexpected data.",
  upstream: "Sonarr is currently unavailable.",
  accepted: "Release sent to Sonarr.",
  invalid: "Invalid release payload.",
  "not-connected": "Sonarr is not connected.",
};

export default async function SeriesSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string;
    episode?: string;
    grab?: string;
    block?: string;
  }>;
}) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const detail = await getSeriesDetail(id);
  if (!detail) {
    return (
      <div className="page-stack compact-stack narrow-page">
        <Link className="back-link" href={`/media/series/${id}`}>
          <ArrowLeft size={16} /> Back to series
        </Link>
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Sonarr is not connected"
            description="Add Sonarr in setup before searching releases."
          />
        </section>
      </div>
    );
  }
  const paramsResult = await searchParams;
  const season = paramsResult.season ? Number(paramsResult.season) : null;
  const episode = paramsResult.episode ? Number(paramsResult.episode) : null;
  const sonarr = getSonarrAdapter();
  const searchResult = sonarr
    ? await sonarr.searchReleases({
        seriesId: id,
        seasonNumber: season ?? undefined,
        episodeId: episode ?? undefined,
        limit: 50,
      })
    : null;
  const grabMessage = paramsResult.grab
    ? (errorCopy[paramsResult.grab] ?? null)
    : null;
  const blockMessage = paramsResult.block
    ? (errorCopy[paramsResult.block] ?? null)
    : null;

  const returnTo = `/media/series/${id}/search?${new URLSearchParams({
    ...(season ? { season: String(season) } : {}),
    ...(episode ? { episode: String(episode) } : {}),
  }).toString()}`;

  return (
    <div className="page-stack compact-stack">
      <Link className="back-link" href={`/media/series/${id}`}>
        <ArrowLeft size={16} /> Back to {detail.series.title}
      </Link>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Interactive search</p>
          <h1>Search releases</h1>
          <p className="page-lead">
            Pick a release to grab. Sonarr will replace any episode file that
            improves on the existing one.
          </p>
        </div>
        <Link
          className="secondary-button desktop-only"
          href={`/media/series/${id}/search`}
        >
          <Filter size={16} /> All releases
        </Link>
      </section>
      <form className="search-shell" action={`/media/series/${id}/search`}>
        <SearchIcon size={20} aria-hidden="true" />
        <select
          name="season"
          defaultValue={season ? String(season) : ""}
          aria-label="Season"
          className="text-input"
        >
          <option value="">All seasons</option>
          {detail.series.seasons
            .filter((s) => s.seasonNumber > 0)
            .map((s) => (
              <option key={s.seasonNumber} value={s.seasonNumber}>
                Season {s.seasonNumber}
              </option>
            ))}
        </select>
        {season && (
          <select
            name="episode"
            defaultValue={episode ? String(episode) : ""}
            aria-label="Episode"
            className="text-input"
          >
            <option value="">All episodes</option>
            {detail.episodes
              .filter((e) => e.seasonNumber === season)
              .map((e) => (
                <option key={e.id} value={e.episodeNumber}>
                  Episode {e.episodeNumber}
                </option>
              ))}
          </select>
        )}
        <button className="primary-button" type="submit">
          Search
        </button>
      </form>
      {grabMessage && (
        <div className="form-error" role="alert">
          {grabMessage}
        </div>
      )}
      {blockMessage && (
        <div className="form-error" role="alert">
          {blockMessage}
        </div>
      )}
      {!searchResult ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Sonarr is not connected"
            description="Add Sonarr in setup to search releases."
          />
        </section>
      ) : !searchResult.ok ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Search failed"
            description={searchResult.error.message}
          />
        </section>
      ) : searchResult.data.length === 0 ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={SearchIcon}
            title="No releases yet"
            description="Sonarr returned no releases for this filter."
          />
        </section>
      ) : (
        <section className="release-search-list" aria-label="Releases">
          {searchResult.data.map((release) => (
            <article
              className="release-row"
              key={release.guid}
              data-rejected={release.rejected}
              data-approved={release.approved}
            >
              <div className="release-title">
                <strong>{release.title}</strong>
                <div className="release-meta">
                  <span className="release-group">{release.indexer}</span>
                  <span className="release-group">{release.quality}</span>
                  {release.releaseGroup && (
                    <span className="release-group">
                      {release.releaseGroup}
                    </span>
                  )}
                  {release.languages.length > 0 && (
                    <span className="release-group">
                      {release.languages.join(" / ")}
                    </span>
                  )}
                  <span>{formatBytes(release.size)}</span>
                  <span>{Math.round(release.ageHours)}h old</span>
                  {release.seeders !== null && (
                    <span>
                      <ArrowDown size={11} aria-hidden="true" />{" "}
                      {release.seeders}
                    </span>
                  )}
                  {release.rejected && (
                    <span className="rejected">
                      Rejected: {release.rejections.join(", ") || "no reason"}
                    </span>
                  )}
                  {release.approved && (
                    <span className="approved">Sonarr approved</span>
                  )}
                </div>
              </div>
              <div className="release-actions">
                {release.infoUrl && (
                  <a
                    className="secondary-button"
                    href={release.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} /> Details
                  </a>
                )}
                <form className="release-form" action={grabRelease}>
                  <input type="hidden" name="guid" value={release.guid} />
                  <input
                    type="hidden"
                    name="indexerId"
                    value={release.indexerId}
                  />
                  {release.downloadUrl && (
                    <input
                      type="hidden"
                      name="downloadUrl"
                      value={release.downloadUrl}
                    />
                  )}
                  <input type="hidden" name="mediaKind" value="series" />
                  <input type="hidden" name="mediaId" value={id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={release.rejected}
                  >
                    Grab release
                  </button>
                </form>
                <form action={blocklistRelease}>
                  <input type="hidden" name="guid" value={release.guid} />
                  <input type="hidden" name="mediaKind" value="series" />
                  <input type="hidden" name="mediaId" value={id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="secondary-button" type="submit">
                    Blocklist
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
