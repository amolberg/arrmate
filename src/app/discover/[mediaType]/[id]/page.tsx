import { ArrowLeft, Check, CircleSlash2, Film, Star, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createMediaRequest } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import type { DiscoveryMediaType, MediaDetails } from "@/domain/discovery";
import { canRequestThroughSeerr } from "@/domain/seerr-permissions";
import { getProviderSession } from "@/server/auth/session";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";

export const dynamic = "force-dynamic";

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ mediaType: string; id: string }>;
  searchParams: Promise<{ request?: string }>;
}) {
  const route = await params;
  if (route.mediaType !== "movie" && route.mediaType !== "series") notFound();
  const id = Number(route.id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const mediaType = route.mediaType as DiscoveryMediaType;
  const session = await getProviderSession();
  const adapter = jellyseerrFromEnvironment();
  const result =
    session && adapter
      ? await adapter.details(id, mediaType, session.upstreamCookie)
      : null;
  const request = (await searchParams).request;

  return (
    <div className="page-stack compact-stack narrow-page">
      <Link className="back-link" href="/discover">
        <ArrowLeft size={16} /> Back to results
      </Link>
      {!result ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleSlash2}
            title={
              !adapter
                ? "Discovery isn’t connected"
                : !session
                  ? "Sign in to view details"
                  : "Media details unavailable"
            }
            description={
              !adapter
                ? "Configure Jellyseerr to load real media details."
                : !session
                  ? "Sign in with Jellyfin to continue."
                  : "Jellyseerr did not return this title."
            }
          />
        </section>
      ) : !result.ok ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleSlash2}
            title="Jellyseerr needs attention"
            description={result.error.message}
          />
        </section>
      ) : (
        <DetailContent
          item={result.data}
          canRequest={canRequestThroughSeerr(
            session!.user.permissions,
            mediaType,
          )}
          request={request}
        />
      )}
    </div>
  );
}

function DetailContent({
  item,
  canRequest,
  request,
}: {
  item: MediaDetails;
  canRequest: boolean;
  request?: string;
}) {
  const Icon = item.mediaType === "movie" ? Film : Tv;
  const unavailable = item.availability !== null && item.availability >= 2;
  return (
    <>
      <section className="detail-hero">
        <div className="detail-poster">
          {item.posterPath ? (
            <Image
              src={`/api/artwork?path=${encodeURIComponent(item.posterPath)}`}
              alt=""
              fill
              sizes="180px"
            />
          ) : (
            <Icon size={42} />
          )}
        </div>
        <div>
          <p className="eyebrow">{item.mediaType}</p>
          <h1>{item.title}</h1>
          <p className="detail-meta">
            {item.year ?? "Release date unknown"}
            {item.rating !== null ? (
              <>
                {" "}
                · <Star size={13} fill="currentColor" />{" "}
                {item.rating.toFixed(1)}
              </>
            ) : null}
          </p>
        </div>
      </section>
      <p className="detail-overview">
        {item.overview || "No overview available."}
      </p>
      {request && (
        <div
          className={`request-notice ${request === "pending" || request === "approved" ? "success" : "error"}`}
          role="status"
        >
          <strong>
            {request === "seasons"
              ? "Choose at least one season"
              : request === "pending"
                ? "Request sent"
                : request === "approved"
                  ? "Request approved"
                  : "Request could not be sent"}
          </strong>
        </div>
      )}
      {unavailable ? (
        <div className="availability available">
          <Check size={14} /> Already available or requested
        </div>
      ) : !canRequest ? (
        <div className="connection-banner">
          <div>
            <strong>Requests are not enabled for this account</strong>
            <p>Ask an administrator to update your Jellyseerr permissions.</p>
          </div>
        </div>
      ) : (
        <form className="detail-request-form" action={createMediaRequest}>
          <input type="hidden" name="mediaId" value={item.id} />
          <input type="hidden" name="mediaType" value={item.mediaType} />
          {item.mediaType === "series" && (
            <fieldset>
              <legend>Choose seasons</legend>
              {item.seasons.length ? (
                item.seasons.map((season) => (
                  <label className="season-option" key={season.seasonNumber}>
                    <input
                      type="checkbox"
                      name="seasons"
                      value={season.seasonNumber}
                      defaultChecked
                    />
                    <span>
                      <strong>{season.name}</strong>
                      <small>
                        {season.episodeCount} episodes
                        {season.airDate
                          ? ` · ${season.airDate.slice(0, 4)}`
                          : ""}
                      </small>
                    </span>
                  </label>
                ))
              ) : (
                <p className="muted-copy">
                  No season information was returned.
                </p>
              )}
            </fieldset>
          )}
          <button className="primary-button" type="submit">
            Request {item.mediaType}
          </button>
        </form>
      )}
    </>
  );
}
