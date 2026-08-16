import {
  ArrowLeft,
  CircleAlert,
  Clapperboard,
  HardDrive,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { formatBytes } from "@/components/download-row";
import { deleteMediaFile } from "@/app/actions";
import type { ArrMovie, ArrMovieFile } from "@/domain/arr";
import { getMovieDetail } from "@/server/media";

export const metadata = { title: "Movie" };
export const dynamic = "force-dynamic";

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delete?: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const detail = await getMovieDetail(id);
  if (!detail) {
    return (
      <div className="page-stack compact-stack narrow-page">
        <Link className="back-link" href="/media?tab=movies">
          <ArrowLeft size={16} /> Back to media
        </Link>
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Radarr is not connected"
            description="Add Radarr in setup to see movie details."
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
        <Link className="back-link" href="/media?tab=movies">
          <ArrowLeft size={16} /> Back to media
        </Link>
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Radarr could not load this movie"
            description={detail.error.message}
          />
        </section>
      </div>
    );
  }
  const paramsResult = await searchParams;
  return (
    <MovieDetailView
      movie={detail.movie}
      file={detail.file}
      deleteMessage={paramsResult.delete ?? null}
    />
  );
}

function MovieDetailView({
  movie,
  file,
  deleteMessage,
}: {
  movie: ArrMovie;
  file: ArrMovieFile | null;
  deleteMessage: string | null;
}) {
  return (
    <div className="page-stack compact-stack">
      <Link className="back-link" href="/media?tab=movies">
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
          {movie.posterUrl ? (
            <Image src={movie.posterUrl} alt="" fill sizes="200px" />
          ) : (
            <Clapperboard size={42} aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="eyebrow">movie</p>
          <h1>{movie.title}</h1>
          <p className="detail-meta">
            {movie.year ?? "Unknown year"}
            {movie.studio ? ` · ${movie.studio}` : ""}
            {movie.originalLanguage ? ` · ${movie.originalLanguage.name}` : ""}
          </p>
          <div className="detail-actions">
            <Link
              className="primary-button"
              href={`/media/movies/${movie.id}/search`}
            >
              <Search size={17} /> Search releases
            </Link>
            <Link
              className="secondary-button"
              href={`/media/movies/${movie.id}/subtitles`}
            >
              Subtitles
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
            <small>On disk</small>
            <strong>{file ? formatBytes(file.size) : "—"}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <Clapperboard size={19} />
          </span>
          <div>
            <small>Quality</small>
            <strong>{file ? file.quality : "Missing"}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">
            <HardDrive size={19} />
          </span>
          <div>
            <small>Monitored</small>
            <strong>{movie.monitored ? "Yes" : "No"}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon violet">
            <Clapperboard size={19} />
          </span>
          <div>
            <small>Status</small>
            <strong>{movie.status}</strong>
          </div>
        </article>
      </section>
      {file && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Active file</p>
              <h2>Quality and release</h2>
            </div>
          </div>
          <div className="surface-card movie-file-card">
            <div>
              <strong>{file.relativePath}</strong>
              <small>{file.path}</small>
            </div>
            <div className="movie-file-meta">
              <span className="episode-quality">{file.quality}</span>
              {file.releaseGroup && (
                <span className="release-group">{file.releaseGroup}</span>
              )}
              {file.languages.length > 0 && (
                <span className="release-group">
                  {file.languages.join(" / ")}
                </span>
              )}
              <small>{formatBytes(file.size)}</small>
              <form className="danger-form" action={deleteMediaFile}>
                <input type="hidden" name="mediaKind" value="movie" />
                <input type="hidden" name="mediaId" value={movie.id} />
                <input type="hidden" name="fileId" value={file.id} />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`/media/movies/${movie.id}`}
                />
                <input type="hidden" name="confirmation" value="DELETE FILE" />
                <button className="secondary-button" type="submit">
                  Delete file
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
