package com.arrmate.app.data

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

class ArrmateRepository(
    private val store: SecureServiceStore,
    private val client: DirectServiceClient,
) {
    fun connections(): List<ServiceConfig> = store.load()

    suspend fun refresh(): List<ServiceSnapshot> = coroutineScope {
        connections().map { config -> async { client.inspect(config) } }.awaitAll()
    }

    suspend fun verify(config: ServiceConfig): ServiceSnapshot = client.inspect(config)

    fun save(config: ServiceConfig) = store.save(config.validate())

    fun delete(id: String) = store.delete(id)
}
