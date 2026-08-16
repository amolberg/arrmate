import { Check, CircleAlert, Clock3, Inbox, ListFilter } from "lucide-react";
import Image from "next/image";

import { EmptyState } from "@/components/empty-state";
import { getProviderSession } from "@/server/auth/session";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";

export const metadata = { title: "Activity" };

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await getProviderSession();
  const adapter = jellyseerrFromEnvironment();
  const result =
    session && adapter ? await adapter.activity(session.upstreamCookie) : null;
  return (
    <div className="page-stack compact-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Requests</p>
          <h1>Activity</h1>
          <p className="page-lead">
            Follow each title from request to ready-to-watch.
          </p>
        </div>
        <button
          className="secondary-button desktop-only"
          type="button"
          disabled
        >
          <ListFilter size={16} /> Filter
        </button>
      </section>
      <div className="segmented-control" aria-label="Activity filter">
        <button className="selected" type="button">
          All
        </button>
        <button type="button" disabled>
          Pending
        </button>
        <button type="button" disabled>
          Available
        </button>
      </div>
      {!adapter || !session ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={Inbox}
            title={
              !adapter ? "Activity isn’t connected" : "Sign in to see activity"
            }
            description={
              !adapter
                ? "Configure Jellyseerr to load real request history."
                : "Your request history will appear here after signing in with Jellyfin."
            }
          />
        </section>
      ) : result && !result.ok ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={CircleAlert}
            title="Activity needs attention"
            description={result.error.message}
          />
        </section>
      ) : result?.data.length ? (
        <section className="activity-list" aria-label="Request activity">
          {result.data.map((item) => (
            <article className="activity-row" key={item.id}>
              <div className="activity-poster">
                {item.posterPath ? (
                  <Image
                    src={`/api/artwork?path=${encodeURIComponent(item.posterPath)}`}
                    alt=""
                    fill
                    sizes="48px"
                  />
                ) : item.mediaType === "movie" ? (
                  "M"
                ) : (
                  "S"
                )}
              </div>
              <div className="activity-copy">
                <strong>{item.title}</strong>
                <span>
                  {item.mediaType} ·{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "Date unavailable"}
                </span>
              </div>
              <span className={`activity-status ${item.status}`}>
                <StatusIcon status={item.status} />
                {item.status}
              </span>
            </article>
          ))}
        </section>
      ) : (
        <section className="surface-card min-card">
          <EmptyState
            icon={Inbox}
            title="No request activity"
            description="New requests, approvals, downloads, and availability updates will collect here."
          />
        </section>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  return status === "available" || status === "approved" ? (
    <Check size={14} aria-hidden="true" />
  ) : status === "failed" || status === "declined" ? (
    <CircleAlert size={14} aria-hidden="true" />
  ) : (
    <Clock3 size={14} aria-hidden="true" />
  );
}
