import {
  Activity,
  ArrowDown,
  Gauge,
  HardDrive,
  RefreshCw,
  Settings2,
  Unplug,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DownloadRow, formatBytes } from "@/components/download-row";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { getOperationsSnapshot } from "@/server/operations";

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const snapshot = await getOperationsSnapshot();
  const online = snapshot.integrations.filter(
    (item) => item.health === "online",
  ).length;
  const active =
    snapshot.downloads?.items.filter((item) => item.state === "downloading")
      .length ?? 0;

  return (
    <div className="page-stack compact-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Admin workspace</p>
          <h1>Operations</h1>
          <p className="page-lead">The pulse of your media pipeline.</p>
        </div>
        <Link className="secondary-button desktop-only" href="/settings">
          <Settings2 size={16} /> Manage services
        </Link>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon green">
            <Activity size={19} />
          </span>
          <div>
            <small>Services online</small>
            <strong>
              {online}
              <span> / {snapshot.integrations.length}</span>
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">
            <ArrowDown size={19} />
          </span>
          <div>
            <small>Active downloads</small>
            <strong>{active}</strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <Gauge size={19} />
          </span>
          <div>
            <small>Down speed</small>
            <strong>
              {snapshot.downloads
                ? formatBytes(snapshot.downloads.transfer.downloadSpeedBytes)
                : "—"}
              <span>{snapshot.downloads ? "/s" : ""}</span>
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon violet">
            <HardDrive size={19} />
          </span>
          <div>
            <small>Queue size</small>
            <strong>{snapshot.downloads?.items.length ?? "—"}</strong>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Connected apps</p>
            <h2>Service health</h2>
          </div>
          <span className="fresh-label">
            <RefreshCw size={13} /> Checked now
          </span>
        </div>
        <div className="service-grid">
          {snapshot.integrations.map((integration) => (
            <article className="service-card" key={integration.id}>
              <div className={`service-monogram service-${integration.id}`}>
                {integration.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="service-copy">
                <strong>{integration.name}</strong>
                <p>{integration.detail}</p>
              </div>
              <StatusPill status={integration.health} />
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">qBittorrent</p>
            <h2>Download queue</h2>
          </div>
          {snapshot.downloads && (
            <span className="fresh-label">Live adapter data</span>
          )}
        </div>
        <div className="surface-card queue-card">
          {snapshot.downloads?.items.length ? (
            snapshot.downloads.items.map((item) => (
              <DownloadRow item={item} key={item.id} />
            ))
          ) : (
            <EmptyState
              icon={Unplug}
              title={
                snapshot.downloadError
                  ? "Download client needs attention"
                  : snapshot.downloads
                    ? "Queue is clear"
                    : "qBittorrent is not connected"
              }
              description={
                snapshot.downloadError?.message ??
                (snapshot.downloads
                  ? "There are no active or completed queue items."
                  : "Add server-side qBittorrent settings to see live downloads here.")
              }
              action={
                <Link className="secondary-button" href="/settings">
                  Open integration setup
                </Link>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
