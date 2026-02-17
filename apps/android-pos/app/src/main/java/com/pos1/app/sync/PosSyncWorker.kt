package com.pos1.app.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.pos1.app.data.PosConfigStore
import com.pos1.app.data.PosDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class PosSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val db = PosDatabase.get(applicationContext)
        val dao = db.localEventDao()
        val configStore = PosConfigStore(applicationContext)
        val config = configStore.load()
        val api = PosApiClient()

        if (config.deviceId.isNullOrBlank() || config.deviceToken.isNullOrBlank()) {
            return@withContext Result.retry()
        }

        val pending = dao.getPending(limit = 100)
        if (pending.isEmpty()) return@withContext Result.success()

        val eventPairs = pending.map { it.seq to it.payloadJson }
        return@withContext try {
            val syncResult = api.syncEvents(config, eventPairs)
            val ackedIds = pending
                .filter { syncResult.ackedSeqs.contains(it.seq) }
                .map { it.id }
            if (ackedIds.isNotEmpty()) {
                dao.markSynced(ackedIds, System.currentTimeMillis())
            }

            if (syncResult.ackedSeqs.size < pending.size) {
                val rejectedPayload = JSONObject()
                    .put("acked", syncResult.ackedSeqs.size)
                    .put("pending", pending.size)
                PosEventRepository(dao).appendEvent(
                    config.deviceId,
                    "SYNC_PARTIAL_ACK",
                    rejectedPayload
                )
            }
            Result.success()
        } catch (_: Throwable) {
            Result.retry()
        }
    }
}
