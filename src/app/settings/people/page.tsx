import { Eye, ShieldAlert, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { createJellyfinUser, resetJellyfinPassword } from "@/app/actions";
import { getProviderSession } from "@/server/auth/session";
import { jellyfinFromEnvironment } from "@/server/integrations/jellyfin";

export const metadata = { title: "People & access" };
export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; mutation?: string }>;
}) {
  const session = await getProviderSession();
  if (!session?.jellyfin?.isAdministrator) redirect("/settings");
  const adapter = jellyfinFromEnvironment();
  if (!adapter) redirect("/settings");
  const usersResult = await adapter.users(session.jellyfin.token);
  const users = usersResult.ok ? usersResult.data : [];
  const params = await searchParams;
  const selectedId = params.user || users[0]?.id;
  const mutation = params.mutation;
  const historyResult = selectedId
    ? await adapter.watchHistory(session.jellyfin.token, selectedId)
    : null;
  const selected = users.find((user) => user.id === selectedId);

  return (
    <div className="page-stack compact-stack narrow-page">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Jellyfin administration</p>
          <h1>People & access</h1>
          <p className="page-lead">
            Review accounts and playback history from Jellyfin.
          </p>
        </div>
      </section>
      <div className="security-banner">
        <ShieldAlert size={20} />
        <div>
          <strong>Read-only admin preview</strong>
          <p>
            Account creation, password resets, and policy changes will require
            audited confirmation.
          </p>
        </div>
      </div>
      {mutation && (
        <div
          className={
            mutation === "created" || mutation === "password-reset"
              ? "request-notice success"
              : "request-notice error"
          }
          role="status"
        >
          <strong>
            {mutation === "created"
              ? "User created"
              : mutation === "password-reset"
                ? "Password reset"
                : mutation === "audit-unavailable"
                  ? "Change not recorded: database audit is unavailable"
                  : "User action could not be completed"}
          </strong>
        </div>
      )}
      {!usersResult.ok ? (
        <section className="surface-card min-card">
          <EmptyState
            icon={ShieldAlert}
            title="Jellyfin users unavailable"
            description={usersResult.error.message}
          />
        </section>
      ) : (
        <div className="people-layout">
          <section className="people-list" aria-label="Jellyfin users">
            {users.map((user) => (
              <a
                className={`person-row${user.id === selectedId ? " selected" : ""}`}
                href={`/settings/people?user=${encodeURIComponent(user.id)}`}
                key={user.id}
              >
                <span className="settings-icon">
                  <UserRound size={18} />
                </span>
                <span>
                  <strong>{user.displayName}</strong>
                  <small>
                    {user.isAdministrator ? "Administrator" : "Requester"}
                    {user.disabled ? " · Disabled" : ""}
                  </small>
                </span>
              </a>
            ))}
          </section>
          <section className="surface-card history-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Watch history</p>
                <h2>{selected?.displayName || "Select a user"}</h2>
              </div>
              <Eye size={19} />
            </div>
            {historyResult && !historyResult.ok ? (
              <p className="form-error">{historyResult.error.message}</p>
            ) : historyResult?.data.length ? (
              <div className="history-list">
                {historyResult.data.map((item, index) => (
                  <div
                    className="history-row"
                    key={`${item.title}-${item.playedAt}-${index}`}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.type}</span>
                    </div>
                    <small>
                      {item.playedAt
                        ? new Date(item.playedAt).toLocaleDateString()
                        : "Date unavailable"}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Eye}
                title="No watch history"
                description="No played titles were returned for this account."
              />
            )}
          </section>
        </div>
      )}
      <section className="admin-forms">
        <form className="surface-card admin-form" action={createJellyfinUser}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Account setup</p>
              <h2>Create user</h2>
            </div>
          </div>
          <label className="field-label" htmlFor="new-display-name">
            Display name
          </label>
          <input
            className="text-input"
            id="new-display-name"
            name="displayName"
            required
            maxLength={80}
          />
          <label className="field-label" htmlFor="new-password">
            Temporary password
          </label>
          <input
            className="text-input"
            id="new-password"
            name="password"
            type="password"
            minLength={12}
            required
          />
          <label className="field-label" htmlFor="new-confirmation">
            Type CREATE USER
          </label>
          <input
            className="text-input"
            id="new-confirmation"
            name="confirmation"
            required
          />
          <button className="secondary-button" type="submit">
            Create Jellyfin user
          </button>
        </form>
        {selected && (
          <form
            className="surface-card admin-form"
            action={resetJellyfinPassword}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Account security</p>
                <h2>Reset {selected.displayName}</h2>
              </div>
            </div>
            <input type="hidden" name="userId" value={selected.id} />
            <label className="field-label" htmlFor="reset-password">
              New password
            </label>
            <input
              className="text-input"
              id="reset-password"
              name="password"
              type="password"
              minLength={12}
              required
            />
            <label className="field-label" htmlFor="reset-confirmation">
              Type RESET PASSWORD
            </label>
            <input
              className="text-input"
              id="reset-confirmation"
              name="confirmation"
              required
            />
            <button className="secondary-button" type="submit">
              Reset password
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
