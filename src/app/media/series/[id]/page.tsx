import {
  ArrowLeft,
  CircleAlert,
  HardDrive,
  Link2,
  Search,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { formatBytes } from "@/components/download-row";
import { deleteMediaFile } from "@/app/actions";
import type { ArrEpisode, ArrEpisodeFile, ArrSeries } from "@/domain/arr";
import { getSeriesDetail } from "@/server/media";

export const metadata = { title: "Series" };
export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delete?: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const detail = await getSeriesDetail(id);
  if (!detail) {
    return (
      <div className="page-stack compact-stack narrow-page">
        <Link className="back-link" href="/media">
          <ArrowLeft size={16} /> Back to media
        </Link>
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Sonarr is not connected"
            description="Add Sonarr in setup to see series details."
            action={
              <Link className="secondary-button" href="/setup">
                Open setup
              </Link>
            }
          />
        </section>
      </div>
    );
  }
  if (detail.error) {
    return (
      <div className="page-stack compact-stack narrow-page">
        <Link className="back-link" href="/media">
          <ArrowLeft size={16} /> Back to media
        </Link>
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Sonarr could not load this series"
            description={detail.error.message}
          />
        </section>
      </div>
    );
  }
  const paramsResult = await searchParams;
  const deleteMessage = paramsResult.delete ?? null;
  return (
    <SeriesDetailView
      series={detail.series}
      episodes={detail.episodes}
      files={detail.files}
      deleteMessage={deleteMessage}
    />
  );
}

function SeriesDetailView({
  series,
  episodes,
  files,
  deleteMessage,
}: {
  series: ArrSeries;
  episodes: ArrEpisode[];
  files: ArrEpisodeFile[];
  deleteMessage: string | null;
}) {
  const stats = series.statistics;
  const seasonViews = series.seasons
    .filter((season) => season.seasonNumber > 0)
    .map((season) => {
      const seasonEpisodes = episodes
        .filter((episode) => episode.seasonNumber === season.seasonNumber)
        .sort((a, b) => a.episodeNumber - b.episodeNumber);
      const seasonFiles = files.filter(
        (file) => file.seasonNumber === season.seasonNumber,
      );
      return { season, episodes: seasonEpisodes, files: seasonFiles };
    });

  return (
    <div className="page-stack compact-stack">
      <Link className="back-link" href="/media">
        <ArrowLeft size={16} /> Back to media
      </Link>
      {deleteMessage && (
        <div className="form-error" role="alert">
          {deleteMessage === "accepted"
            ? "File deleted."
            : `Delete failed: ${deleteMessage}`}
        </div>
      )}
      <section className="detail-hero">
        <div className="detail-poster">
          {series.posterUrl ? (
            <Image src={series.posterUrl} alt="" fill sizes="200px" />
          ) : (
            <Tv size={42} aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="eyebrow">series</p>
          <h1>{series.title}</h1>
          <p className="detail-meta">
            {series.year ?? "Unknown year"}
            {series.network ? ` · ${series.network}` : ""}
            {series.status ? ` · ${series.status}` : ""}
          </p>
          <div className="detail-actions">
            <Link
              className="primary-button"
              href={`/media/series/${series.id}/search`}
            >
              <Search size={17} /> Search releases
            </Link>
            <Link
              className="secondary-button"
              href={`/media/series/${series.id}/subtitles`}
            >
              <Link2 size={17} /> Subtitles
            </Link>
          </div>
        </div>
      </section>
      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon green">
            <HardDrive size={19} />
          </span>
          <div>
            <small>Episodes on disk</small>
            <strong>
              {stats?.episodeFileCount ?? 0}
              <span> / {stats?.totalEpisodeCount ?? 0}</span>
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <Tv size={19} />
          </span>
          <div>
            <small>Seasons</small>
            <strong>
              {series.seasons.filter((s) => s.seasonNumber > 0).length}
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">
            <HardDrive size={19} />
          </span>
          <div>
            <small>Size on disk</small>
            <strong>{formatBytes(stats?.sizeOnDisk ?? 0)}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon violet">
            <Tv size={19} />
          </span>
          <div>
            <small>Monitored</small>
            <strong>{series.monitored ? "Yes" : "No"}</strong>
          </div>
        </article>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Episodes</p>
            <h2>Seasons</h2>
          </div>
        </div>
        <div className="season-list">
          {seasonViews.map(
            ({ season, episodes: seasonEpisodes, files: seasonFiles }) => (
              <SeasonCard
                key={season.seasonNumber}
                season={season}
                episodes={seasonEpisodes}
                files={seasonFiles}
                seriesId={series.id}
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function SeasonCard({
  season,
  episodes,
  files,
  seriesId,
}: {
  season: ArrSeries["seasons"][number];
  episodes: ArrEpisode[];
  files: ArrEpisodeFile[];
  seriesId: number;
}) {
  const monitorPercent =
    season.totalEpisodeCount > 0
      ? Math.min(1, season.episodeFileCount / season.totalEpisodeCount)
      : 0;
  return (
    <details className="season-card" open={season.seasonNumber === 1}>
      <summary>
        <span className="season-card-title">Season {season.seasonNumber}</span>
        <span className="season-card-progress">
          <span>
            {season.episodeFileCount}/{season.totalEpisodeCount} episodes
          </span>
          <span>{formatBytes(season.statistics?.sizeOnDisk ?? 0)}</span>
        </span>
      </summary>
      <div className="season-progress">
        <span
          className="season-progress-bar"
          style={{ width: `${Math.round(monitorPercent * 100)}%` }}
        />
      </div>
      <ol className="episode-list">
        {episodes.map((episode) => {
          const file = files.find((f) => f.episodeId === episode.id) ?? null;
          return (
            <li key={episode.id} className="episode-row">
              <div className="episode-copy">
                <strong>
                  {episode.episodeNumber}. {episode.title || "Untitled"}
                </strong>
                <small>
                  {episode.airDate
                    ? new Date(episode.airDate).toLocaleDateString()
                    : "TBA"}
                </small>
              </div>
              <div className="episode-file">
                {file ? (
                  <>
                    <span className="episode-quality">{file.quality}</span>
                    <small>{formatBytes(file.size)}</small>
                    {file.releaseGroup && (
                      <span className="release-group">{file.releaseGroup}</span>
                    )}
                    <form className="danger-form" action={deleteMediaFile}>
                      <input type="hidden" name="mediaKind" value="series" />
                      <input type="hidden" name="mediaId" value={seriesId} />
                      <input type="hidden" name="fileId" value={file.id} />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={`/media/series/${seriesId}`}
                      />
                      <input
                        type="hidden"
                        name="confirmation"
                        value="DELETE FILE"
                      />
                      <button className="secondary-button" type="submit">
                        Delete
                      </button>
                    </form>
                  </>
                ) : episode.hasFile ? (
                  <span className="episode-quality">Tracked</span>
                ) : (
                  <span className="episode-quality missing">Missing</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
