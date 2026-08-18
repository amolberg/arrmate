# Security policy

Arrmate connects directly to powerful administrative APIs. Only connect to systems you own or are authorized to manage.

## Device security boundary

- Complete connection records are encrypted with AES-GCM using a non-exportable Android Keystore key.
- Android backup is disabled so service credentials are not copied into cloud backups.
- Secrets must never be logged, placed in crash reports, committed, or rendered as plain text.
- Removing a connection deletes its encrypted record from the app's private storage.
- Uninstalling Arrmate removes its records and Keystore key.

Rooted or compromised devices can defeat application-level protections. Use restricted upstream accounts/API keys where supported and revoke credentials if a device is lost.

## Network security

Arrmate permits cleartext HTTP because many homelab services are LAN-only. HTTP exposes credentials and media metadata to anyone able to observe that network. Prefer HTTPS through a trusted reverse proxy or a private encrypted VPN such as WireGuard/Tailscale.

The app does not follow HTTP redirects, which prevents a configured endpoint from silently forwarding credentials to another host. TLS certificate failures are shown rather than bypassed.

## Reporting

Report vulnerabilities privately through the repository maintainer's private contact mechanism. Do not include active credentials, private URLs, or personal media data.
