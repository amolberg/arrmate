package com.arrmate.app.data

import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class DirectServiceClientTest {
    private lateinit var server: MockWebServer
    private lateinit var client: DirectServiceClient

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        client = DirectServiceClient()
    }

    @After
    fun tearDown() = server.shutdown()

    @Test
    fun `sonarr is called directly with its api key`() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"version":"4.0.15"}""").setHeader("Content-Type", "application/json"))
        server.enqueue(MockResponse().setBody("""{"totalRecords":3,"records":[]}""").setHeader("Content-Type", "application/json"))

        val result = client.inspect(config(ServiceType.SONARR))

        assertEquals(ConnectionState.ONLINE, result.state)
        assertEquals("v4.0.15 · 3 queued", result.detail)
        val statusRequest = server.takeRequest()
        assertEquals("/api/v3/system/status", statusRequest.path)
        assertEquals("test-api-key", statusRequest.getHeader("X-Api-Key"))
        assertEquals("/api/v3/queue?page=1&pageSize=1", server.takeRequest().path)
    }

    @Test
    fun `jellyfin authenticates the configured user on device`() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ServerName":"Living room","Version":"10.10.7"}"""))
        server.enqueue(MockResponse().setBody("""{"AccessToken":"device-token"}"""))

        val result = client.inspect(config(ServiceType.JELLYFIN, username = "zeb", secret = "password"))

        assertEquals(ConnectionState.ONLINE, result.state)
        assertEquals("Living room · v10.10.7", result.detail)
        server.takeRequest()
        val auth = server.takeRequest()
        assertEquals("/Users/AuthenticateByName", auth.path)
        assertTrue(auth.body.readUtf8().contains("\"Username\":\"zeb\""))
        assertTrue(auth.getHeader("X-Emby-Authorization")!!.contains("Client=\"Arrmate\""))
    }

    @Test
    fun `an upstream auth failure becomes an honest offline state`() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"message":"Invalid API key"}"""))

        val result = client.inspect(config(ServiceType.RADARR))

        assertEquals(ConnectionState.OFFLINE, result.state)
        assertEquals("Invalid API key", result.detail)
    }

    @Test
    fun `jellyseerr status uses direct api key authentication`() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"version":"2.7.3"}"""))

        val result = client.inspect(config(ServiceType.JELLYSEERR))

        assertEquals(ConnectionState.ONLINE, result.state)
        assertEquals("v2.7.3 · requests ready", result.detail)
        val request = server.takeRequest()
        assertEquals("/api/v1/status", request.path)
        assertEquals("test-api-key", request.getHeader("X-Api-Key"))
    }

    @Test
    fun `bazarr uses its uppercase api key header`() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"data":{"bazarr_version":"v1.5.2"}}"""))

        val result = client.inspect(config(ServiceType.BAZARR))

        assertEquals(ConnectionState.ONLINE, result.state)
        assertEquals("v1.5.2", result.detail)
        val request = server.takeRequest()
        assertEquals("/api/system/status", request.path)
        assertEquals("test-api-key", request.getHeader("X-API-KEY"))
    }

    @Test
    fun `qbittorrent logs in and reuses only its direct session cookie`() = runBlocking {
        server.enqueue(MockResponse().setBody("Ok.").setHeader("Set-Cookie", "SID=session-id; HttpOnly; path=/"))
        server.enqueue(MockResponse().setBody("v5.1.0"))

        val result = client.inspect(config(ServiceType.QBITTORRENT, username = "admin", secret = "password"))

        assertEquals(ConnectionState.ONLINE, result.state)
        assertEquals("v5.1.0 · downloads ready", result.detail)
        val login = server.takeRequest()
        assertEquals("/api/v2/auth/login", login.path)
        assertTrue(login.body.readUtf8().contains("username=admin"))
        val version = server.takeRequest()
        assertEquals("/api/v2/app/version", version.path)
        assertEquals("SID=session-id", version.getHeader("Cookie"))
    }

    private fun config(
        type: ServiceType,
        username: String = "",
        secret: String = "test-api-key",
    ) = ServiceConfig(
        type = type,
        baseUrl = server.url("/").toString().trimEnd('/'),
        username = username,
        secret = secret,
    )
}
