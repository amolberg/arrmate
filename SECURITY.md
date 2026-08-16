# Security policy

Arrmate is designed to connect to powerful self-hosted services. Treat any deployment as security-sensitive.

## Reporting a vulnerability

Please do not open a public issue for a credential leak, authentication bypass, SSRF, authorization bypass, or destructive-action flaw. Until a project security contact is published, report privately to the project maintainer through the repository's private contact mechanism and include:

- affected version/commit;
- deployment context;
- reproducible steps;
- impact and suggested mitigation;
- whether any real credentials or personal data may have been exposed.

Do not include active API keys, passwords, private URLs, media libraries, or user data in the report.

## Security expectations

- Keep upstream service credentials server-side and out of browser bundles.
- Store secrets in a deployment secret manager or Vaultwarden, not `.env` files committed to Git.
- Validate and allow-list integration URLs to reduce SSRF risk.
- Enforce authorization on the server for every mutation.
- Require confirmation and audit destructive actions.
- Rate-limit public requests and authentication attempts.
- Do not expose admin controls through client-side-only route hiding.
- Redact authorization headers, cookies, passwords, and API keys from logs.
- Keep dependencies patched and review adapter changes carefully.

## Authentication boundary

Arrmate currently signs people in through Jellyseerr's Jellyfin authentication
endpoint. The password is exchanged once by a server action and is not stored.
The resulting Jellyseerr session is sealed with AES-256-GCM inside an HTTP-only
Arrmate cookie. Treat `AUTH_SECRET` as a production encryption key: make it
high-entropy, keep it consistent across replicas, and never commit it.

This design preserves each person's Jellyseerr permissions, attribution, and
quota. It does not make an internet-facing development deployment production
safe. Authentication rate limiting, deployment origin policy, and broader
session lifecycle controls remain release blockers.

## Scope

The project is early. The absence of a published release does not mean a deployment is safe by default. Operators are responsible for network exposure, TLS, identity provider configuration, backups, and upstream service permissions.

Arrmate is independent software and does not grant permission to access media or services that the operator is not authorized to use.
