import { LockKeyhole, LogIn, ShieldCheck, SkipForward } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  completeJellyseerrSetup,
  completeServicesSetup,
  skipServicesSetup,
} from "@/app/actions";
import { readSetupSession } from "@/server/auth/setup-session";
import { configuredServices } from "@/server/config-store";

export const metadata = { title: "Setup" };

const errorCopy: Record<string, string> = {
  invalid: "Type the confirmation phrase exactly as shown.",
  authentication: "Jellyseerr or Jellyfin rejected those credentials.",
  timeout: "Network timed out, please try again.",
  unreachable: "Could not reach the service.",
  "malformed-response": "The service returned an unexpected response.",
  upstream: "The service is currently unavailable.",
  "network-error": "Network error talking to the service.",
  "session-expired": "Your setup session expired. Sign in again.",
  "jellyfin-authentication":
    "Jellyseerr accepted the credentials but Jellyfin rejected them.",
  "jellyfin-malformed-response": "Jellyfin returned an unexpected response.",
  "jellyfin-timeout": "Jellyfin timed out.",
  "jellyfin-unreachable": "Could not reach Jellyfin.",
  "jellyfin-upstream": "Jellyfin is currently unavailable.",
  "radarr-partial": "Enter both the Radarr URL and API key.",
  "radarr-authentication": "Radarr rejected its API key.",
  "radarr-timeout": "Radarr timed out.",
  "radarr-unreachable": "Could not reach Radarr.",
  "radarr-malformed-response": "Radarr returned an unexpected response.",
  "radarr-upstream": "Radarr is currently unavailable.",
  "sonarr-partial": "Enter both the Sonarr URL and API key.",
  "sonarr-authentication": "Sonarr rejected its API key.",
  "sonarr-timeout": "Sonarr timed out.",
  "sonarr-unreachable": "Could not reach Sonarr.",
  "sonarr-malformed-response": "Sonarr returned an unexpected response.",
  "sonarr-upstream": "Sonarr is currently unavailable.",
  "bazarr-partial": "Enter both the Bazarr URL and API key.",
  "bazarr-authentication": "Bazarr rejected its API key.",
  "bazarr-timeout": "Bazarr timed out.",
  "bazarr-unreachable": "Could not reach Bazarr.",
  "bazarr-malformed-response": "Bazarr returned an unexpected response.",
  "bazarr-upstream": "Bazarr is currently unavailable.",
  "qbit-partial": "Enter the qBittorrent URL, username, and password.",
  "qbit-authentication": "qBittorrent rejected the credentials.",
  "qbit-timeout": "qBittorrent timed out.",
  "qbit-unreachable": "Could not reach qBittorrent.",
  "qbit-malformed-response": "qBittorrent returned an unexpected response.",
  "qbit-upstream": "qBittorrent is currently unavailable.",
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const services = configuredServices();
  const setup = await readSetupSession();
  const step = params.step ?? "jellyseerr";

  if (step === "ready") {
    return (
      <div className="signin-layout">
        <section className="signin-panel">
          <div className="signin-heading">
            <p className="eyebrow">All set</p>
            <h1>Arrmate is ready to use.</h1>
            <p>
              {setup
                ? "Open Your services"
                : "You can connect more services later from settings."}
            </p>
          </div>
          <Link className="primary-button signin-button" href="/">
            <LockKeyhole size={17} /> Open dashboard
          </Link>
          <Link className="text-link" href="/settings">
            Adjust integrations later
          </Link>
        </section>
        <aside className="signin-art" aria-label="Arrmate ready">
          <Image
            src="/assets/arrmate-orbit.svg"
            alt=""
            fill
            priority
            sizes="(min-width: 900px) 50vw, 100vw"
          />
          <div className="signin-art-copy">
            <span>Ready</span>
            <strong>Your media. One beautifully calm place.</strong>
          </div>
        </aside>
      </div>
    );
  }

  if (step === "admin" && (!setup || !setup.isAdministrator)) {
    return (
      <div className="signin-layout">
        <section className="signin-panel">
          <div className="signin-heading">
            <p className="eyebrow">Almost there</p>
            <h1>Finish connecting Arrmate.</h1>
            <p>Sign in again to continue connecting your services.</p>
          </div>
          <Link className="primary-button signin-button" href="/setup">
            <LogIn size={17} /> Back to sign-in
          </Link>
        </section>
        <aside className="signin-art" aria-label="Arrmate setup">
          <Image
            src="/assets/arrmate-orbit.svg"
            alt=""
            fill
            priority
            sizes="(min-width: 900px) 50vw, 100vw"
          />
          <div className="signin-art-copy">
            <span>Setup</span>
            <strong>Permissions confirm safety.</strong>
          </div>
        </aside>
      </div>
    );
  }

  const errorMessage = params.error
    ? (errorCopy[params.error] ?? "Setup could not continue.")
    : null;

  if (step === "admin" && setup && setup.isAdministrator) {
    return (
      <div className="signin-layout">
        <section className="signin-panel">
          <div className="signin-heading">
            <p className="eyebrow">Step 2 of 2</p>
            <h1>Connect your services.</h1>
            <p>
              Hi {setup.displayName} — sign in as administrator, so we can
              safely wire up Radarr, Sonarr, Bazarr, and qBittorrent. Each
              connection is verified live before saving.
            </p>
          </div>
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
          <form className="jellyfin-form" action={completeServicesSetup}>
            <fieldset className="admin-optional">
              <legend>
                <ShieldCheck size={14} /> Service connections{" "}
                <small>Fill any — all are optional</small>
              </legend>
              <div className="admin-grid">
                <label className="field-label" htmlFor="radarrUrl">
                  Radarr URL
                </label>
                <input
                  className="text-input"
                  id="radarrUrl"
                  name="radarrUrl"
                  type="url"
                  placeholder="https://radarr.example"
                  defaultValue={services?.radarrUrl ?? ""}
                />
                <label className="field-label" htmlFor="radarrApiKey">
                  Radarr API key
                </label>
                <input
                  className="text-input"
                  id="radarrApiKey"
                  name="radarrApiKey"
                  type="password"
                  defaultValue={services?.radarrApiKey ?? ""}
                />
                <label className="field-label" htmlFor="sonarrUrl">
                  Sonarr URL
                </label>
                <input
                  className="text-input"
                  id="sonarrUrl"
                  name="sonarrUrl"
                  type="url"
                  placeholder="https://sonarr.example"
                  defaultValue={services?.sonarrUrl ?? ""}
                />
                <label className="field-label" htmlFor="sonarrApiKey">
                  Sonarr API key
                </label>
                <input
                  className="text-input"
                  id="sonarrApiKey"
                  name="sonarrApiKey"
                  type="password"
                  defaultValue={services?.sonarrApiKey ?? ""}
                />
                <label className="field-label" htmlFor="bazarrUrl">
                  Bazarr URL
                </label>
                <input
                  className="text-input"
                  id="bazarrUrl"
                  name="bazarrUrl"
                  type="url"
                  placeholder="https://bazarr.example"
                  defaultValue={services?.bazarrUrl ?? ""}
                />
                <label className="field-label" htmlFor="bazarrApiKey">
                  Bazarr API key
                </label>
                <input
                  className="text-input"
                  id="bazarrApiKey"
                  name="bazarrApiKey"
                  type="password"
                  defaultValue={services?.bazarrApiKey ?? ""}
                />
                <label className="field-label" htmlFor="qbittorrentUrl">
                  qBittorrent URL
                </label>
                <input
                  className="text-input"
                  id="qbittorrentUrl"
                  name="qbittorrentUrl"
                  type="url"
                  placeholder="https://qbittorrent.example"
                  defaultValue={services?.qbittorrentUrl ?? ""}
                />
                <label className="field-label" htmlFor="qbittorrentUsername">
                  qBittorrent username
                </label>
                <input
                  className="text-input"
                  id="qbittorrentUsername"
                  name="qbittorrentUsername"
                  defaultValue={services?.qbittorrentUsername ?? ""}
                />
                <label className="field-label" htmlFor="qbittorrentPassword">
                  qBittorrent password
                </label>
                <input
                  className="text-input"
                  id="qbittorrentPassword"
                  name="qbittorrentPassword"
                  type="password"
                  defaultValue={services?.qbittorrentPassword ?? ""}
                />
              </div>
            </fieldset>
            <label className="field-label" htmlFor="confirmation">
              Type CONNECT SERVICES
            </label>
            <input
              className="text-input"
              id="confirmation"
              name="confirmation"
              required
            />
            <button className="primary-button signin-button" type="submit">
              <LockKeyhole size={17} /> Connect services
            </button>
          </form>
          <form action={skipServicesSetup}>
            <button className="secondary-button" type="submit">
              <SkipForward size={17} /> Skip for now
            </button>
          </form>
        </section>
        <aside className="signin-art" aria-label="Arrmate setup illustration">
          <Image
            src="/assets/arrmate-orbit.svg"
            alt=""
            fill
            priority
            sizes="(min-width: 900px) 50vw, 100vw"
          />
          <div className="signin-art-copy">
            <span>Admin</span>
            <strong>Verified, encrypted, ready.</strong>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="signin-layout">
      <section className="signin-panel">
        <div className="signin-heading">
          <p className="eyebrow">First-run setup</p>
          <h1>Connect Arrmate to your stack.</h1>
          <p>
            Sign in with your Jellyfin credentials. Arrmate uses Jellyseerr to
            find your permissions and service URLs. After the first sign-in we
            will optionally connect Radarr, Sonarr, Bazarr, and qBittorrent.
          </p>
        </div>
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
        <form className="jellyfin-form" action={completeJellyseerrSetup}>
          <label className="field-label" htmlFor="jellyseerrUrl">
            Jellyseerr URL
          </label>
          <input
            className="text-input"
            id="jellyseerrUrl"
            name="jellyseerrUrl"
            type="url"
            required
            defaultValue={services?.jellyseerrUrl ?? ""}
            placeholder="https://your-jellyseerr-host"
          />
          <label className="field-label" htmlFor="jellyfinUrl">
            Jellyfin URL
          </label>
          <input
            className="text-input"
            id="jellyfinUrl"
            name="jellyfinUrl"
            type="url"
            required
            defaultValue={services?.jellyfinUrl ?? ""}
            placeholder="https://your-jellyfin-host"
          />
          <label className="field-label" htmlFor="username">
            Jellyfin username
          </label>
          <input
            className="text-input"
            id="username"
            name="username"
            autoComplete="username"
            required
          />
          <label className="field-label" htmlFor="password">
            Jellyfin password
          </label>
          <input
            className="text-input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <label className="field-label" htmlFor="confirmation">
            Type CONTINUE
          </label>
          <input
            className="text-input"
            id="confirmation"
            name="confirmation"
            required
          />
          <button className="primary-button signin-button" type="submit">
            <LogIn size={17} /> Continue
          </button>
        </form>
      </section>
      <aside className="signin-art" aria-label="Arrmate setup illustration">
        <Image
          src="/assets/arrmate-orbit.svg"
          alt=""
          fill
          priority
          sizes="(min-width: 900px) 50vw, 100vw"
        />
        <div className="signin-art-copy">
          <span>Setup</span>
          <strong>One connection. Every service.</strong>
        </div>
      </aside>
    </div>
  );
}
