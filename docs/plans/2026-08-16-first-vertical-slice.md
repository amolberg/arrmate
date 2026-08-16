# First vertical slice

Date: 2026-08-16

## Outcome

Ship a runnable, mobile-first Arrmate foundation that is useful before every
integration exists. The application must tell the truth about disconnected
services, provide a safe local-development sign-in boundary, and prove one
real adapter path through qBittorrent.

## Milestones

1. Establish the Next.js, TypeScript, CSS, test, and PostgreSQL foundations.
2. Define roles, permissions, request quotas, audit events, integrations, and
   normalized download state independently of any upstream service.
3. Implement a server-only qBittorrent adapter with response validation,
   timeouts, redacted errors, and focused tests.
4. Build the phone-first requester and operations surfaces with honest live,
   disconnected, loading, empty, and error states.
5. Verify formatting, lint, types, unit tests, browser workflows, and a
   production build; document architecture, UX, and security decisions.

## Deliberate limits

- qBittorrent is read-only in this milestone. Pause, delete, recheck, and
  manual-release mutations require audited confirmation flows in a later
  slice.
- Discovery does not synthesize media. Until a discovery provider is
  connected, the UI explains what is missing.
- Development sign-in is unavailable in production unless explicitly enabled.
- The database schema and atomic quota repository are included, but local
  pages remain useful when PostgreSQL is not running.
- No production homelab endpoint or credential is used for tests or demos.

## Acceptance checks

- A 360px viewport has complete navigation and no horizontal overflow.
- Requester/guest sessions cannot call owner-only server actions.
- Quota reservation cannot exceed an active bucket under concurrent calls.
- qBittorrent reports authentication, timeout, malformed-response, empty, and
  disconnected states distinctly.
- The default checkout starts without pretending any integration is online.
- The repository contains no secret, personal media metadata, or private URL.
