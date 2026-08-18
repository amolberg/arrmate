# Arrmate for Android

Arrmate is a **native Android application** for controlling a self-hosted media stack. It is written in Kotlin with Jetpack Compose and connects from the Android device directly to each configured service.

There is no embedded website, WebView, Next.js application, Arrmate proxy, or required Arrmate server.

## Current native foundation

- Native Compose interface with edge-to-edge Android navigation.
- Direct connection support for Jellyfin, Jellyseerr, Sonarr, Radarr, Bazarr, and qBittorrent.
- Live credential verification against the real upstream service before a connection is saved.
- Concurrent service health and queue summaries on the overview screen.
- AES-256-GCM credential encryption using a non-exportable Android Keystore key.
- Explicit offline, authentication, TLS, timeout, and invalid-URL states.
- Private-network HTTP support for homelabs, with HTTPS recommended.

This commit establishes the correct Android architecture and connection layer. Native media browsing, request management, release search, subtitle workflows, download controls, and Android background notifications will build on these direct clients; they are not represented as finished until their native screens and actions exist.

## Build

Requirements:

- JDK 17 or newer
- Android SDK Platform 36

```bash
./gradlew test
./gradlew assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Add a service

Open **Connections**, tap **Add**, choose a service, and enter the URL reachable from the Android device. Arrmate tests the connection directly before encrypting and storing it locally.

- Jellyfin and qBittorrent use a username and password.
- Jellyseerr, Sonarr, Radarr, and Bazarr use an API key.
- URLs may point at a LAN address, VPN address, or HTTPS reverse proxy.

Android emulators use `10.0.2.2` to reach the development computer's loopback interface.

## Security

Credentials never enter a browser bundle or an Arrmate-controlled server. They do exist on the Android device because direct API access requires them. Connection records are encrypted at rest with Android Keystore; secrets are not logged or included in backups. See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
