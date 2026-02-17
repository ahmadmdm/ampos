package com.pos1.app.data.model

import kotlinx.serialization.Serializable

/* ═══════════════════════════════════════════════════════════════
   API Response Models — matching backend schema exactly
   ═══════════════════════════════════════════════════════════════ */

// ── Auth ──

@Serializable
data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: UserInfo,
)

@Serializable
data class UserInfo(
    val id: String,
    val email: String,
    val displayName: String? = null,
    val roles: List<String> = emptyList(),
    val branchIds: List<String> = emptyList(),
)

// ── Snapshot ──

@Serializable
data class SnapshotData(
    val snapshotAt: String = "",
    val categories: List<CategoryDto> = emptyList(),
    val products: List<ProductDto> = emptyList(),
    val tables: List<TableDto> = emptyList(),
    val settings: BranchSettings = BranchSettings(),
)

@Serializable
data class BranchSettings(
    val taxRateBps: Int = 1500,
    val serviceChargeBps: Int = 0,
    val waiterCallCooldownSec: Int = 30,
    val isQrOrderingEnabled: Boolean = false,
    val isWaiterCallEnabled: Boolean = false,
)

@Serializable
data class CategoryDto(
    val id: String,
    val nameAr: String,
    val nameEn: String? = null,
    val sortOrder: Int = 0,
)

@Serializable
data class ProductDto(
    val id: String,
    val nameAr: String,
    val nameEn: String? = null,
    val basePrice: Double,
    val categoryId: String = "",
    val category: CategoryRef? = null,
    val requiresKitchen: Boolean = true,
    val isActive: Boolean = true,
    val imageUrl: String? = null,
    val modifierGroups: List<ModifierGroupDto> = emptyList(),
)

@Serializable
data class CategoryRef(
    val nameAr: String = "عام",
    val nameEn: String? = null,
)

@Serializable
data class ModifierGroupDto(
    val id: String,
    val nameAr: String,
    val nameEn: String? = null,
    val minSelections: Int = 0,
    val maxSelections: Int = 1,
    val options: List<ModifierOptionDto> = emptyList(),
)

@Serializable
data class ModifierOptionDto(
    val id: String,
    val nameAr: String,
    val nameEn: String? = null,
    val priceAdjustment: Double = 0.0,
    val isDefault: Boolean = false,
)

// ── Tables ──

@Serializable
data class TableDto(
    val id: String,
    val code: String,
    val seats: Int = 4,
    val isActive: Boolean = true,
    val tableAreaId: String? = null,
    val area: TableAreaDto? = null,
)

@Serializable
data class TableAreaDto(
    val id: String,
    val nameAr: String,
    val nameEn: String? = null,
)

// ── Orders ──

@Serializable
data class OrderDto(
    val id: String,
    val orderNo: String,
    val type: String = "TAKEAWAY",
    val status: String = "CONFIRMED",
    val totalAmount: Double = 0.0,
    val discountAmount: Double = 0.0,
    val taxAmount: Double = 0.0,
    val serviceChargeAmount: Double = 0.0,
    val grandTotal: Double = 0.0,
    val tableId: String? = null,
    val table: OrderTableRef? = null,
    val items: List<OrderItemDto> = emptyList(),
    val payments: List<PaymentDto> = emptyList(),
    val createdAt: String = "",
    val updatedAt: String? = null,
)

@Serializable
data class OrderTableRef(
    val id: String = "",
    val code: String = "",
)

@Serializable
data class OrderItemDto(
    val id: String,
    val productId: String,
    val itemNameAr: String = "",
    val qty: Int = 1,
    val unitPrice: Double = 0.0,
    val totalPrice: Double = 0.0,
    val modifiers: List<OrderItemModifierDto> = emptyList(),
)

@Serializable
data class OrderItemModifierDto(
    val id: String = "",
    val nameAr: String = "",
    val priceAdjustment: Double = 0.0,
)

@Serializable
data class PaymentDto(
    val id: String,
    val method: String = "CASH",
    val amount: Double = 0.0,
    val status: String = "CAPTURED",
)

// ── KDS ──

@Serializable
data class KdsTicketDto(
    val id: String,
    val status: String = "NEW",
    val createdAt: String = "",
    val items: List<KdsTicketItemDto> = emptyList(),
    val order: KdsOrderRef? = null,
)

@Serializable
data class KdsTicketItemDto(
    val id: String = "",
    val status: String = "NEW",
    val station: KdsStationRef? = null,
    val orderItem: KdsOrderItemRef? = null,
)

@Serializable
data class KdsStationRef(
    val id: String = "",
    val nameAr: String = "",
)

@Serializable
data class KdsOrderItemRef(
    val id: String = "",
    val itemNameAr: String = "",
    val qty: Int = 1,
)

@Serializable
data class KdsOrderRef(
    val id: String = "",
    val orderNo: String = "",
    val table: OrderTableRef? = null,
)

// ── Waiter ──

@Serializable
data class WaiterCallDto(
    val id: String,
    val reason: String = "",
    val status: String = "CREATED",
    val table: OrderTableRef? = null,
    val createdAt: String = "",
)

@Serializable
data class ReadyOrderDto(
    val id: String,
    val order: KdsOrderRef? = null,
)

// ── Coupon ──

@Serializable
data class CouponValidation(
    val valid: Boolean = false,
    val couponId: String = "",
    val code: String = "",
    val type: String = "PERCENTAGE",
    val discount: Double = 0.0,
)

// ── Loyalty ──

@Serializable
data class LoyaltyAccount(
    val id: String = "",
    val phone: String = "",
    val points: Int = 0,
    val lifetimePoints: Int = 0,
)
