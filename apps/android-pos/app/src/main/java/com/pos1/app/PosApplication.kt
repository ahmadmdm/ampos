package com.pos1.app

import android.app.Application
import com.pos1.app.data.PosDatabase
import com.pos1.app.data.SecurePrefs
import com.pos1.app.network.ApiClient
import com.pos1.app.sync.PosEventRepository

class PosApplication : Application() {

    lateinit var securePrefs: SecurePrefs
        private set
    lateinit var apiClient: ApiClient
        private set
    lateinit var database: PosDatabase
        private set
    lateinit var eventRepository: PosEventRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        securePrefs = SecurePrefs(this)
        apiClient = ApiClient(securePrefs)
        database = PosDatabase.get(this)
        eventRepository = PosEventRepository(database.localEventDao())
    }

    companion object {
        lateinit var instance: PosApplication
            private set
    }
}
