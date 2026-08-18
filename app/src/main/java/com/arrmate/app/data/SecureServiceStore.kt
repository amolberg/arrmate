package com.arrmate.app.data

import android.content.Context
import android.util.Base64
import androidx.core.content.edit
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

/** Stores complete connection records as AES-GCM ciphertext backed by Android Keystore. */
class SecureServiceStore(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun load(): List<ServiceConfig> = preferences.getStringSet(KEY_IDS, emptySet()).orEmpty()
        .mapNotNull { id ->
            preferences.getString("service_$id", null)
                ?.let(::decrypt)
                ?.let(::decode)
        }
        .sortedWith(compareBy({ it.type.ordinal }, { it.name.lowercase() }))

    fun save(config: ServiceConfig) {
        val ids = preferences.getStringSet(KEY_IDS, emptySet()).orEmpty().toMutableSet().apply { add(config.id) }
        preferences.edit {
            putStringSet(KEY_IDS, ids)
            putString("service_${config.id}", encrypt(encode(config)))
        }
    }

    fun delete(id: String) {
        val ids = preferences.getStringSet(KEY_IDS, emptySet()).orEmpty().toMutableSet().apply { remove(id) }
        preferences.edit {
            putStringSet(KEY_IDS, ids)
            remove("service_$id")
        }
    }

    private fun encode(config: ServiceConfig) = JSONObject()
        .put("id", config.id)
        .put("type", config.type.name)
        .put("name", config.name)
        .put("baseUrl", config.baseUrl)
        .put("username", config.username)
        .put("secret", config.secret)
        .toString()

    private fun decode(value: String): ServiceConfig? = runCatching {
        val json = JSONObject(value)
        ServiceConfig(
            id = json.getString("id"),
            type = ServiceType.valueOf(json.getString("type")),
            name = json.getString("name"),
            baseUrl = json.getString("baseUrl"),
            username = json.optString("username"),
            secret = json.getString("secret"),
        )
    }.getOrNull()

    private fun encrypt(plainText: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val encrypted = cipher.doFinal(plainText.toByteArray(StandardCharsets.UTF_8))
        return "${Base64.encodeToString(cipher.iv, Base64.NO_WRAP)}.${Base64.encodeToString(encrypted, Base64.NO_WRAP)}"
    }

    private fun decrypt(value: String): String? = runCatching {
        val (ivText, cipherText) = value.split('.', limit = 2)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateKey(),
            GCMParameterSpec(128, Base64.decode(ivText, Base64.NO_WRAP)),
        )
        String(cipher.doFinal(Base64.decode(cipherText, Base64.NO_WRAP)), StandardCharsets.UTF_8)
    }.getOrNull()

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance("AES", "AndroidKeyStore").run {
            init(
                android.security.keystore.KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or
                        android.security.keystore.KeyProperties.PURPOSE_DECRYPT,
                )
                    .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build(),
            )
            generateKey()
        }
    }

    private companion object {
        const val PREFERENCES_NAME = "arrmate_secure_connections"
        const val KEY_IDS = "connection_ids"
        const val KEY_ALIAS = "arrmate-service-credentials-v1"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
