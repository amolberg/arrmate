import {
  Check,
  CircleSlash2,
  Film,
  Search,
  SlidersHorizontal,
  Star,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import type { DiscoveryItem } from "@/domain/discovery";
import { canRequestThroughSeerr } from "@/domain/seerr-permissions";
import { getProviderSession } from "@/server/auth/session";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";

export const metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; request?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const session = await getProviderSession();
  const adapter = jellyseerrFromEnvironment();
  const result =
    query.length >= 2 && session && adapter
      ? await adapter.search(query, session.upstreamCookie)
      : null;
  const items = result?.ok ? result.data.items : [];

  return (
    <div className="page-stack compact-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Find anything.</h1>
          <p className="page-lead">
            Movies and series. One search. One request.
          </p>
        </div>
      </section>

      <form className="search-shell" action="/discover">
        <Search size={20} aria-hidden="true" />
        <input
          name="q"
          defaultValue={query}
          aria-label="Search movies and series"
          placeholder="Search movies and series…"
          autoComplete="off"
          maxLength={120}
        />
        <button
          className="filter-button"
          type="button"
          disabled
          aria-label="Search filters are not available yet"
        >
          <SlidersHorizontal size={18} />
        </button>
      </form>

      {params.request && <RequestNotice value={params.request} />}

      {!adapter ? (
        <div className="connection-banner" role="status">
          <span className="banner-dot" />
          <div>
            <strong>Discovery isn’t connected yet</strong>
            <p>Configure Jellyseerr to return real results.</p>
          </div>
        </div>
      ) : !session ? (
        <div className="connection-banner connected-banner" role="status">
          <span className="banner-dot" />
          <div>
            <strong>Jellyseerr is ready</strong>
            <p>
              <Link href="/sign-in">Sign in with Jellyfin</Link> to search and
              request.
            </p>
          </div>
        </div>
      ) : null}

      {items.length > 0 && session ? (
        <section className="media-grid" aria-label="Search results">
          {items.map((item) => (
            <MediaCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              canRequest={canRequestThroughSeerr(
                session.user.permissions,
                item.mediaType,
              )}
            />
          ))}
        </section>
      ) : (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleSlash2}
            title={
              result && !result.ok
                ? "Jellyseerr needs attention"
                : query.length >= 2 && session
                  ? `No results for “${query}”`
                  : "Search your next favorite"
            }
            description={
              result && !result.ok
                ? result.error.message
                : session
                  ? "Try a movie or series title. Results come live from Jellyseerr."
                  : "Sign in with Jellyfin to search the connected Jellyseerr library."
            }
          />
        </section>
      )}
    </div>
  );
}

function RequestNotice({ value }: { value: string }) {
  const success = value === "pending" || value === "approved";
  return (
    <div
      className={success ? "request-notice success" : "request-notice error"}
      role="status"
    >
      {success && <Check size={17} />}
      <div>
        <strong>
          {value === "approved"
            ? "Request approved"
            : value === "pending"
              ? "Request sent"
              : "Request could not be sent"}
        </strong>
        <p>
          {success
            ? "Jellyseerr is taking it from here."
            : value === "forbidden"
              ? "Your Jellyseerr permissions do not allow this request."
              : "Check your quota or try again in a moment."}
        </p>
      </div>
    </div>
  );
}

function MediaCard({
  item,
  canRequest,
}: {
  item: DiscoveryItem;
  canRequest: boolean;
}) {
  const available = item.availability === 5;
  const alreadyRequested =
    item.availability !== null && item.availability >= 2 && !available;
  const Icon = item.mediaType === "movie" ? Film : Tv;
  return (
    <article className="media-card">
      <div className="media-poster">
        {item.posterPath ? (
          <Image
            src={`/api/artwork?path=${encodeURIComponent(item.posterPath)}`}
            alt=""
            fill
            sizes="(max-width: 560px) 44vw, 220px"
          />
        ) : (
          <span>
            <Icon size={32} />
          </span>
        )}
        <span className="media-kind">
          <Icon size={12} /> {item.mediaType}
        </span>
      </div>
      <div className="media-card-copy">
        <div className="media-title">
          <Link href={`/discover/${item.mediaType}/${item.id}`}>
            <strong>{item.title}</strong>
          </Link>
          <span>{item.year ?? "—"}</span>
        </div>
        {item.rating !== null && (
          <span className="media-rating">
            <Star size={12} fill="currentColor" /> {item.rating.toFixed(1)}
          </span>
        )}
        <p>{item.overview || "No overview available."}</p>
        {available ? (
          <span className="availability available">
            <Check size={14} /> Available
          </span>
        ) : alreadyRequested ? (
          <span className="availability processing">Already requested</span>
        ) : canRequest ? (
          <Link
            className="request-button"
            href={`/discover/${item.mediaType}/${item.id}`}
          >
            View details
          </Link>
        ) : (
          <span className="request-button disabled-link" aria-disabled="true">
            Requests unavailable
          </span>
        )}
      </div>
    </article>
  );
}
