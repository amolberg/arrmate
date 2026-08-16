import { ArrowLeft, CircleAlert, Languages, Search } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { getSeriesDetail, getSonarrAdapter } from "@/server/media";
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

export default async function SeriesSubtitlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    episode?: string;
    subtitle?: string;
    delete?: string;
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
            description="Add Sonarr in setup to see subtitles."
          />
        </section>
      </div>
    );
  }
  const bazarr = bazarrFromEnvironment();
  const sonarr = getSonarrAdapter();
  if (sonarr) {
    /* available */
  }
  const paramsResult = await searchParams;
  const selectedEpisode = paramsResult.episode
    ? Number(paramsResult.episode)
    : null;
  const subtitleMessage = paramsResult.subtitle
    ? (errorCopy[paramsResult.subtitle] ?? null)
    : null;
  const deleteMessage = paramsResult.delete
    ? (errorCopy[paramsResult.delete] ?? null)
    : null;

  const targetEpisode = selectedEpisode
    ? (detail.episodes.find(
        (e) =>
          e.seasonNumber === Math.floor(selectedEpisode / 1000) &&
          e.episodeNumber === selectedEpisode % 1000,
      ) ?? null)
    : null;

  const subtitlesResult =
    bazarr && targetEpisode
      ? await bazarr.episodesForSingle(targetEpisode.id)
      : null;
  const searchResult =
    bazarr && targetEpisode
      ? await bazarr.searchEpisodeSubtitles(targetEpisode.id)
      : null;
  const returnTo = `/media/series/${id}/subtitles?${
    selectedEpisode ? `episode=${selectedEpisode}` : ""
  }`;

  return (
    <div className="page-stack compact-stack">
      <Link className="back-link" href={`/media/series/${id}`}>
        <ArrowLeft size={16} /> Back to {detail.series.title}
      </Link>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Bazarr</p>
          <h1>Subtitles</h1>
          <p className="page-lead">
            Pick an episode to see its downloaded subtitles and search for
            missing languages.
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
      <form className="search-shell" action={`/media/series/${id}/subtitles`}>
        <Search size={20} aria-hidden="true" />
        <select
          name="episode"
          defaultValue={selectedEpisode ? String(selectedEpisode) : ""}
          className="text-input"
          aria-label="Episode"
        >
          <option value="">Select an episode</option>
          {detail.episodes
            .filter((e) => e.seasonNumber > 0)
            .map((e) => (
              <option
                key={e.id}
                value={e.seasonNumber * 1000 + e.episodeNumber}
              >
                S{e.seasonNumber.toString().padStart(2, "0")}E
                {e.episodeNumber.toString().padStart(2, "0")} ·{" "}
                {e.title || "Untitled"}
              </option>
            ))}
        </select>
      </form>
      {!bazarr ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Bazarr is not connected"
            description="Add Bazarr in setup to manage subtitles."
          />
        </section>
      ) : !targetEpisode ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={Languages}
            title="Pick an episode"
            description="Use the filter above to inspect a specific episode."
          />
        </section>
      ) : (
        <SubtitleOverview
          subtitles={subtitlesResult?.ok ? subtitlesResult.data : []}
          suggestions={searchResult?.ok ? searchResult.data : []}
          searchError={
            searchResult && !searchResult.ok ? searchResult.error.message : null
          }
          episodeLabel={`S${targetEpisode.seasonNumber
            .toString()
            .padStart(2, "0")}E${targetEpisode.episodeNumber
            .toString()
            .padStart(2, "0")} · ${targetEpisode.title || "Untitled"}`}
          returnTo={returnTo}
          subtitlesError={
            subtitlesResult && !subtitlesResult.ok
              ? subtitlesResult.error.message
              : null
          }
          mediaKind="series"
          seriesId={id}
          episodeId={targetEpisode.id}
        />
      )}
    </div>
  );
}
