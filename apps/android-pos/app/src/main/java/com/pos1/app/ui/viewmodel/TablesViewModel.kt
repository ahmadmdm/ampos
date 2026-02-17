package com.pos1.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pos1.app.PosApplication
import com.pos1.app.data.model.OrderDto
import com.pos1.app.data.model.OrderTableRef
import com.pos1.app.data.model.TableAreaDto
import com.pos1.app.data.model.TableDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray

/**
 * Table with live status derived from current orders.
 */
data class TableWithStatus(
    val table: TableDto,
    val status: String, // AVAILABLE, OCCUPIED, RESERVED
    val activeOrder: OrderDto? = null,
    val guestCount: Int = 0,
    val elapsedMin: Long = 0,
)

class TablesViewModel : ViewModel() {

    private val prefs = PosApplication.instance.securePrefs
    private val api = PosApplication.instance.apiClient

    var tables by mutableStateOf(emptyList<TableWithStatus>())
        private set
    var areas by mutableStateOf(emptyList<String>())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)

    fun loadTables() {
        viewModelScope.launch {
            isLoading = true
            runCatching {
                // Fetch tables and active orders in parallel
                val tablesResult = withContext(Dispatchers.IO) {
                    api.getTables(prefs.branchId)
                }
                val ordersResult = withContext(Dispatchers.IO) {
                    api.getOrders(prefs.branchId, status = null, limit = 100)
                }

                val tablesData = tablesResult.optJSONObject("data")
                val tablesArr = tablesData?.optJSONArray("tables") ?: JSONArray()
                val areasArr = tablesData?.optJSONArray("areas") ?: JSONArray()

                val ordersData = ordersResult.optJSONObject("data")
                val ordersArr = ordersData?.optJSONArray("orders") ?: JSONArray()

                // Parse areas
                val areasList = mutableListOf("الكل")
                for (i in 0 until areasArr.length()) {
                    val a = areasArr.getJSONObject(i)
                    areasList.add(a.optString("nameAr", ""))
                }
                areas = areasList

                // Parse active orders and map by tableId
                val activeOrdersByTable = mutableMapOf<String, OrderDto>()
                val now = System.currentTimeMillis()
                for (i in 0 until ordersArr.length()) {
                    val o = ordersArr.getJSONObject(i)
                    val tableId = o.optString("tableId", "")
                    val status = o.optString("status", "")
                    if (tableId.isNotBlank() && status in listOf("CONFIRMED", "IN_KITCHEN", "READY", "SERVED")) {
                        val table = o.optJSONObject("table")
                        activeOrdersByTable[tableId] = OrderDto(
                            id = o.getString("id"),
                            orderNo = o.optString("orderNo", ""),
                            type = o.optString("type", "DINE_IN"),
                            status = status,
                            totalAmount = o.optDouble("totalAmount", 0.0),
                            grandTotal = o.optDouble("grandTotal", 0.0),
                            tableId = tableId,
                            table = if (table != null) OrderTableRef(
                                id = table.optString("id", ""),
                                code = table.optString("code", ""),
                            ) else null,
                            createdAt = o.optString("createdAt", ""),
                        )
                    }
                }

                // Parse tables and merge with order status
                val tablesList = mutableListOf<TableWithStatus>()
                for (i in 0 until tablesArr.length()) {
                    val t = tablesArr.getJSONObject(i)
                    val id = t.getString("id")
                    val area = t.optJSONObject("area")
                    val tableDto = TableDto(
                        id = id,
                        code = t.optString("code", "T${i + 1}"),
                        seats = t.optInt("seats", 4),
                        isActive = t.optBoolean("isActive", true),
                        area = if (area != null) TableAreaDto(
                            id = area.optString("id", ""),
                            nameAr = area.optString("nameAr", ""),
                        ) else null,
                    )

                    val activeOrder = activeOrdersByTable[id]
                    val status = if (activeOrder != null) "OCCUPIED" else "AVAILABLE"
                    val elapsed = if (activeOrder != null) {
                        val ms = runCatching {
                            java.time.Instant.parse(activeOrder.createdAt).toEpochMilli()
                        }.getOrDefault(now)
                        ((now - ms) / 60000).coerceAtLeast(0)
                    } else 0L

                    tablesList.add(
                        TableWithStatus(
                            table = tableDto,
                            status = status,
                            activeOrder = activeOrder,
                            elapsedMin = elapsed,
                        )
                    )
                }
                tables = tablesList
            }.onFailure {
                message = "فشل تحميل الطاولات: ${it.message}"
            }
            isLoading = false
        }
    }

    fun transferTable(orderId: String, newTableId: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.transferTable(orderId, newTableId) }
                message = "تم نقل الطاولة ✓"
                loadTables()
            }.onFailure { message = "فشل النقل: ${it.message}" }
        }
    }
}
