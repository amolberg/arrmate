# Arrmate

**The friendly control plane for your self-hosted media stack.**

Arrmate is an open-source, mobile-first management experience for Jellyfin ecosystems. It brings discovery, requests, downloads, library health, subtitle workflows, and service operations into one fast interface instead of making people jump between a pile of separate dashboards.

> **Status:** first working vertical slice. The responsive requester and operator surfaces, role model, PostgreSQL schema, atomic quota core, and read-only qBittorrent adapter are implemented. Other integrations remain honest disconnected states.

## The idea

The name comes from the _arr_ family of services and a friendly companion that helps keep a homelab media setup moving. The product should feel like a polished native app on a phone, while remaining useful on tablets, desktop browsers, and eventually any device with a modern web browser.

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

## Technical foundation

The current implementation uses:

- Next.js 16 with strict TypeScript for the web application and server boundary.
- A custom responsive CSS design system with no external font or image request.
- PostgreSQL for Arrmate-owned users, sessions, permissions, quotas, integrations, request records, audit events, and cached normalized state.
- Typed adapter interfaces and capability checks so unsupported service features degrade gracefully.
- A server-only, response-validated qBittorrent adapter for live queue and transfer data.
- Docker-first local development and tests at the domain, adapter, authorization, and browser workflow boundaries.

## Repository layout

```text
src/
  app/                 # routes and screens
  components/          # reusable UI
  server/              # application services and adapter orchestration
  adapters/            # external service integrations
  db/                  # schema, migrations, repositories
docs/
  product/             # product and UX decisions
  architecture/        # system and adapter decisions
  plans/               # implementation plans
tests/
NEXT_PROMPT.md
```

The current slice deliberately keeps qBittorrent read-only and leaves discovery disconnected until a real provider is configured. Queue mutations, media deletion/replacement, and production authentication are future audited workflows—not placeholder buttons.

## Safety and privacy

Arrmate is intended for self-hosted deployments. Integrations will handle powerful APIs and potentially destructive actions. The project must therefore:

- keep credentials server-side and encrypted at rest where practical;
- never expose upstream API keys to browsers or requesters;
- require explicit confirmation for destructive operations;
- log who performed destructive and administrative actions;
- make rate limits and public access boundaries explicit;
- avoid assuming that an internet-facing deployment is safe merely because the UI has a login page;
- provide a threat model and deployment security documentation before calling a release production-ready.

## Local development

```bash
npm install
cp .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run dev
```

Node.js 22 or newer and npm 10 are supported. No integration is required to open the app; unconfigured services show a disconnected state. To use the live qBittorrent read path, replace only the qBittorrent placeholders in `.env.local` with an authorized server URL and credentials.

Before contributing, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:browser
npm run build
```

Architecture, threat-model, product, and milestone decisions live under [`docs/`](./docs/).

## Contributing

Arrmate should be welcoming to homelab users who are not enterprise developers. Contributions need clear setup instructions, reproducible tests, security-minded review, and an explanation of how a change behaves when an external service is unavailable.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`SECURITY.md`](./SECURITY.md), and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## License

MIT. See [`LICENSE`](./LICENSE).

## Name note

The working project name is **Arrmate**, selected by Zeb on 2026-08-16. It can still evolve before the first public release, but the local project and repository foundation use this name consistently.
