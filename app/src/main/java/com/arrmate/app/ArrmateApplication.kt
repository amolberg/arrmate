package com.arrmate.app

import android.app.Application
import com.arrmate.app.data.ArrmateRepository
import com.arrmate.app.data.DirectServiceClient
import com.arrmate.app.data.SecureServiceStore

class ArrmateApplication : Application() {
    val repository: ArrmateRepository by lazy {
        ArrmateRepository(SecureServiceStore(this), DirectServiceClient())
    }
}
