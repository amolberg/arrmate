import { Inbox, ListFilter } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
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
      <section className="surface-card min-card">
        <EmptyState
          icon={Inbox}
          title="No request activity"
          description="New requests, approvals, downloads, and availability updates will collect here."
        />
      </section>
    </div>
  );
}
