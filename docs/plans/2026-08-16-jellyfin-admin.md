# Jellyfin administration phase

The requester session through Jellyseerr is intentionally not sufficient for
administration. The next phase needs a separate server-side Jellyfin session
token and an explicit admin capability check before exposing any mutation.

Planned workflows:

- list users and account state;
- create a user with a one-time password setup flow;
- reset a password without displaying existing credentials;
- inspect per-user watch history;
- configure Jellyfin library/access policy and request limits through the
  Arrmate policy boundary.

Every mutation will require a Jellyfin administrator, typed confirmation where
destructive, and an Arrmate audit event. Jellyseerr request limits remain
upstream-owned unless an explicit synchronization policy is added.
