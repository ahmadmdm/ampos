package com.pos1.app.sync

import com.pos1.app.data.PosConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

data class DeviceRegistration(
    val deviceId: String,
    val token: String
)

data class SnapshotProduct(
    val id: String,
    val nameAr: String,
    val nameEn: String? = null,
    val basePrice: Double,
    val categoryId: String = "",
    val categoryNameAr: String = "عام",
    val requiresKitchen: Boolean = true,
    val isActive: Boolean = true,
    val imageUrl: String? = null,
)

data class SyncResult(
    val ackedSeqs: Set<Long>
)

class PosApiClient(
    private val httpClient: OkHttpClient = OkHttpClient()
) {
    fun registerDevice(config: PosConfig): DeviceRegistration {
        val body = JSONObject()
            .put("branchId", config.branchId)
            .put("code", config.deviceCode)
            .put("name", "Android POS")
            .put("platform", "ANDROID")
            .toString()

        val req = Request.Builder()
            .url("${config.apiBaseUrl}/api/pos/devices/register")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()

        httpClient.newCall(req).execute().use { response ->
            if (!response.isSuccessful) error("Device register failed: ${response.code}")
            val raw = response.body?.string() ?: error("Empty response body")
            val root = JSONObject(raw)
            val data = root.optJSONObject("data") ?: error("Missing data")
            return DeviceRegistration(
                deviceId = data.getString("deviceId"),
                token = data.getString("token")
            )
        }
    }

    fun fetchSnapshot(config: PosConfig): List<SnapshotProduct> {
        val req = Request.Builder()
            .url("${config.apiBaseUrl}/api/pos/sync/snapshot?branchId=${config.branchId}")
            .get()
            .header("x-device-id", config.deviceId ?: "")
            .header("x-device-token", config.deviceToken ?: "")
            .build()

        httpClient.newCall(req).execute().use { response ->
            if (!response.isSuccessful) error("Snapshot failed: ${response.code}")
            val raw = response.body?.string() ?: error("Empty response body")
            val root = JSONObject(raw)
            val data = root.optJSONObject("data") ?: error("Missing data")
            val products = data.optJSONArray("products") ?: JSONArray()
            val result = mutableListOf<SnapshotProduct>()
            for (i in 0 until products.length()) {
                val item = products.getJSONObject(i)
                val cat = item.optJSONObject("category")
                result.add(
                    SnapshotProduct(
                        id = item.getString("id"),
                        nameAr = item.optString("nameAr", "منتج"),
                        nameEn = item.optString("nameEn", null),
                        basePrice = item.optDouble("basePrice", 0.0),
                        categoryId = item.optString("categoryId", ""),
                        categoryNameAr = cat?.optString("nameAr", "عام") ?: "عام",
                        requiresKitchen = item.optBoolean("requiresKitchen", true),
                        isActive = item.optBoolean("isActive", true),
                        imageUrl = item.optString("imageUrl", null),
                    )
                )
            }
            return result
        }
    }

    fun syncEvents(
        config: PosConfig,
        events: List<Pair<Long, String>>
    ): SyncResult {
        val payloadEvents = JSONArray()
        for ((seq, payloadJson) in events) {
            val payload = JSONObject(payloadJson)
            payloadEvents.put(
                JSONObject()
                    .put("seq", seq)
                    .put("type", payload.optString("type", "UNKNOWN"))
                    .put("payload", payload.optJSONObject("payload") ?: JSONObject())
            )
        }

        val body = JSONObject()
            .put("branchId", config.branchId)
            .put("deviceId", config.deviceId)
            .put("events", payloadEvents)
            .toString()

        val req = Request.Builder()
            .url("${config.apiBaseUrl}/api/pos/sync/events")
            .post(body.toRequestBody("application/json".toMediaType()))
            .header("x-device-token", config.deviceToken ?: "")
            .build()

        httpClient.newCall(req).execute().use { response ->
            if (!response.isSuccessful) error("Sync failed: ${response.code}")
            val raw = response.body?.string() ?: error("Empty response body")
            val root = JSONObject(raw)
            val data = root.optJSONObject("data") ?: error("Missing data")
            val acked = data.optJSONArray("acked") ?: JSONArray()
            val ackedSeqs = mutableSetOf<Long>()
            for (i in 0 until acked.length()) {
                ackedSeqs.add(acked.getLong(i))
            }
            return SyncResult(ackedSeqs = ackedSeqs)
        }
    }
}
