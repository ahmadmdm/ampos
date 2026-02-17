package com.pos1.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.pos1.app.sync.PosSyncWorker
import com.pos1.app.ui.PosApp
import com.pos1.app.ui.theme.PosTheme
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Schedule periodic sync
        val syncRequest = PeriodicWorkRequestBuilder<PosSyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this)
            .enqueueUniquePeriodicWork("pos-sync", ExistingPeriodicWorkPolicy.KEEP, syncRequest)

        setContent {
            PosTheme {
                PosApp(applicationContext)
            }
        }
    }
}

