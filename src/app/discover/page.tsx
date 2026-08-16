import { CircleSlash2, Search, SlidersHorizontal } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Discover" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  return (
    <div className="page-stack compact-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Find anything.</h1>
          <p className="page-lead">
            Movies and series will share one clean search.
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

      <div className="connection-banner" role="status">
        <span className="banner-dot" />
        <div>
          <strong>Discovery isn’t connected yet</strong>
          <p>
            Connect Jellyseerr or a metadata provider to return real results.
          </p>
        </div>
      </div>

      <section className="surface-card min-card">
        <EmptyState
          icon={CircleSlash2}
          title={
            query
              ? `No live results for “${query}”`
              : "Ready when your provider is"
          }
          description="Arrmate won't fill this screen with demo titles. Once connected, search results and request availability will show here."
        />
      </section>
    </div>
  );
}
