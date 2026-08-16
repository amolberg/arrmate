import {
  CircleAlert,
  Clapperboard,
  Filter,
  Film,
  LockKeyhole,
  Search,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { formatBytes } from "@/components/download-row";
import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { getMediaOverview } from "@/server/media";

export const metadata = { title: "Media" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "series", label: "Series", icon: Tv },
  { key: "movies", label: "Movies", icon: Film },
] as const;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const params = await searchParams;
  const active = params.tab === "movies" ? "movies" : "series";
  const query = (params.q ?? "").trim().toLowerCase();

  const overview = await getMediaOverview();
  const totalSeries = overview.series.length;
  const totalMovies = overview.movies.length;

  const series = query
    ? overview.series.filter((item) => item.title.toLowerCase().includes(query))
    : overview.series;
  const movies = query
    ? overview.movies.filter((item) => item.title.toLowerCase().includes(query))
    : overview.movies;

  return (
    <div className="page-stack compact-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Media</h1>
          <p className="page-lead">
            Your Sonarr and Radarr libraries in one place. Click any title to
            inspect files, search for new releases, or repair episodes.
          </p>
        </div>
        <Link className="secondary-button desktop-only" href="/operations">
          <Filter size={16} /> Filter queue
        </Link>
      </section>

      <nav className="segmented-control" aria-label="Media filter">
        {tabs.map(({ key, label, icon: Icon }) =>
          key === active ? (
            <Link
              className="selected"
              key={key}
              href={`/media?tab=${key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </Link>
          ) : (
            <Link
              key={key}
              href={`/media?tab=${key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </Link>
          ),
        )}
      </nav>

      <form className="search-shell" action="/media">
        <input type="hidden" name="tab" value={active} />
        <Search size={20} aria-hidden="true" />
        <input
          name="q"
          defaultValue={query}
          aria-label={`Search ${active}`}
          placeholder={`Search ${active}…`}
          autoComplete="off"
          maxLength={120}
        />
      </form>

      {overview.errors.sonarr && active === "series" && (
        <div className="form-error" role="alert">
          Sonarr error: {overview.errors.sonarr.message}
        </div>
      )}
      {overview.errors.radarr && active === "movies" && (
        <div className="form-error" role="alert">
          Radarr error: {overview.errors.radarr.message}
        </div>
      )}

      {active === "series" ? (
        <SeriesBoard count={totalSeries} series={series} />
      ) : (
        <MovieBoard count={totalMovies} movies={movies} />
      )}
    </div>
  );
}

function SeriesBoard({
  count,
  series,
}: {
  count: number;
  series: import("@/server/media").MediaSeriesSummary[];
}) {
  if (count === 0) {
    return (
      <section className="surface-card min-card">
        <EmptyState
          icon={LockKeyhole}
          title="Sonarr is not connected"
          description="Add Sonarr in setup to see your series library here."
          action={
            <Link className="secondary-button" href="/setup">
              Open setup
            </Link>
          }
        />
      </section>
    );
  }
  if (series.length === 0) {
    return (
      <section className="surface-card min-card">
        <EmptyState
          icon={Search}
          title="No series match"
          description="Try a different search term or clear the filter."
        />
      </section>
    );
  }
  return (
    <section className="media-grid" aria-label="Series library">
      {series.map((item) => {
        const percent =
          item.episodeTotalCount > 0
            ? Math.min(1, item.episodeFileCount / item.episodeTotalCount)
            : 0;
        return (
          <Link
            className="media-card"
            key={item.id}
            href={`/media/series/${item.id}`}
          >
            <div className="media-poster">
              {item.posterUrl ? (
                <Image
                  src={item.posterUrl}
                  alt=""
                  fill
                  sizes="(min-width: 720px) 200px, 40vw"
                />
              ) : (
                <Tv size={32} aria-hidden="true" />
              )}
            </div>
            <div className="media-card-body">
              <strong>{item.title}</strong>
              <small>
                {item.year ?? "Unknown year"} · {item.network ?? "Series"}
              </small>
              <div className="media-progress" aria-label="Download progress">
                <span
                  className="media-progress-bar"
                  style={{ width: `${Math.round(percent * 100)}%` }}
                />
              </div>
              <div className="media-stats">
                <span>
                  {item.episodeFileCount}/{item.episodeTotalCount} episodes
                </span>
                <span>{formatBytes(item.sizeOnDisk)}</span>
              </div>
              {item.ended && <span className="media-tag">Ended</span>}
              {!item.monitored && (
                <span className="media-tag dim">Unmonitored</span>
              )}
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function MovieBoard({
  count,
  movies,
}: {
  count: number;
  movies: import("@/server/media").MediaMovieSummary[];
}) {
  if (count === 0) {
    return (
      <section className="surface-card min-card">
        <EmptyState
          icon={LockKeyhole}
          title="Radarr is not connected"
          description="Add Radarr in setup to see your movie library here."
          action={
            <Link className="secondary-button" href="/setup">
              Open setup
            </Link>
          }
        />
      </section>
    );
  }
  if (movies.length === 0) {
    return (
      <section className="surface-card min-card">
        <EmptyState
          icon={Search}
          title="No movies match"
          description="Try a different search term or clear the filter."
        />
      </section>
    );
  }
  return (
    <section className="media-grid" aria-label="Movie library">
      {movies.map((item) => (
        <Link
          className="media-card"
          key={item.id}
          href={`/media/movies/${item.id}`}
        >
          <div className="media-poster">
            {item.posterUrl ? (
              <Image
                src={item.posterUrl}
                alt=""
                fill
                sizes="(min-width: 720px) 200px, 40vw"
              />
            ) : (
              <Clapperboard size={32} aria-hidden="true" />
            )}
          </div>
          <div className="media-card-body">
            <strong>{item.title}</strong>
            <small>
              {item.year ?? "Unknown year"}{" "}
              {item.originalLanguage ? `· ${item.originalLanguage}` : ""}
            </small>
            <div className="media-stats">
              <span>
                {item.hasFile ? (
                  <span className="media-tag ready">Available</span>
                ) : item.status === "released" ? (
                  <span className="media-tag warn">Missing</span>
                ) : (
                  <span className="media-tag dim">{item.status}</span>
                )}
              </span>
              <span>{formatBytes(item.sizeOnDisk)}</span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

export function MediaHeaderError({ message }: { message: string }) {
  return (
    <div className="form-error" role="alert">
      <CircleAlert size={16} aria-hidden="true" /> {message}
    </div>
  );
}
