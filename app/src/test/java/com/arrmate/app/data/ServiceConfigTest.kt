package com.arrmate.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class ServiceConfigTest {
    @Test
    fun `normalizes a valid homelab URL`() {
        assertEquals("http://192.168.1.20:8989", normalizeBaseUrl(" http://192.168.1.20:8989/ "))
    }

    @Test
    fun `rejects non-http schemes and embedded credentials`() {
        assertThrows(IllegalArgumentException::class.java) { normalizeBaseUrl("file:///etc/passwd") }
        assertThrows(IllegalArgumentException::class.java) { normalizeBaseUrl("https://admin:secret@example.test") }
    }

    @Test
    fun `requires username only for password based services`() {
        assertEquals(true, ServiceType.JELLYFIN.requiresUsername())
        assertEquals(true, ServiceType.QBITTORRENT.requiresUsername())
        assertEquals(false, ServiceType.SONARR.requiresUsername())
    }
}
