# Media details and season selection

Date: 2026-08-16

## Outcome

Make discovery results lead to a real, server-rendered detail surface. Movies
can be requested from that surface, while series requests require an explicit
season selection. The selected seasons are sent through the existing
Jellyseerr session and authorization boundary.

## Deliberate limits

- Detail data is read from Jellyseerr's media endpoints; no local metadata is
  synthesized when the provider is unavailable.
- Already available media remains non-requestable.
- Season availability and approval rules remain authoritative in Jellyseerr;
  Arrmate only validates the submitted season numbers and selection shape.
