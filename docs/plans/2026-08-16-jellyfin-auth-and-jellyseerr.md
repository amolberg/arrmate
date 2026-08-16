# Jellyfin sign-in and Jellyseerr request slice

Date: 2026-08-16

## Outcome

Let a person sign into Arrmate with the Jellyfin credentials they already use,
then search, request, and see quota information through their own Jellyseerr
identity. Add an original Arrmate SVG brand and artwork system suitable for the
web app, installable icons, repository presentation, and future marketing.

## Security decisions

- Credentials are accepted only by a server action and immediately exchanged
  with Jellyseerr's Jellyfin authentication endpoint. They are never persisted,
  logged, or returned to client code.
- Arrmate stores the resulting upstream session cookie inside an authenticated,
  AES-256-GCM-encrypted, HTTP-only Arrmate cookie with a bounded lifetime.
- Discovery and request calls use the person's Jellyseerr session, not an admin
  API key, so upstream permissions, attribution, and quotas remain authoritative.
- Jellyseerr admin permission maps to Arrmate owner; request-management
  permissions map to maintainer; everyone else maps to requester.
- Integration requests reject redirects, validate response shapes, and use
  deadlines. Upstream failure is distinct from an empty result.

## Deliberate limits

- Arrmate does not create Jellyfin or Jellyseerr accounts.
- User and quota editing remain a later admin workflow. This slice reads and
  presents the limits already configured in Jellyseerr.
- TV requests initially request all seasons. Season-by-season selection belongs
  in the next media-detail flow.
- Raster campaign artwork is deferred because the built-in generator is not
  available in this session. All delivered artwork is original editable SVG.
