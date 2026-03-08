import Foundation

// MARK: - Auth

struct LoginResponseWrapper: Codable {
    let ok: Bool
    let data: LoginResponse
}

struct LoginResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: UserInfo
}

struct UserInfo: Codable {
    let id: String
    let email: String
    let displayName: String?
    let roles: [String]
    let branchIds: [String]
}

// MARK: - Snapshot

struct SnapshotData: Codable {
    var snapshotAt: String = ""
    var categories: [CategoryDto] = []
    var products: [ProductDto] = []
    var tables: [TableDto] = []
    var settings: BranchSettings = BranchSettings()
}

struct BranchSettings: Codable {
    @FlexibleInt var taxRateBps: Int = 1500
    @FlexibleInt var serviceChargeBps: Int = 0
    @FlexibleInt var waiterCallCooldownSec: Int = 30
    var isQrOrderingEnabled: Bool = false
    var isWaiterCallEnabled: Bool = false
}

struct CategoryDto: Codable, Identifiable {
    let id: String
    let nameAr: String
    let nameEn: String?
    @FlexibleInt var sortOrder: Int = 0
}

struct ProductDto: Codable, Identifiable {
    let id: String
    let nameAr: String
    let nameEn: String?
    @FlexibleDouble var basePrice: Double = 0.0
    var categoryId: String = ""
    var category: CategoryRef?
    var requiresKitchen: Bool = true
    var isActive: Bool = true
    let imageUrl: String?
    var modifierGroups: [ModifierGroupDto] = []
}

struct CategoryRef: Codable {
    var nameAr: String = "عام"
    let nameEn: String?
}

struct ModifierGroupDto: Codable, Identifiable {
    let id: String
    let nameAr: String
    let nameEn: String?
    @FlexibleInt var minSelections: Int = 0
    @FlexibleInt var maxSelections: Int = 1
    var options: [ModifierOptionDto] = []
}

struct ModifierOptionDto: Codable, Identifiable {
    let id: String
    let nameAr: String
    let nameEn: String?
    @FlexibleDouble var priceAdjustment: Double = 0.0
    var isDefault: Bool = false
}

// MARK: - Tables

struct TableDto: Codable, Identifiable {
    let id: String
    let code: String
    @FlexibleInt var seats: Int = 4
    var isActive: Bool = true
    let tableAreaId: String?
    let area: TableAreaDto?
}

struct TableAreaDto: Codable, Identifiable {
    let id: String
    let nameAr: String
    let nameEn: String?
}

// MARK: - Orders

struct OrderDto: Decodable, Identifiable {
    let id: String
    let orderNo: String
    var type: String = "TAKEAWAY"
    var status: String = "CONFIRMED"
    @FlexibleDouble var totalAmount: Double = 0.0
    @FlexibleDouble var discountAmount: Double = 0.0
    @FlexibleDouble var taxAmount: Double = 0.0
    @FlexibleDouble var serviceChargeAmount: Double = 0.0
    @FlexibleDouble var grandTotal: Double = 0.0
    let tableId: String?
    let table: OrderTableRef?
    var items: [OrderItemDto] = []
    var payments: [PaymentDto] = []
    var createdAt: String = ""
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case orderNo
        case type
        case status
        case totalAmount
        case discountAmount
        case taxAmount
        case serviceChargeAmount
        case serviceCharge
        case grandTotal
        case tableId
        case table
        case items
        case payments
        case createdAt
        case updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        orderNo = try container.decode(String.self, forKey: .orderNo)
        type = try container.decodeIfPresent(String.self, forKey: .type) ?? "TAKEAWAY"
        status = try container.decodeIfPresent(String.self, forKey: .status) ?? "CONFIRMED"
        _totalAmount = try container.decodeIfPresent(FlexibleDouble.self, forKey: .totalAmount) ?? FlexibleDouble(wrappedValue: 0.0)
        _discountAmount = try container.decodeIfPresent(FlexibleDouble.self, forKey: .discountAmount) ?? FlexibleDouble(wrappedValue: 0.0)
        _taxAmount = try container.decodeIfPresent(FlexibleDouble.self, forKey: .taxAmount) ?? FlexibleDouble(wrappedValue: 0.0)
        _serviceChargeAmount =
            try container.decodeIfPresent(FlexibleDouble.self, forKey: .serviceChargeAmount) ??
            container.decodeIfPresent(FlexibleDouble.self, forKey: .serviceCharge) ??
            FlexibleDouble(wrappedValue: 0.0)
        _grandTotal =
            try container.decodeIfPresent(FlexibleDouble.self, forKey: .grandTotal) ??
            container.decodeIfPresent(FlexibleDouble.self, forKey: .totalAmount) ??
            FlexibleDouble(wrappedValue: 0.0)
        tableId = try container.decodeIfPresent(String.self, forKey: .tableId)
        table = try container.decodeIfPresent(OrderTableRef.self, forKey: .table)
        items = try container.decodeIfPresent([OrderItemDto].self, forKey: .items) ?? []
        payments = try container.decodeIfPresent([PaymentDto].self, forKey: .payments) ?? []
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
}

struct OrderTableRef: Codable {
    var id: String = ""
    var code: String = ""
}

struct OrderItemDto: Decodable, Identifiable {
    let id: String
    let productId: String
    var itemNameAr: String = ""
    @FlexibleInt var qty: Int = 1
    @FlexibleDouble var unitPrice: Double = 0.0
    @FlexibleDouble var totalPrice: Double = 0.0
    var modifiers: [OrderItemModifierDto] = []

    enum CodingKeys: String, CodingKey {
        case id
        case productId
        case itemNameAr
        case qty
        case unitPrice
        case totalPrice
        case lineTotal
        case modifiers
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        productId = try container.decode(String.self, forKey: .productId)
        itemNameAr = try container.decodeIfPresent(String.self, forKey: .itemNameAr) ?? ""
        _qty = try container.decodeIfPresent(FlexibleInt.self, forKey: .qty) ?? FlexibleInt(wrappedValue: 1)
        _unitPrice = try container.decodeIfPresent(FlexibleDouble.self, forKey: .unitPrice) ?? FlexibleDouble(wrappedValue: 0.0)
        _totalPrice =
            try container.decodeIfPresent(FlexibleDouble.self, forKey: .totalPrice) ??
            container.decodeIfPresent(FlexibleDouble.self, forKey: .lineTotal) ??
            FlexibleDouble(wrappedValue: 0.0)
        modifiers = try container.decodeIfPresent([OrderItemModifierDto].self, forKey: .modifiers) ?? []
    }
}

struct OrderItemModifierDto: Codable, Identifiable {
    var id: String = ""
    var nameAr: String = ""
    @FlexibleDouble var priceAdjustment: Double = 0.0
}

struct PaymentDto: Codable, Identifiable {
    let id: String
    var method: String = "CASH"
    @FlexibleDouble var amount: Double = 0.0
    var status: String = "CAPTURED"
}

// MARK: - KDS

struct KdsTicketDto: Codable, Identifiable {
    let id: String
    var status: String = "NEW"
    var createdAt: String = ""
    var items: [KdsTicketItemDto] = []
    let order: KdsOrderRef?
}

struct KdsTicketItemDto: Codable, Identifiable {
    var id: String = ""
    var status: String = "NEW"
    let station: KdsStationRef?
    let orderItem: KdsOrderItemRef?
}

struct KdsStationRef: Codable, Identifiable {
    var id: String = ""
    var nameAr: String = ""
}

struct KdsOrderItemRef: Codable, Identifiable {
    var id: String = ""
    var itemNameAr: String = ""
    @FlexibleInt var qty: Int = 1
}

struct KdsOrderRef: Codable, Identifiable {
    var id: String = ""
    // Add other fields if necessary based on usage
}
