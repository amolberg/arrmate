# Arrmate agent instructions

Arrmate is a native Android application. Use Kotlin, Jetpack Compose, Android platform APIs, and direct on-device service clients.

- Never introduce Next.js, React, a WebView, an embedded website, or a required Arrmate backend.
- The Android device connects directly to Jellyfin, Jellyseerr, Sonarr, Radarr, Bazarr, qBittorrent, and future services.
- Store secrets with Android Keystore-backed authenticated encryption and never log them.
- Keep homelab failures explicit; do not show fake data or fake success states.
- Verify changes with the Gradle wrapper and preserve native accessibility and adaptive layouts.
