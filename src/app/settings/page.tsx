import {
  ChevronRight,
  KeyRound,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { can } from "@/domain/auth";
import { getViewer } from "@/server/auth/session";
import { configuredServices } from "@/server/config-store";

export const metadata = { title: "Settings" };

const settings = [
  {
    icon: PlugZap,
    title: "Integrations",
    copy: "URLs, credentials, capabilities",
    tag: "Environment setup",
  },
  {
    icon: Users,
    title: "People & access",
    copy: "Roles and request permissions",
    tag: "Schema ready",
  },
  {
    icon: ShieldCheck,
    title: "Request limits",
    copy: "Hourly and daily movie or series quotas",
    tag: "Atomic core ready",
  },
  {
    icon: KeyRound,
    title: "Authentication",
    copy: "Jellyfin credentials via Jellyseerr",
    tag: "Server-side session",
  },
];

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "integration:manage")) redirect("/sign-in");
  const services = configuredServices();
  const integrationsConfigured = Boolean(
    services?.jellyseerrUrl || services?.radarrUrl || services?.sonarrUrl,
  );
  return (
    <div className="page-stack compact-stack narrow-page">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Owner controls</p>
          <h1>Settings</h1>
          <p className="page-lead">Securely shape who can do what.</p>
        </div>
      </section>
      <div className="security-banner setup-entry">
        <LockKeyhole size={20} />
        <div>
          <strong>
            {integrationsConfigured
              ? "Services are connected"
              : "Welcome to Arrmate"}
          </strong>
          <p>
            {integrationsConfigured
              ? "Secrets stay on the server. Add or replace services at any time."
              : "Connect Jellyseerr, Radarr, Sonarr, Bazarr, and qBittorrent."}
          </p>
        </div>
        <Link className="primary-button" href="/setup">
          {integrationsConfigured ? "Manage connections" : "Run setup"}
        </Link>
      </div>
      <section className="settings-list">
        {settings.map(({ icon: Icon, title, copy, tag }) => (
          <article className="settings-row" key={title}>
            <span className="settings-icon">
              <Icon size={19} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
            <span className="settings-tag">{tag}</span>
            {title === "People & access" ? (
              <Link
                className="settings-chevron"
                href="/settings/people"
                aria-label="Open People & access"
              >
                <ChevronRight size={18} />
              </Link>
            ) : (
              <ChevronRight className="settings-chevron" size={18} />
            )}
          </article>
        ))}
      </section>
      <p className="settings-footnote">
        Editing is intentionally disabled until encrypted credential storage and
        audit events are wired to the UI.
      </p>
    </div>
  );
}
