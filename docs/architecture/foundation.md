# Architecture foundation

## Boundaries

Jellyfin owns media identities. In the current slice Jellyseerr owns the
user-scoped session, permissions, request limits, and request records. Arrmate
normalizes those capabilities into its own role and discovery models without
copying a password or silently becoming an administrator on the person's
behalf. The *arr services, qBittorrent, and subtitle providers remain systems
of record for their media and job state.

The optional PostgreSQL schema provides a foundation for Arrmate-owned policy overlays,
integration configuration, normalized cached state, and audit events. Those
records are not yet presented as live product state unless a repository is
actually connected.

Browser code never talks to those services directly. A server-side adapter
authenticates upstream, validates responses, applies timeouts, and returns a
small normalized domain model. This prevents upstream API keys from entering a
browser bundle and stops UI components from depending on vendor response
shapes.

```text
browser -> Arrmate authorization -> application service -> typed adapter -> upstream
                              \-> PostgreSQL + audit events
```

An adapter returns a discriminated result. `not-configured`, authentication,
timeout, unreachable, malformed-response, and upstream failures remain
distinct from a successful empty response. The UI can therefore state that a
queue is empty only after a valid upstream response.

## First adapter

`QbittorrentAdapter` implements the read-only `DownloadClientAdapter`. It logs
in through qBittorrent Web API v2, keeps the session cookie server-side, reads
transfer and torrent information, validates both payloads with Zod, and maps
vendor states into Arrmate download states. Mutating capabilities are false in
this milestone.

The adapter currently reads deployment environment configuration. The future
integration editor must encrypt credentials before persistence and emit audit
events when an owner changes or tests a connection.

Sonarr and Radarr use the same server-only boundary for a read-only system
status check. Their API keys are sent in an `X-Api-Key` header, never in a URL
or browser response. Invalid keys, unavailable hosts, timeouts, and malformed
status payloads remain distinct adapter errors and are surfaced as offline or
degraded service health in Operations.

## Jellyfin identity through Jellyseerr

The sign-in form is a server action. It exchanges a Jellyfin username and
password once with Jellyseerr's `/api/v1/auth/jellyfin` endpoint. Browser-side
code never calls Jellyfin or Jellyseerr directly, and Arrmate never persists
the password.

On success, Jellyseerr returns a user profile and `connect.sid` session. Arrmate
puts that upstream session inside an AES-256-GCM authenticated envelope stored
as a same-site, HTTP-only `arrmate-session` cookie for up to 12 hours. The
envelope key is derived from `AUTH_SECRET`; production refuses the documented
placeholder or a secret shorter than 32 characters. Every instance in a
deployment must share the same secret.

Search, quota lookup, and request submission use that person's Jellyseerr
session. This preserves upstream attribution, separate movie/series
permissions, auto-approval behavior, and configured request limits. No
Jellyseerr administrator API key is required for this path.

## Authorization

Roles map to explicit permissions in `src/domain/auth.ts`. Server actions and
application services must call `authorize` or `can`; route visibility is only a
convenience. Owner, maintainer, requester, and guest are intentionally separate
even when two roles temporarily share a permission.

Jellyseerr's `ADMIN` permission maps to owner. Settings, user, or request
management permissions map to maintainer. Other authenticated people are
requesters, with movie and series request abilities checked independently.

Local development also offers a signed, HTTP-only role cookie. It is not a
production identity system and is disabled in production unless explicitly
enabled.

## Quotas and data

The PostgreSQL quota repository increments hourly and daily usage buckets with
conditional upserts inside one transaction. If any active bucket is full, the
transaction rolls back. This prevents straightforward concurrent requests from
oversubscribing a limit. The in-memory implementation exists only for isolated
domain tests and development.

## Encrypted local service store

Arrmate ships with a `/setup` wizard so the operator can connect services
without editing `.env.local` and redeploying. The wizard writes to
`.data/managed-services.json` on the server, sealed with AES-256-GCM using
the same key derivation as the user-scoped session cookie. The store is
file-based, mode `0600`, and only readable by the Arrmate process.

The adapter integration helpers in `src/server/integrations/*.ts` consult
`configuredServices()` first and fall back to `process.env`. This keeps
existing deployments working while letting new operators drive everything
through the wizard.

Every optional service URL/key is verified against the live upstream before
being saved: a Radarr API key check, a Sonarr status probe, a Bazarr
`/api/system/status` call, and a qBittorrent login. Failed checks return a
typed `AdapterError` that the wizard renders as a friendly inline message
without leaking the failure into other services.

The wizard only reveals Radarr/Sonarr/Bazarr/qBittorrent inputs after a
Jellyfin administrator sign-in. A sealed setup session cookie holds the
verified Jellyfin token until the operator submits the second step.
