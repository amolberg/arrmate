import {
  ArrowLeft,
  ArrowDown,
  CircleAlert,
  ExternalLink,
  Search as SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { getMovieDetail, getRadarrAdapter } from "@/server/media";
import { blocklistRelease, grabRelease } from "@/app/actions";

export const metadata = { title: "Search releases" };
export const dynamic = "force-dynamic";

const errorCopy: Record<string, string> = {
  authentication: "Radarr rejected the API key.",
  timeout: "Radarr timed out.",
  unreachable: "Could not reach Radarr.",
  "malformed-response": "Radarr returned unexpected data.",
  upstream: "Radarr is currently unavailable.",
  accepted: "Release sent to Radarr.",
  invalid: "Invalid release payload.",
  "not-connected": "Radarr is not connected.",
};

export default async function MovieSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ grab?: string; block?: string }>;
}) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const detail = await getMovieDetail(id);
  if (!detail) {
    return (
      <div className="page-stack compact-stack narrow-page">
        <Link className="back-link" href={`/media/movies/${id}`}>
          <ArrowLeft size={16} /> Back to movie
        </Link>
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Radarr is not connected"
            description="Add Radarr in setup to search releases."
          />
        </section>
      </div>
    );
  }
  const paramsResult = await searchParams;
  const radarr = getRadarrAdapter();
  const searchResult = radarr
    ? await radarr.searchReleases({ movieId: id, limit: 50 })
    : null;
  const grabMessage = paramsResult.grab
    ? (errorCopy[paramsResult.grab] ?? null)
    : null;
  const blockMessage = paramsResult.block
    ? (errorCopy[paramsResult.block] ?? null)
    : null;
  const returnTo = `/media/movies/${id}/search`;

  return (
    <div className="page-stack compact-stack">
      <Link className="back-link" href={`/media/movies/${id}`}>
        <ArrowLeft size={16} /> Back to {detail.movie.title}
      </Link>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Interactive search</p>
          <h1>Search releases</h1>
          <p className="page-lead">
            Replace the current file with a better release. Radarr will keep the
            better-quality version.
          </p>
        </div>
      </section>
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
            title="Radarr is not connected"
            description="Add Radarr in setup to search releases."
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
            description="Radarr returned no releases for this movie."
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
                    <span className="approved">Radarr approved</span>
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
                  <input type="hidden" name="mediaKind" value="movie" />
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
                  <input type="hidden" name="mediaKind" value="movie" />
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
