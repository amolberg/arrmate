import { ArrowLeft, CircleAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { getMovieDetail } from "@/server/media";
import { bazarrFromEnvironment } from "@/server/integrations/bazarr";
import { SubtitleOverview } from "@/components/subtitle-overview";

export const metadata = { title: "Subtitles" };
export const dynamic = "force-dynamic";

const errorCopy: Record<string, string> = {
  authentication: "Bazarr rejected its API key.",
  timeout: "Bazarr timed out.",
  unreachable: "Could not reach Bazarr.",
  "malformed-response": "Bazarr returned unexpected data.",
  upstream: "Bazarr is currently unavailable.",
  accepted: "Saved.",
  invalid: "Invalid action payload.",
  "bazarr-not-connected": "Bazarr is not connected.",
};

export default async function MovieSubtitlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subtitle?: string; delete?: string }>;
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
            description="Add Radarr in setup to see subtitles."
          />
        </section>
      </div>
    );
  }
  const bazarr = bazarrFromEnvironment();
  const paramsResult = await searchParams;
  const subtitleMessage = paramsResult.subtitle
    ? (errorCopy[paramsResult.subtitle] ?? null)
    : null;
  const deleteMessage = paramsResult.delete
    ? (errorCopy[paramsResult.delete] ?? null)
    : null;
  const returnTo = `/media/movies/${id}/subtitles`;
  const searchResult = bazarr ? await bazarr.searchMovieSubtitles(id) : null;
  return (
    <div className="page-stack compact-stack">
      <Link className="back-link" href={`/media/movies/${id}`}>
        <ArrowLeft size={16} /> Back to {detail.movie.title}
      </Link>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Bazarr</p>
          <h1>Subtitles</h1>
          <p className="page-lead">
            Download or remove subtitles for this movie.
          </p>
        </div>
      </section>
      {subtitleMessage && (
        <div className="form-error" role="alert">
          {subtitleMessage}
        </div>
      )}
      {deleteMessage && (
        <div className="form-error" role="alert">
          {deleteMessage}
        </div>
      )}
      {!bazarr ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Bazarr is not connected"
            description="Add Bazarr in setup to manage subtitles."
          />
        </section>
      ) : (
        <SubtitleOverview
          subtitles={[]}
          suggestions={searchResult && searchResult.ok ? searchResult.data : []}
          searchError={
            searchResult && !searchResult.ok ? searchResult.error.message : null
          }
          episodeLabel={detail.movie.title}
          returnTo={returnTo}
          subtitlesError={null}
          mediaKind="movie"
          radarrId={id}
        />
      )}
    </div>
  );
}
