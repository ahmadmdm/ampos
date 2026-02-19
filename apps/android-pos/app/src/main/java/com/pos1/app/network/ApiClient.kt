package com.pos1.app.network

import com.pos1.app.data.SecurePrefs
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Unified API client with JWT auth, token refresh, and device auth.
 */
class ApiClient(private val prefs: SecurePrefs) {

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(prefs))
        .build()

    val http: OkHttpClient get() = httpClient

    private val jsonMediaType = "application/json".toMediaType()

    // ── Auth ──

    fun login(email: String, password: String): JSONObject {
        val body = JSONObject()
            .put("email", email)
            .put("password", password)
            .toString()
        return post("/api/auth/login", body, auth = false)
    }

    fun refreshToken(refreshToken: String): JSONObject {
        val body = JSONObject()
            .put("refreshToken", refreshToken)
            .toString()
        return post("/api/auth/refresh", body, auth = false)
    }

    fun logout(refreshToken: String): JSONObject {
        val body = JSONObject()
            .put("refreshToken", refreshToken)
            .toString()
        return post("/api/auth/logout", body)
    }

    // ── Device Registration ──

    fun registerDevice(branchId: String, code: String): JSONObject {
        val body = JSONObject()
            .put("branchId", branchId)
            .put("code", code)
            .put("name", "Android POS")
            .put("platform", "ANDROID")
            .toString()
        return post("/api/pos/devices/register", body, auth = false)
    }

    fun rotateDeviceToken(deviceId: String, oldToken: String): JSONObject {
        val body = JSONObject()
            .put("deviceId", deviceId)
            .put("oldToken", oldToken)
            .toString()
        return post("/api/pos/devices/rotate-token", body, auth = false)
    }

    // ── Snapshot ──

    fun fetchSnapshot(branchId: String): JSONObject {
        return get("/api/pos/sync/snapshot?branchId=$branchId", useDeviceAuth = true)
    }

    // ── Orders ──

    fun getOrders(branchId: String, status: String? = null, page: Int = 1, limit: Int = 50): JSONObject {
        val params = buildString {
            append("?branchId=$branchId&page=$page&limit=$limit")
            if (!status.isNullOrBlank()) append("&status=$status")
        }
        return get("/api/orders$params")
    }

    fun createOrder(branchId: String, type: String, items: org.json.JSONArray, tableId: String? = null): JSONObject {
        val body = JSONObject()
            .put("branchId", branchId)
            .put("type", type)
            .put("items", items)
        if (!tableId.isNullOrBlank()) body.put("tableId", tableId)
        return post("/api/orders", body.toString())
    }

    fun updateOrderStatus(orderId: String, status: String): JSONObject {
        val body = JSONObject().put("status", status).toString()
        return patch("/api/orders/$orderId/status", body)
    }

    fun voidOrder(orderId: String, reason: String? = null): JSONObject {
        val body = JSONObject()
        if (!reason.isNullOrBlank()) body.put("reason", reason)
        return patch("/api/orders/$orderId/void", body.toString())
    }

    fun refundOrder(orderId: String, paymentId: String, amount: Double, reason: String? = null): JSONObject {
        val body = JSONObject()
            .put("paymentId", paymentId)
            .put("amount", amount)
        if (!reason.isNullOrBlank()) body.put("reason", reason)
        return patch("/api/orders/$orderId/refund", body.toString())
    }

    fun applyDiscount(orderId: String, discountAmount: Double, reason: String? = null): JSONObject {
        val body = JSONObject()
            .put("discountAmount", discountAmount)
        if (!reason.isNullOrBlank()) body.put("reason", reason)
        return patch("/api/orders/$orderId/discount", body.toString())
    }

    fun splitOrder(orderId: String, items: org.json.JSONArray): JSONObject {
        val body = JSONObject().put("items", items).toString()
        return post("/api/orders/$orderId/split", body)
    }

    fun mergeOrders(sourceOrderId: String, targetOrderId: String): JSONObject {
        val body = JSONObject().put("targetOrderId", targetOrderId).toString()
        return post("/api/orders/$sourceOrderId/merge", body)
    }

    fun transferTable(orderId: String, tableId: String, reason: String? = null): JSONObject {
        val body = JSONObject().put("tableId", tableId)
        if (!reason.isNullOrBlank()) body.put("reason", reason)
        return patch("/api/orders/$orderId/transfer-table", body.toString())
    }

    fun getInvoice(orderId: String): ByteArray? {
        val request = Request.Builder()
            .url("${prefs.apiBaseUrl}/api/orders/$orderId/invoice")
            .get()
            .build()
        httpClient.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) return null
            return resp.body?.bytes()
        }
    }

    // ── Coupons ──

    fun validateCoupon(code: String, branchId: String, orderAmount: Double? = null): JSONObject {
        val body = JSONObject()
            .put("code", code)
            .put("branchId", branchId)
        if (orderAmount != null) body.put("orderAmount", orderAmount)
        return post("/api/pos/coupons/validate", body.toString())
    }

    // ── Loyalty ──

    fun getLoyalty(phone: String): JSONObject {
        return get("/api/pos/loyalty?phone=$phone")
    }

    fun loyaltyTransaction(phone: String, type: String, points: Int, orderId: String? = null): JSONObject {
        val body = JSONObject()
            .put("phone", phone)
            .put("type", type)
            .put("points", points)
        if (!orderId.isNullOrBlank()) body.put("orderId", orderId)
        return post("/api/pos/loyalty", body.toString())
    }

    // ── KDS ──

    fun getKdsTickets(branchId: String, station: String? = null): JSONObject {
        val params = buildString {
            append("?branchId=$branchId")
            if (!station.isNullOrBlank()) append("&station=$station")
        }
        return get("/api/kds/tickets$params")
    }

    fun updateTicketStatus(ticketId: String, status: String): JSONObject {
        val body = JSONObject().put("status", status).toString()
        return patch("/api/kds/tickets/$ticketId/status", body)
    }

    // ── Waiter ──

    fun getWaiterCalls(branchId: String): JSONObject {
        return get("/api/waiter/calls?branchId=$branchId")
    }

    fun ackWaiterCall(callId: String): JSONObject {
        val body = JSONObject().put("actorUserId", prefs.userId ?: "android_pos").toString()
        return patch("/api/waiter/calls/$callId/ack", body)
    }

    fun resolveWaiterCall(callId: String): JSONObject {
        val body = JSONObject().put("actorUserId", prefs.userId ?: "android_pos").toString()
        return patch("/api/waiter/calls/$callId/resolve", body)
    }

    fun getReadyOrders(branchId: String): JSONObject {
        return get("/api/waiter/ready-queue?branchId=$branchId")
    }

    // ── Tables ──

    fun getTables(branchId: String): JSONObject {
        return get("/api/admin/branches/$branchId/tables")
    }

    // ── Sync ──

    fun syncEvents(branchId: String, deviceId: String, events: org.json.JSONArray): JSONObject {
        val body = JSONObject()
            .put("branchId", branchId)
            .put("deviceId", deviceId)
            .put("events", events)
            .toString()
        return post("/api/pos/sync/events", body, useDeviceAuth = true)
    }

    // ── Print ──

    fun printReceipt(orderId: String, printerType: String = "RECEIPT"): JSONObject {
        val body = JSONObject()
            .put("orderId", orderId)
            .put("printerType", printerType)
            .toString()
        return post("/api/pos/print/receipt", body)
    }

    // ── HTTP Methods ──

    private fun get(path: String, useDeviceAuth: Boolean = false): JSONObject {
        val request = Request.Builder()
            .url("${prefs.apiBaseUrl}$path")
            .get()
            .apply {
                if (useDeviceAuth) {
                    header("x-device-id", prefs.deviceId ?: "")
                    header("x-device-token", prefs.deviceToken ?: "")
                }
            }
            .build()
        return execute(request)
    }

    private fun post(path: String, body: String, auth: Boolean = true, useDeviceAuth: Boolean = false): JSONObject {
        val request = Request.Builder()
            .url("${prefs.apiBaseUrl}$path")
            .post(body.toRequestBody(jsonMediaType))
            .apply {
                if (useDeviceAuth) {
                    header("x-device-id", prefs.deviceId ?: "")
                    header("x-device-token", prefs.deviceToken ?: "")
                }
                if (!auth) header("X-No-Auth", "true")
            }
            .build()
        return execute(request)
    }

    private fun patch(path: String, body: String): JSONObject {
        val request = Request.Builder()
            .url("${prefs.apiBaseUrl}$path")
            .patch(body.toRequestBody(jsonMediaType))
            .build()
        return execute(request)
    }

    private fun execute(request: Request): JSONObject {
        return executeInternal(request, allowAutoRefresh = true)
    }

    private fun executeInternal(request: Request, allowAutoRefresh: Boolean): JSONObject {
        httpClient.newCall(request).execute().use { response ->
            val raw = response.body?.string() ?: "{}"
            val json = JSONObject(raw)

            if (response.isSuccessful) return json

            // Auto-refresh expired access tokens once, then retry the original request.
            val canRefresh =
                allowAutoRefresh &&
                    response.code == 401 &&
                    request.header("x-device-token") == null &&
                    request.header("X-No-Auth") == null &&
                    !prefs.refreshToken.isNullOrBlank()

            if (canRefresh && tryRefreshTokens()) {
                return executeInternal(request, allowAutoRefresh = false)
            }

            val errorMsg = json.optString("error", "Request failed: ${response.code}")
            error(errorMsg)
        }
    }

    private fun tryRefreshTokens(): Boolean {
        val refresh = prefs.refreshToken ?: return false
        val body = JSONObject()
            .put("refreshToken", refresh)
            .toString()
        val request = Request.Builder()
            .url("${prefs.apiBaseUrl}/api/auth/refresh")
            .post(body.toRequestBody(jsonMediaType))
            .header("X-No-Auth", "true")
            .build()

        return runCatching {
            executeInternal(request, allowAutoRefresh = false)
        }.mapCatching { result ->
            val data = result.optJSONObject("data") ?: return@mapCatching false
            val newAccess = data.optString("accessToken", "")
            val newRefresh = data.optString("refreshToken", "")
            if (newAccess.isBlank() || newRefresh.isBlank()) return@mapCatching false
            prefs.accessToken = newAccess
            prefs.refreshToken = newRefresh
            true
        }.getOrElse {
            prefs.clearAuth()
            false
        }
    }
}

/**
 * OkHttp interceptor that adds JWT Bearer token to all requests
 * (unless marked with X-No-Auth header or device auth headers present).
 */
private class AuthInterceptor(private val prefs: SecurePrefs) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()

        // Skip auth for explicitly marked requests
        if (original.header("X-No-Auth") != null) {
            val cleaned = original.newBuilder().removeHeader("X-No-Auth").build()
            return chain.proceed(cleaned)
        }

        // Skip if device auth headers are present
        if (original.header("x-device-token") != null) {
            return chain.proceed(original)
        }

        // Add JWT Bearer token
        val token = prefs.accessToken
        if (!token.isNullOrBlank()) {
            val authed = original.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("x-org-id", prefs.organizationId)
                .header("x-branch-id", prefs.branchId)
                .build()
            return chain.proceed(authed)
        }

        return chain.proceed(original)
    }
}
