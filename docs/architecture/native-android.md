# Native Android architecture

Arrmate is a single Android application module using Kotlin and Jetpack Compose.

```text
Compose UI → ViewModel → Repository → Direct service client → Homelab service
                              ↓
                    Android Keystore store
```

The app has no server component. `DirectServiceClient` selects the upstream endpoint and authentication convention for each service. It uses bounded OkHttp calls, rejects redirects, and converts transport/upstream errors into explicit connection states. `SecureServiceStore` encrypts each complete connection record with AES-GCM under a non-exportable Android Keystore key.

Initial service probes:

| Service | Direct endpoint/authentication |
| --- | --- |
| Jellyfin | `/System/Info/Public`, then `/Users/AuthenticateByName` with Jellyfin device authorization |
| Jellyseerr | `/api/v1/status` with `X-Api-Key` |
| Sonarr | `/api/v3/system/status` and `/api/v3/queue` with `X-Api-Key` |
| Radarr | `/api/v3/system/status` and `/api/v3/queue` with `X-Api-Key` |
| Bazarr | `/api/system/status` with `X-API-KEY` |
| qBittorrent | `/api/v2/auth/login`, then its authenticated Web API session |

Feature-specific repositories should build on this boundary. They must not route requests through an Arrmate-operated service or expose secrets outside application-private storage.
