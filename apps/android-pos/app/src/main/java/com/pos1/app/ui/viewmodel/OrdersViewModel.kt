package com.pos1.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pos1.app.PosApplication
import com.pos1.app.data.model.OrderDto
import com.pos1.app.data.model.OrderItemDto
import com.pos1.app.data.model.OrderTableRef
import com.pos1.app.data.model.PaymentDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class OrdersViewModel : ViewModel() {

    private val prefs = PosApplication.instance.securePrefs
    private val api = PosApplication.instance.apiClient

    var orders by mutableStateOf(emptyList<OrderDto>())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
    var currentPage by mutableStateOf(1)
        private set
    var totalPages by mutableStateOf(1)
        private set
    var totalOrders by mutableStateOf(0)
        private set
    var statusFilter by mutableStateOf<String?>(null)

    fun loadOrders(status: String? = statusFilter) {
        statusFilter = status
        viewModelScope.launch {
            isLoading = true
            runCatching {
                val result = withContext(Dispatchers.IO) {
                    api.getOrders(prefs.branchId, status = status, page = currentPage)
                }
                val data = result.optJSONObject("data") ?: error("No data")
                val ordersArr = data.optJSONArray("orders") ?: JSONArray()
                val pagination = data.optJSONObject("pagination")

                orders = parseOrders(ordersArr)
                totalPages = pagination?.optInt("totalPages", 1) ?: 1
                totalOrders = pagination?.optInt("total", 0) ?: 0
            }.onFailure {
                message = "فشل تحميل الطلبات: ${it.message}"
            }
            isLoading = false
        }
    }

    fun refreshOrders() {
        currentPage = 1
        loadOrders()
    }

    fun nextPage() {
        if (currentPage < totalPages) {
            currentPage++
            loadOrders()
        }
    }

    fun prevPage() {
        if (currentPage > 1) {
            currentPage--
            loadOrders()
        }
    }

    fun voidOrder(orderId: String, reason: String? = null) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.voidOrder(orderId, reason) }
                message = "تم إلغاء الطلب ✓"
                loadOrders()
            }.onFailure { message = "فشل الإلغاء: ${it.message}" }
        }
    }

    fun refundOrder(orderId: String, paymentId: String, amount: Double, reason: String? = null) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.refundOrder(orderId, paymentId, amount, reason) }
                message = "تم الاسترجاع ✓"
                loadOrders()
            }.onFailure { message = "فشل الاسترجاع: ${it.message}" }
        }
    }

    fun applyDiscount(orderId: String, amount: Double, reason: String? = null) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.applyDiscount(orderId, amount, reason) }
                message = "تم تطبيق الخصم ✓"
                loadOrders()
            }.onFailure { message = "فشل الخصم: ${it.message}" }
        }
    }

    fun updateStatus(orderId: String, status: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.updateOrderStatus(orderId, status) }
                message = "تم تحديث الحالة ✓"
                loadOrders()
            }.onFailure { message = "فشل التحديث: ${it.message}" }
        }
    }

    fun splitOrder(orderId: String, items: JSONArray) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.splitOrder(orderId, items) }
                message = "تم تقسيم الطلب ✓"
                loadOrders()
            }.onFailure { message = "فشل التقسيم: ${it.message}" }
        }
    }

    fun mergeOrders(sourceId: String, targetId: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.mergeOrders(sourceId, targetId) }
                message = "تم دمج الطلبات ✓"
                loadOrders()
            }.onFailure { message = "فشل الدمج: ${it.message}" }
        }
    }

    fun transferTable(orderId: String, tableId: String) {
        viewModelScope.launch {
            runCatching {
                withContext(Dispatchers.IO) { api.transferTable(orderId, tableId) }
                message = "تم نقل الطاولة ✓"
                loadOrders()
            }.onFailure { message = "فشل النقل: ${it.message}" }
        }
    }

    private fun parseOrders(arr: JSONArray): List<OrderDto> {
        val list = mutableListOf<OrderDto>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val table = o.optJSONObject("table")
            val itemsArr = o.optJSONArray("items") ?: JSONArray()
            val paymentsArr = o.optJSONArray("payments") ?: JSONArray()

            list.add(
                OrderDto(
                    id = o.getString("id"),
                    orderNo = o.optString("orderNo", "-"),
                    type = o.optString("type", "TAKEAWAY"),
                    status = o.optString("status", "CONFIRMED"),
                    totalAmount = o.optDouble("totalAmount", 0.0),
                    discountAmount = o.optDouble("discountAmount", 0.0),
                    taxAmount = o.optDouble("taxAmount", 0.0),
                    grandTotal = o.optDouble("grandTotal", 0.0),
                    tableId = o.optString("tableId", null),
                    table = if (table != null) OrderTableRef(
                        id = table.optString("id", ""),
                        code = table.optString("code", ""),
                    ) else null,
                    items = parseOrderItems(itemsArr),
                    payments = parsePayments(paymentsArr),
                    createdAt = o.optString("createdAt", ""),
                )
            )
        }
        return list
    }

    private fun parseOrderItems(arr: JSONArray): List<OrderItemDto> {
        val list = mutableListOf<OrderItemDto>()
        for (i in 0 until arr.length()) {
            val item = arr.getJSONObject(i)
            list.add(
                OrderItemDto(
                    id = item.optString("id", ""),
                    productId = item.optString("productId", ""),
                    itemNameAr = item.optString("itemNameAr", ""),
                    qty = item.optInt("qty", 1),
                    unitPrice = item.optDouble("unitPrice", 0.0),
                    totalPrice = item.optDouble("totalPrice", 0.0),
                )
            )
        }
        return list
    }

    private fun parsePayments(arr: JSONArray): List<PaymentDto> {
        val list = mutableListOf<PaymentDto>()
        for (i in 0 until arr.length()) {
            val p = arr.getJSONObject(i)
            list.add(
                PaymentDto(
                    id = p.optString("id", ""),
                    method = p.optString("method", "CASH"),
                    amount = p.optDouble("amount", 0.0),
                    status = p.optString("status", "CAPTURED"),
                )
            )
        }
        return list
    }
}
