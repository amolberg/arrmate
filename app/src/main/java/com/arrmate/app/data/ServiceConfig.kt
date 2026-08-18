package com.arrmate.app.data

import java.net.URI
import java.util.UUID

enum class ServiceType(val displayName: String, val credentialHint: String) {
    JELLYFIN("Jellyfin", "Jellyfin password"),
    JELLYSEERR("Jellyseerr", "API key"),
    SONARR("Sonarr", "API key"),
    RADARR("Radarr", "API key"),
    BAZARR("Bazarr", "API key"),
    QBITTORRENT("qBittorrent", "Password"),
}

data class ServiceConfig(
    val id: String = UUID.randomUUID().toString(),
    val type: ServiceType,
    val name: String = type.displayName,
    val baseUrl: String,
    val username: String = "",
    val secret: String = "",
)

data class ServiceSnapshot(
    val config: ServiceConfig,
    val state: ConnectionState,
    val detail: String,
)

enum class ConnectionState { CHECKING, ONLINE, OFFLINE }

fun normalizeBaseUrl(input: String): String {
    val trimmed = input.trim().trimEnd('/')
    require(trimmed.isNotBlank()) { "Enter a service URL" }
    val uri = runCatching { URI(trimmed) }.getOrElse { throw IllegalArgumentException("Enter a valid URL") }
    require(uri.scheme == "http" || uri.scheme == "https") { "URL must start with http:// or https://" }
    require(!uri.host.isNullOrBlank()) { "URL must include a host" }
    require(uri.userInfo == null && uri.query == null && uri.fragment == null) {
        "URL cannot contain credentials, a query, or a fragment"
    }
    return trimmed
}

fun ServiceType.requiresUsername(): Boolean = this == ServiceType.JELLYFIN || this == ServiceType.QBITTORRENT

fun ServiceConfig.validate(): ServiceConfig {
    val normalizedUrl = normalizeBaseUrl(baseUrl)
    require(name.isNotBlank()) { "Enter a connection name" }
    require(secret.isNotBlank()) { "Enter ${type.credentialHint.lowercase()}" }
    if (type.requiresUsername()) require(username.isNotBlank()) { "Enter a username" }
    return copy(name = name.trim(), baseUrl = normalizedUrl, username = username.trim())
}
