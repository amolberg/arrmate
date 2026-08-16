# Arrmate

**The friendly control plane for your self-hosted media stack.**

Arrmate is a planned open-source, mobile-first management experience for Jellyfin ecosystems. It brings discovery, requests, downloads, library health, subtitle workflows, and service operations into one fast interface instead of making people jump between a pile of separate dashboards.

> **Status:** early project foundation. This repository currently contains product direction and the implementation handoff prompt. It is not yet connected to a live media stack and does not pretend otherwise.

## The idea

The name comes from the *arr* family of services and a friendly companion that helps keep a homelab media setup moving. The product should feel like a polished native app on a phone, while remaining useful on tablets, desktop browsers, and eventually any device with a modern web browser.

Arrmate is inspired by the unified feel of nzb360, but the goal is a self-hosted, open-source product with a first-class request experience rather than a basic launcher for separate services.

## Product goals

- One responsive, smartphone-first interface for a Jellyfin media server and its supporting services.
- Live operational visibility: download queues, speeds, health, storage, jobs, and recent activity.
- Fast discovery and requests for movies and series.
- Admin workflows for manual torrent selection, queue actions, media deletion, replacement, searches, and subtitle management.
- A safe public/friend-facing experience with reduced permissions and configurable movie/series rate limits.
- Per-user permissions, quotas, audit history, and easy limit changes from a phone.
- A visual system that feels calm, quick, modern, and proud to be open source.
- No fake success states: when a service is disconnected or an action is unavailable, the UI should say so clearly.

## Initial integration targets

The first adapter boundary should be designed around these services, without making the core domain model depend on one vendor:

- Jellyfin
- Sonarr
- Radarr
- Prowlarr
- Bazarr
- Seerr or Jellyseerr compatibility where useful
- qBittorrent
- Huntarr and other optional *arr ecosystem tools

Future adapters may include download clients, indexers, media servers, notification providers, transcoding/health tools, and alternative implementations of the same capability.

## Permission model direction

Arrmate should support at least these conceptual roles:

- **Owner/admin:** service configuration, integrations, users, quotas, manual torrent controls, destructive media actions, audit logs, and system settings.
- **Maintainer:** operational controls and library workflows, but no ownership/security changes unless explicitly granted.
- **Requester:** discovery, requests, request status, and permitted subtitle or notification preferences.
- **Guest:** narrowly scoped public discovery/request experience governed by configured limits.

Every mutation should be authorized server-side. Hiding a button is not authorization.

## Suggested technical direction

The implementation handoff should validate the details, but the working direction is:

- Next.js with TypeScript for the web application and API boundary.
- Tailwind CSS plus shadcn/ui primitives, with a custom Arrmate visual system rather than an untouched component template.
- PostgreSQL for Arrmate-owned users, sessions, permissions, quotas, integrations, request records, audit events, and cached normalized state.
- A background job/refresh layer for polling and reconciling external services without blocking the UI.
- Typed adapter interfaces and capability checks so unsupported service features degrade gracefully.
- Docker-first local development with an explicit `.env.example` and no credentials in Git.
- Tests at the domain, adapter, authorization, and browser workflow boundaries.

## Repository layout target

```text
src/
  app/                 # routes and screens
  components/          # reusable UI
  features/            # vertical product slices
  server/              # application services and adapter orchestration
  adapters/            # external service integrations
  db/                  # schema, migrations, repositories
  lib/                 # shared utilities and typed contracts
  styles/              # design tokens and global styles
docs/
  product/             # product and UX decisions
  architecture/        # system and adapter decisions
  plans/               # implementation plans
public/
tests/
NEXT_PROMPT.md
```

This is a direction, not permission to build every future feature in the first milestone. The first implementation should establish a trustworthy vertical slice: authentication/roles, service connection health, a mobile dashboard, media search, a request, and a visible live download status.

## Safety and privacy

Arrmate is intended for self-hosted deployments. Integrations will handle powerful APIs and potentially destructive actions. The project must therefore:

- keep credentials server-side and encrypted at rest where practical;
- never expose upstream API keys to browsers or requesters;
- require explicit confirmation for destructive operations;
- log who performed destructive and administrative actions;
- make rate limits and public access boundaries explicit;
- avoid assuming that an internet-facing deployment is safe merely because the UI has a login page;
- provide a threat model and deployment security documentation before calling a release production-ready.

## Development

The implementation has not started yet. Read [`NEXT_PROMPT.md`](./NEXT_PROMPT.md) for the next coding-AI handoff. The handoff is deliberately designed to begin with repository inspection, product decisions, and a small verified vertical slice rather than generating a large untested scaffold.

When development begins, the expected local flow will be documented here and should include:

```bash
cp .env.example .env
# install dependencies using the committed package manager
# start the local database and app
# run lint, typecheck, unit tests, and browser tests
```

## Contributing

Arrmate should be welcoming to homelab users who are not enterprise developers. Contributions need clear setup instructions, reproducible tests, security-minded review, and an explanation of how a change behaves when an external service is unavailable.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`SECURITY.md`](./SECURITY.md), and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## License

MIT. See [`LICENSE`](./LICENSE).

## Name note

The working project name is **Arrmate**, selected by Zeb on 2026-08-16. It can still evolve before the first public release, but the local project and repository foundation use this name consistently.
