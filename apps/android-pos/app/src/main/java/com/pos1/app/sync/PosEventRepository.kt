package com.pos1.app.sync

import com.pos1.app.data.LocalEventDao
import com.pos1.app.data.LocalEventEntity
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID

class PosEventRepository(private val dao: LocalEventDao) {
    suspend fun appendEvent(deviceId: String, type: String, payload: JSONObject): LocalEventEntity {
        val nextSeq = dao.getMaxSeq(deviceId) + 1
        val payloadJson = JSONObject()
            .put("type", type)
            .put("payload", payload)
            .toString()

        val event = LocalEventEntity(
            id = UUID.randomUUID().toString(),
            deviceId = deviceId,
            seq = nextSeq,
            type = type,
            payloadJson = payloadJson,
            createdAt = System.currentTimeMillis(),
            syncedAt = null,
            hash = sha256(payloadJson)
        )
        dao.insert(event)
        return event
    }

    private fun sha256(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }
}
