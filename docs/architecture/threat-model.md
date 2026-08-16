# Initial threat model

## Assets

- Upstream API keys, usernames, passwords, and session cookies.
- Media library metadata and request history.
- Owner actions capable of deleting media or changing downloads.
- User roles, request limits, sessions, and audit evidence.

## Trust boundaries and mitigations

### Browser to Arrmate

Every mutation needs server-side permission enforcement. UI hiding is not a
security boundary. Sessions must use HTTP-only, secure, same-site cookies in
production. Authentication and public request endpoints require rate limiting
and CSRF-aware design.

The Jellyfin password enters only the Arrmate server action and is immediately
exchanged through Jellyseerr. It must never be logged, cached, persisted, added
to an error message, or returned to client JavaScript. The resulting upstream
session cookie is encrypted and authenticated inside the Arrmate cookie, but it
still carries the user's authority and must be handled like a credential.

`AUTH_SECRET` protects provider sessions. It must be high-entropy, at least 32
characters, stable across instances, and rotated with the understanding that a
rotation signs everyone out. TLS is required for any non-local deployment.

### Arrmate to upstream services

Credentials stay server-side and must be encrypted at rest before database
editing is enabled. Logs must redact headers, cookies, request bodies, and
configured URLs. Requests use deadlines and validated response shapes.

Operator-supplied integration URLs create SSRF risk. Only owners may configure
them. URLs are limited to HTTP(S), cannot embed credentials, and should be
resolved and checked against an operator-defined network allow-list before the
future editor is enabled. Redirects need the same validation. Private network
addresses cannot be prohibited by default because reaching homelab services is
the product's purpose.

### Destructive actions

Delete, replace, torrent removal, and library mutation are not implemented in
the first slice. They require an exact target summary, typed or otherwise
deliberate confirmation, a fresh authorization check, upstream outcome
handling, and an immutable audit event that records actor, target, and result.

### Public requests and quotas

Public discovery can leak library availability and viewing interests. Operators
need explicit exposure controls. Per-user quotas are enforced with conditional
database updates in a transaction. Network-level rate limits must additionally
protect anonymous searching, requests, and sign-in attempts.

## Deferred work before production

- Add authentication rate limits, lockout-aware responses, and session
  revocation/refresh behavior around the Jellyfin-through-Jellyseerr flow.
- Keep `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` stable and secret across instances.
- Encrypt stored integration credentials and define key rotation.
- Add CSRF and deployment-aware origin validation to mutations.
- Add application and edge rate limits.
- Define URL/network allow-lists and redirect checks.
- Implement append-only audit persistence and retention.
- Add secure deployment, proxy, TLS, backup, and recovery guidance.
