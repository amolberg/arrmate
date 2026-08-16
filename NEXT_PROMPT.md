# Completed handoff: Arrmate foundation and first vertical slice

> This milestone was implemented and verified on 2026-08-16. It remains in
> the repository as the acceptance record for the first vertical slice; it is
> not the current next-step prompt. See `docs/plans/` and the README for the
> implemented state.

You are the implementation agent for **Arrmate**, an open-source, self-hosted, mobile-first media management control plane inspired by the unified feel of nzb360.

## Mission

Turn this repository foundation into a small, real, tested vertical slice for managing a Jellyfin-oriented *arr stack. Do not build a fake dashboard, do not invent successful API responses, and do not create a huge speculative scaffold. Work in small milestones and leave the repository in a runnable state after each milestone.

The product vision is documented in `README.md`. Preserve it, but verify assumptions against current project files and upstream API documentation before coding. The first release direction includes:

- Jellyfin, Sonarr, Radarr, Prowlarr, Bazarr, Seerr/Jellyseerr, qBittorrent, and optional Huntarr-style integrations;
- live download and service health stats;
- media discovery and requests;
- admin-only operational actions such as manual torrent selection, queue controls, deleting/replacing media, and subtitle searches;
- a public/friend-facing request experience with reduced permissions and configurable movie/series limits;
- user-level permissions, quotas, auditability, and a smartphone-first responsive UI.

## Non-negotiable constraints

1. **Inspect first.** Read `README.md`, `.gitignore`, and the complete repository state before making architectural decisions.
2. **Use the project root.** Work only in the verified Arrmate checkout. Do not write into the Hermes workspace or another project.
3. **No secrets in Git.** Check the vault before using any existing credential. Never place upstream API keys, passwords, tokens, personal data, or real service URLs in source, tests, fixtures, logs, screenshots, or commits. Use `.env.example` with obvious placeholders and keep `.env` ignored.
4. **No fake integration claims.** If a service is not configured, show a disconnected/unknown state. Tests may use explicit local fixtures or mocked adapter responses, but the UI must not imply that mocked data is live.
5. **Server-side authorization is mandatory.** Requester/guest UI restrictions are not sufficient. Every mutation must pass a server-side permission check, including destructive media and torrent operations.
6. **Keep external actions reversible and explicit.** Destructive actions need typed confirmation, clear scope, and audit events. Do not auto-delete, auto-replace, or auto-start downloads as a shortcut.
7. **Mobile first, not mobile only.** Design for a 360px-wide viewport first, then make tablet and desktop layouts feel intentional. Use accessible touch targets, keyboard support, reduced-motion behavior, and visible loading/error/empty states.
8. **Do not overbuild.** Start with a thin vertical slice, not all integrations and all screens at once.
9. **Test continuously.** Run formatting, lint, typecheck, unit tests, and browser tests where applicable. Fix failures before moving on.
10. **Document non-obvious discoveries.** If an upstream API quirk or deployment issue appears, add a concise guide under `docs/`.

## First milestone: verified local vertical slice

Implement the smallest coherent feature set:

### A. Project and runtime foundation

- Choose and document the package manager and supported Node.js version.
- Create a clean Next.js + TypeScript application foundation only if the repository is empty.
- Add Tailwind and shadcn/ui primitives only as needed. Create Arrmate-specific design tokens rather than copying a generic starter aesthetic.
- Add `.env.example` containing placeholders for database URL, session/auth secret, public app URL, and integration base URLs/API keys. Do not put actual values in it.
- Add a local Docker Compose setup for the Arrmate-owned database if needed. Keep it isolated from any homelab production database.
- Add scripts for dev, build, lint, typecheck, unit tests, and browser tests.

### B. Domain and authorization core

Create typed domain boundaries for:

- users and roles;
- per-user movie and series request limits;
- request records and lifecycle states;
- integration records and connection health;
- audit events.

Implement server-side authorization helpers with tests covering at least:

- admin can manage integrations, users, quotas, and destructive operations;
- maintainer can operate permitted media workflows but cannot change owner/security settings;
- requester can search and submit requests within quota;
- guest cannot access admin routes or mutate integrations;
- quota checks are enforced atomically enough to prevent simple double-submit races.

Use a real persistence layer for Arrmate-owned state or clearly isolate a temporary development repository behind interfaces with an explicit follow-up issue. Do not bury authorization in React components.

### C. Adapter contracts and one real integration path

Define typed adapter interfaces for media servers, media managers, indexers, subtitle providers, and download clients. Include capability/error types so an unavailable endpoint is distinguishable from an empty result.

Implement one real, server-side adapter end to end first, preferably qBittorrent or Jellyfin, after checking its current official API documentation. The adapter must:

- read credentials only on the server;
- validate responses;
- set request timeouts;
- return normalized domain data;
- expose health/error information;
- have unit tests for success, authentication failure, timeout, malformed response, and empty result;
- never log credentials or full authorization headers.

Stub other adapters only behind the same interfaces, with an honest “not configured” state.

### D. Mobile-first screens

Create a polished but restrained UI with these flows:

1. Sign-in or local development sign-in boundary.
2. Dashboard showing service health, request activity, and live download status from the adapter boundary.
3. Search/discover screen with an explicit “not connected” or fixture state when no media provider is configured.
4. Request detail/action flow with quota feedback.
5. Admin integration health screen and a safe settings/users view.
6. A requester/guest view that does not render or call admin mutations.

Use a small number of real components. Prefer skeletons, optimistic states only where rollback is real, and clear retry actions. Add accessibility labels and reduced-motion handling.

### E. Verification and documentation

- Add a concise architecture document under `docs/architecture/` explaining the adapter boundary, data ownership, auth boundary, and first integration.
- Add a product/UX note under `docs/product/` describing the mobile navigation, admin vs requester surfaces, and quota behavior.
- Add a threat-model note covering API-key handling, public request access, SSRF risks from user-supplied integration URLs, destructive actions, and audit logs.
- Add automated tests and run them for real.
- Run a production build. If browser tests require a server, start it with a bounded process and verify the actual HTTP response.
- Finish with an exact report containing changed files, commands run, real test/build output, remaining limitations, and the next smallest milestone.

## Quality bar

The result should feel like the beginning of a product, not a template demo. Avoid neon dashboard clutter, giant unbounded tables, fake charts, and placeholder buttons that do nothing. Use calm hierarchy, fast perceived response, strong empty/error states, and a visual language that can scale to a future native wrapper.

When uncertain, make the smallest reversible choice, document it, and continue. Ask the human only when the decision changes the product boundary or would require an external side effect.

## Handoff discipline

- Keep commits small and descriptive.
- Do not publish a public repository or deploy externally without explicit approval.
- Do not initiate another coding agent from this prompt.
- Before claiming completion, verify the final files from disk and the Git status.
- If the implementation is blocked, report the exact blocker rather than fabricating success.

Begin by inspecting the repository and then produce a short implementation plan in `docs/plans/` before writing application code.
