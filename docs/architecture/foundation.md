# Architecture foundation

## Boundaries

Arrmate owns users, roles, request limits, requests, integration configuration,
normalized cached state, and audit events. Jellyfin, the *arr services,
qBittorrent, and subtitle providers remain systems of record for their own
media and job state.

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

## Authorization

Roles map to explicit permissions in `src/domain/auth.ts`. Server actions and
application services must call `authorize` or `can`; route visibility is only a
convenience. Owner, maintainer, requester, and guest are intentionally separate
even when two roles temporarily share a permission.

Local development uses a signed, HTTP-only role cookie. It is not a production
identity system and is disabled in production unless explicitly enabled.

## Quotas and data

The PostgreSQL quota repository increments hourly and daily usage buckets with
conditional upserts inside one transaction. If any active bucket is full, the
transaction rolls back. This prevents straightforward concurrent requests from
oversubscribing a limit. The in-memory implementation exists only for isolated
domain tests and development.
