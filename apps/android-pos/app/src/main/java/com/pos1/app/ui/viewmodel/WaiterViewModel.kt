package com.pos1.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pos1.app.PosApplication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray

data class WaiterCallUi(
    val id: String,
    val tableCode: String,
    val reason: String,
    val status: String,
    val createdAt: String,
    val elapsedMin: Long,
)

data class ReadyOrderUi(
    val ticketId: String,
    val orderNo: String,
    val tableCode: String,
)

class WaiterViewModel : ViewModel() {

    private val prefs = PosApplication.instance.securePrefs
    private val api = PosApplication.instance.apiClient

    var waiterCalls by mutableStateOf(emptyList<WaiterCallUi>())
        private set
    var readyOrders by mutableStateOf(emptyList<ReadyOrderUi>())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)

    fun refresh() {
        viewModelScope.launch {
            isLoading = true
            runCatching {
                val now = System.currentTimeMillis()

                val callsResult = withContext(Dispatchers.IO) {
                    api.getWaiterCalls(prefs.branchId)
                }
                val callsArr = callsResult.optJSONArray("data") ?: JSONArray()
                waiterCalls = (0 until callsArr.length()).map { i ->
                    val c = callsArr.getJSONObject(i)
                    val ms = runCatching {
                        java.time.Instant.parse(c.optString("createdAt")).toEpochMilli()
                    }.getOrDefault(now)
                    WaiterCallUi(
                        id = c.optString("id"),
                        tableCode = c.optJSONObject("table")?.optString("code", "-") ?: "-",
                        reason = c.optString("reason", "-"),
                        status = c.optString("status", "CREATED"),
                        createdAt = c.optString("createdAt", ""),
                        elapsedMin = ((now - ms) / 60000).coerceAtLeast(0),
                    )
                }

                val readyResult = withContext(Dispatchers.IO) {
                    api.getReadyOrders(prefs.branchId)
                }
                val readyArr = readyResult.optJSONArray("data") ?: JSONArray()
                readyOrders = (0 until readyArr.length()).map { i ->
                    val r = readyArr.getJSONObject(i)
                    val o = r.optJSONObject("order")
                    ReadyOrderUi(
                        ticketId = r.optString("id"),
                        orderNo = o?.optString("orderNo", "-") ?: "-",
                        tableCode = o?.optJSONObject("table")?.optString("code", "-") ?: "-",
                    )
                }
            }.onFailure {
                message = "فشل التحميل: ${it.message}"
            }
            isLoading = false
        }
    }

    fun ackCall(callId: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.ackWaiterCall(callId) }
                message = "تم الاستلام ✓"
                refresh()
            }.onFailure { message = "خطأ: ${it.message}" }
        }
    }

    fun resolveCall(callId: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.resolveWaiterCall(callId) }
                message = "تم الإنهاء ✓"
                refresh()
            }.onFailure { message = "خطأ: ${it.message}" }
        }
    }
}
