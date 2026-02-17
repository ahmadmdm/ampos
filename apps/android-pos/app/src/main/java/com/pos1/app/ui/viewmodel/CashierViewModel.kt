package com.pos1.app.ui.viewmodel

import android.content.Context
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.pos1.app.PosApplication
import com.pos1.app.data.model.ModifierGroupDto
import com.pos1.app.data.model.ModifierOptionDto
import com.pos1.app.data.model.ProductDto
import com.pos1.app.data.model.TableDto
import com.pos1.app.sync.PosSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/* ═══════════════════════════════════════════════════════════════
   Cart item with selected modifiers
   ═══════════════════════════════════════════════════════════════ */

@Stable
data class CartItem(
    val product: ProductDto,
    val qty: Int = 1,
    val selectedModifiers: List<SelectedModifier> = emptyList(),
    val notes: String = "",
) {
    val unitPrice: Double
        get() = product.basePrice + selectedModifiers.sumOf { it.priceAdjustment }
    val lineTotal: Double
        get() = unitPrice * qty
}

data class SelectedModifier(
    val groupId: String,
    val optionId: String,
    val nameAr: String,
    val priceAdjustment: Double,
)

/* ═══════════════════════════════════════════════════════════════
   Cashier ViewModel — products, cart, coupons, order creation
   ═══════════════════════════════════════════════════════════════ */

class CashierViewModel : ViewModel() {

    private val prefs = PosApplication.instance.securePrefs
    private val api = PosApplication.instance.apiClient
    private val eventRepo = PosApplication.instance.eventRepository

    // ── Products ──
    var products by mutableStateOf(emptyList<ProductDto>())
        private set
    var categories by mutableStateOf(emptyList<String>())
        private set
    var tables by mutableStateOf(emptyList<TableDto>())
        private set

    // ── Cart ──
    var cart by mutableStateOf(emptyList<CartItem>())
        private set
    var orderType by mutableStateOf("DINE_IN")
    var selectedTableId by mutableStateOf<String?>(null)

    // ── Coupon ──
    var couponCode by mutableStateOf("")
    var couponDiscount by mutableStateOf(0.0)
        private set
    var couponType by mutableStateOf<String?>(null)
        private set
    var couponMessage by mutableStateOf<String?>(null)
        private set

    // ── State ──
    var isLoading by mutableStateOf(false)
        private set
    var message by mutableStateOf("")

    // ── Computed ──
    val subtotal: Double get() = cart.sumOf { it.lineTotal }
    val taxRate: Double get() = prefs.taxRate
    val taxAmount: Double get() = subtotal * taxRate
    val discountAmount: Double
        get() = when (couponType) {
            "PERCENTAGE" -> subtotal * (couponDiscount / 100.0)
            "FIXED" -> couponDiscount
            else -> 0.0
        }
    val grandTotal: Double get() = (subtotal + taxAmount - discountAmount).coerceAtLeast(0.0)
    val cartItemCount: Int get() = cart.sumOf { it.qty }

    // ── Load Products ──

    fun loadSnapshot() {
        viewModelScope.launch {
            isLoading = true
            runCatching {
                val result = withContext(Dispatchers.IO) {
                    api.fetchSnapshot(prefs.branchId)
                }
                val data = result.optJSONObject("data") ?: error("No data")

                // Parse settings
                val settings = data.optJSONObject("settings")
                if (settings != null) {
                    prefs.taxRateBps = settings.optInt("taxRateBps", 1500)
                    prefs.serviceChargeBps = settings.optInt("serviceChargeBps", 0)
                }

                // Parse products
                val productsArr = data.optJSONArray("products") ?: JSONArray()
                val parsed = mutableListOf<ProductDto>()
                for (i in 0 until productsArr.length()) {
                    val p = productsArr.getJSONObject(i)
                    val cat = p.optJSONObject("category")
                    val modGroups = parseModifierGroups(p.optJSONArray("modifierGroups"))
                    parsed.add(
                        ProductDto(
                            id = p.getString("id"),
                            nameAr = p.optString("nameAr", "منتج"),
                            nameEn = p.optString("nameEn", null),
                            basePrice = p.optDouble("basePrice", 0.0),
                            categoryId = p.optString("categoryId", ""),
                            category = if (cat != null) com.pos1.app.data.model.CategoryRef(
                                nameAr = cat.optString("nameAr", "عام"),
                                nameEn = cat.optString("nameEn", null),
                            ) else null,
                            requiresKitchen = p.optBoolean("requiresKitchen", true),
                            isActive = p.optBoolean("isActive", true),
                            imageUrl = p.optString("imageUrl", null),
                            modifierGroups = modGroups,
                        )
                    )
                }
                products = parsed
                categories = listOf("الكل") + parsed.mapNotNull { it.category?.nameAr }.distinct()

                // Parse tables
                val tablesArr = data.optJSONArray("tables") ?: JSONArray()
                val parsedTables = mutableListOf<TableDto>()
                for (i in 0 until tablesArr.length()) {
                    val t = tablesArr.getJSONObject(i)
                    val area = t.optJSONObject("area")
                    parsedTables.add(
                        TableDto(
                            id = t.getString("id"),
                            code = t.optString("code", "T${i + 1}"),
                            seats = t.optInt("seats", 4),
                            isActive = t.optBoolean("isActive", true),
                            area = if (area != null) com.pos1.app.data.model.TableAreaDto(
                                id = area.optString("id", ""),
                                nameAr = area.optString("nameAr", ""),
                            ) else null,
                        )
                    )
                }
                tables = parsedTables

                message = "تم تحميل ${parsed.size} منتج"
            }.onFailure {
                message = "فشل التحميل: ${it.message}"
            }
            isLoading = false
        }
    }

    private fun parseModifierGroups(arr: JSONArray?): List<ModifierGroupDto> {
        if (arr == null) return emptyList()
        val groups = mutableListOf<ModifierGroupDto>()
        for (i in 0 until arr.length()) {
            val g = arr.getJSONObject(i)
            val options = mutableListOf<ModifierOptionDto>()
            val optArr = g.optJSONArray("options") ?: JSONArray()
            for (j in 0 until optArr.length()) {
                val o = optArr.getJSONObject(j)
                options.add(
                    ModifierOptionDto(
                        id = o.getString("id"),
                        nameAr = o.optString("nameAr", ""),
                        nameEn = o.optString("nameEn", null),
                        priceAdjustment = o.optDouble("priceAdjustment", 0.0),
                        isDefault = o.optBoolean("isDefault", false),
                    )
                )
            }
            groups.add(
                ModifierGroupDto(
                    id = g.getString("id"),
                    nameAr = g.optString("nameAr", ""),
                    nameEn = g.optString("nameEn", null),
                    minSelections = g.optInt("minSelections", 0),
                    maxSelections = g.optInt("maxSelections", 1),
                    options = options,
                )
            )
        }
        return groups
    }

    // ── Cart Operations ──

    fun addToCart(product: ProductDto, modifiers: List<SelectedModifier> = emptyList()) {
        // If no modifiers, try to merge with existing cart item
        if (modifiers.isEmpty()) {
            val existing = cart.firstOrNull { it.product.id == product.id && it.selectedModifiers.isEmpty() }
            if (existing != null) {
                cart = cart.map {
                    if (it.product.id == product.id && it.selectedModifiers.isEmpty())
                        it.copy(qty = it.qty + 1) else it
                }
                return
            }
        }
        cart = cart + CartItem(product = product, qty = 1, selectedModifiers = modifiers)
    }

    fun updateCartItemQty(index: Int, qty: Int) {
        if (qty <= 0) {
            cart = cart.filterIndexed { i, _ -> i != index }
        } else {
            cart = cart.mapIndexed { i, item -> if (i == index) item.copy(qty = qty) else item }
        }
    }

    fun removeCartItem(index: Int) {
        cart = cart.filterIndexed { i, _ -> i != index }
    }

    fun clearCart() {
        cart = emptyList()
        couponCode = ""
        couponDiscount = 0.0
        couponType = null
        couponMessage = null
    }

    // ── Coupon ──

    fun validateCoupon() {
        if (couponCode.isBlank()) return
        viewModelScope.launch {
            runCatching {
                val result = withContext(Dispatchers.IO) {
                    api.validateCoupon(couponCode.trim(), prefs.branchId, subtotal)
                }
                val data = result.optJSONObject("data") ?: error("No data")
                if (data.optBoolean("valid", false)) {
                    couponType = data.optString("type", "PERCENTAGE")
                    couponDiscount = data.optDouble("discount", 0.0)
                    couponMessage = "تم تطبيق الكوبون ✓"
                } else {
                    couponMessage = "كوبون غير صالح"
                    couponDiscount = 0.0
                    couponType = null
                }
            }.onFailure {
                couponMessage = "خطأ: ${it.message}"
                couponDiscount = 0.0
                couponType = null
            }
        }
    }

    fun clearCoupon() {
        couponCode = ""
        couponDiscount = 0.0
        couponType = null
        couponMessage = null
    }

    // ── Order Submission ──

    fun submitOrder(onSuccess: () -> Unit = {}) {
        if (cart.isEmpty()) {
            message = "السلة فارغة"
            return
        }
        viewModelScope.launch {
            isLoading = true
            runCatching {
                val items = JSONArray()
                cart.forEach { cartItem ->
                    items.put(
                        JSONObject()
                            .put("productId", cartItem.product.id)
                            .put("qty", cartItem.qty)
                            .put("unitPrice", cartItem.unitPrice)
                            .put("itemNameAr", cartItem.product.nameAr)
                    )
                }

                withContext(Dispatchers.IO) {
                    api.createOrder(
                        branchId = prefs.branchId,
                        type = orderType,
                        items = items,
                        tableId = if (orderType == "DINE_IN") selectedTableId else null,
                    )
                }

                message = "تم إنشاء الطلب بنجاح ✓"
                cart = emptyList()
                couponCode = ""
                couponDiscount = 0.0
                couponType = null
                onSuccess()
            }.onFailure {
                // Fallback: save to local event queue for offline sync
                val deviceId = prefs.deviceId ?: "unknown"
                val itemsArr = JSONArray()
                cart.forEach { cartItem ->
                    itemsArr.put(
                        JSONObject()
                            .put("productId", cartItem.product.id)
                            .put("qty", cartItem.qty)
                            .put("unitPrice", cartItem.unitPrice)
                            .put("itemNameAr", cartItem.product.nameAr)
                    )
                }
                eventRepo.appendEvent(
                    deviceId = deviceId,
                    type = "ORDER_CREATE",
                    payload = JSONObject()
                        .put("branchId", prefs.branchId)
                        .put("type", orderType)
                        .put("items", itemsArr),
                )
                message = "تم حفظ الطلب محلياً (بدون اتصال)"
                cart = emptyList()
            }
            isLoading = false
        }
    }

    fun sendToKitchen() {
        viewModelScope.launch {
            val deviceId = prefs.deviceId ?: "unknown"
            eventRepo.appendEvent(
                deviceId = deviceId,
                type = "SEND_TO_KITCHEN",
                payload = JSONObject().put("items", cart.size),
            )
            message = "تم إرسال الطلب للمطبخ"
        }
    }

    fun processPayment(receivedAmount: Double) {
        if (cart.isEmpty()) {
            message = "السلة فارغة"
            return
        }
        viewModelScope.launch {
            isLoading = true
            runCatching {
                // Create order first
                val items = JSONArray()
                cart.forEach { cartItem ->
                    items.put(
                        JSONObject()
                            .put("productId", cartItem.product.id)
                            .put("qty", cartItem.qty)
                            .put("unitPrice", cartItem.unitPrice)
                            .put("itemNameAr", cartItem.product.nameAr)
                    )
                }
                withContext(Dispatchers.IO) {
                    api.createOrder(
                        branchId = prefs.branchId,
                        type = orderType,
                        items = items,
                        tableId = if (orderType == "DINE_IN") selectedTableId else null,
                    )
                }
                message = "تم الدفع بنجاح ✓"
                cart = emptyList()
                clearCoupon()
            }.onFailure {
                message = "فشل الدفع: ${it.message}"
            }
            isLoading = false
        }
    }

    fun syncNow(context: Context) {
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<PosSyncWorker>().build()
        )
        message = "جاري المزامنة..."
    }

    // ── Device Registration ──

    fun registerDevice(apiUrl: String, branchId: String, orgId: String, deviceCode: String) {
        viewModelScope.launch {
            isLoading = true
            runCatching {
                prefs.apiBaseUrl = apiUrl.trim()
                prefs.branchId = branchId.trim()
                prefs.organizationId = orgId.trim()
                prefs.deviceCode = deviceCode.trim()

                val result = withContext(Dispatchers.IO) {
                    api.registerDevice(branchId.trim(), deviceCode.trim())
                }
                val data = result.optJSONObject("data") ?: error("No data")
                prefs.deviceId = data.getString("deviceId")
                prefs.deviceToken = data.getString("token")

                loadSnapshot()
                message = "تم تسجيل الجهاز ✓"
            }.onFailure {
                message = "فشل التسجيل: ${it.message}"
            }
            isLoading = false
        }
    }
}
