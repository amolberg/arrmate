package com.arrmate.app.data

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/** Calls upstream homelab services directly. No Arrmate proxy or web application is involved. */
class DirectServiceClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .callTimeout(15, TimeUnit.SECONDS)
        .followRedirects(false)
        .build(),
) {
    suspend fun inspect(input: ServiceConfig): ServiceSnapshot = withContext(Dispatchers.IO) {
        val config = input.validate()
        runCatching {
            val detail = when (config.type) {
                ServiceType.SONARR, ServiceType.RADARR -> inspectArr(config)
                ServiceType.BAZARR -> inspectBazarr(config)
                ServiceType.JELLYFIN -> inspectJellyfin(config)
                ServiceType.JELLYSEERR -> inspectJellyseerr(config)
                ServiceType.QBITTORRENT -> inspectQbittorrent(config)
            }
            ServiceSnapshot(config, ConnectionState.ONLINE, detail)
        }.getOrElse { error ->
            ServiceSnapshot(config, ConnectionState.OFFLINE, friendlyError(error))
        }
    }

    private fun inspectArr(config: ServiceConfig): String {
        val status = getJson(config, "/api/v3/system/status", "X-Api-Key" to config.secret)
        val queue = getJson(config, "/api/v3/queue?page=1&pageSize=1", "X-Api-Key" to config.secret)
        val version = status.optString("version", "connected")
        val queued = queue.optInt("totalRecords", 0)
        return "v$version · $queued queued"
    }

    private fun inspectBazarr(config: ServiceConfig): String {
        val status = getJson(config, "/api/system/status", "X-API-KEY" to config.secret)
        val version = status.optJSONObject("data")?.optString("bazarr_version")
            ?: status.optString("version", "connected")
        return if (version.startsWith("v")) version else "v$version"
    }

    private fun inspectJellyseerr(config: ServiceConfig): String {
        val status = getJson(config, "/api/v1/status", "X-Api-Key" to config.secret)
        val version = status.optString("version", "connected")
        return "v$version · requests ready"
    }

    private fun inspectJellyfin(config: ServiceConfig): String {
        val publicInfo = getJson(config, "/System/Info/Public")
        authenticateJellyfin(config)
        val serverName = publicInfo.optString("ServerName", "Jellyfin")
        val version = publicInfo.optString("Version", "connected")
        return "$serverName · v$version"
    }

    private fun authenticateJellyfin(config: ServiceConfig): String {
        val body = JSONObject()
            .put("Username", config.username)
            .put("Pw", config.secret)
            .toString()
            .toRequestBody(JSON)
        val request = Request.Builder()
            .url(endpoint(config, "/Users/AuthenticateByName"))
            .header("X-Emby-Authorization", jellyfinAuthorization())
            .post(body)
            .build()
        return execute(request).use { response ->
            val text = response.body?.string().orEmpty()
            ensureSuccess(response.code, text)
            JSONObject(text).getString("AccessToken")
        }
    }

    private fun inspectQbittorrent(config: ServiceConfig): String {
        val login = Request.Builder()
            .url(endpoint(config, "/api/v2/auth/login"))
            .post(FormBody.Builder().add("username", config.username).add("password", config.secret).build())
            .build()
        val cookie = execute(login).use { response ->
            val text = response.body?.string().orEmpty()
            ensureSuccess(response.code, text)
            if (text.trim() != "Ok.") throw IOException("qBittorrent rejected the credentials")
            response.headers.values("Set-Cookie").joinToString("; ") { it.substringBefore(';') }
        }
        val versionRequest = Request.Builder()
            .url(endpoint(config, "/api/v2/app/version"))
            .header("Cookie", cookie)
            .get()
            .build()
        return execute(versionRequest).use { response ->
            val version = response.body?.string().orEmpty()
            ensureSuccess(response.code, version)
            "$version · downloads ready"
        }
    }

    private fun getJson(config: ServiceConfig, path: String, header: Pair<String, String>? = null): JSONObject {
        val builder = Request.Builder().url(endpoint(config, path)).get()
        header?.let { builder.header(it.first, it.second) }
        return execute(builder.build()).use { response ->
            val text = response.body?.string().orEmpty()
            ensureSuccess(response.code, text)
            JSONObject(text)
        }
    }

    private fun execute(request: Request) = http.newCall(request).execute()

    private fun endpoint(config: ServiceConfig, path: String) = config.baseUrl.trimEnd('/') + path

    private fun ensureSuccess(code: Int, responseBody: String) {
        if (code !in 200..299) {
            val upstream = runCatching { JSONObject(responseBody).optString("message") }.getOrNull()
            throw IOException(upstream?.takeIf { it.isNotBlank() } ?: "Service returned HTTP $code")
        }
    }

    private fun jellyfinAuthorization() =
        "MediaBrowser Client=\"Arrmate\", Device=\"Android\", DeviceId=\"arrmate-android\", Version=\"${BuildVersion.NAME}\""

    private fun friendlyError(error: Throwable): String = when (error) {
        is IllegalArgumentException -> error.message ?: "Invalid connection settings"
        is java.net.UnknownHostException -> "Host not found"
        is java.net.SocketTimeoutException -> "Connection timed out"
        is javax.net.ssl.SSLException -> "TLS certificate could not be verified"
        else -> error.message?.take(120) ?: "Could not connect"
    }

    private object BuildVersion { const val NAME = "0.1.0" }

    private companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
