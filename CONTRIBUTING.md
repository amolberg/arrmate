# Contributing

Arrmate is a native Kotlin/Jetpack Compose Android project. Do not add a WebView, website runtime, companion web server, or server-side proxy as a substitute for native functionality.

Before submitting a change:

```bash
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

Keep service clients direct, typed, bounded by timeouts, and honest about upstream failures. Never log URLs containing credentials, API keys, passwords, tokens, cookies, or private media metadata. Destructive operations need a native confirmation flow and tests.
