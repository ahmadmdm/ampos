import Foundation
import Combine

struct CartItem: Identifiable {
    let id = UUID()
    let product: ProductDto
    var qty: Int = 1
    var selectedModifiers: [SelectedModifier] = []
    var notes: String = ""
    
    var unitPrice: Double {
        product.basePrice + selectedModifiers.reduce(0) { $0 + $1.priceAdjustment }
    }
    
    var lineTotal: Double {
        unitPrice * Double(qty)
    }
}

struct SelectedModifier: Identifiable {
    let id = UUID()
    let groupId: String
    let optionId: String
    let nameAr: String
    let priceAdjustment: Double
}

class CashierViewModel: ObservableObject {
    @Published var products: [ProductDto] = []
    @Published var categories: [CategoryDto] = []
    @Published var tables: [TableDto] = []
    @Published var selectedCategory: CategoryDto?
    
    @Published var cart: [CartItem] = []
    @Published var orderType: String = "DINE_IN"
    @Published var selectedTableId: String?
    
    @Published var isLoading = false
    @Published var isSubmittingOrder = false
    @Published var isPrintingReceipt = false
    @Published var isPreparingInvoicePreview = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    @Published var printStatusMessage: String?
    @Published var printStatusIsError = false
    @Published var invoicePreviewURL: URL?
    @Published var lastCreatedOrderId: String?
    @Published var lastCreatedOrderNo: String?
    
    private let apiClient: ApiClient
    private let configStore: PosConfigStore
    
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
        self.configStore = apiClient.configStore
    }
    
    var filteredProducts: [ProductDto] {
        guard let category = selectedCategory else {
            return products
        }
        return products.filter { $0.categoryId == category.id }
    }
    
    var subtotal: Double {
        cart.reduce(0) { $0 + $1.lineTotal }
    }
    
    var taxRate: Double = 0.15 // Default, should fetch from settings
    
    var taxAmount: Double {
        subtotal * taxRate
    }
    
    var grandTotal: Double {
        subtotal + taxAmount
    }

    var requiresTableSelection: Bool {
        orderType == "DINE_IN"
    }

    var activeTables: [TableDto] {
        tables.filter { $0.isActive }
    }
    
    @MainActor
    func loadData() async {
        isLoading = true
        errorMessage = nil
        successMessage = nil
        printStatusMessage = nil
        do {
            let snapshot = try await apiClient.fetchSnapshot()
            self.products = snapshot.products
            self.categories = snapshot.categories.sorted(by: { $0.sortOrder < $1.sortOrder })
            self.tables = snapshot.tables
            // Set tax rate from settings if available
            self.taxRate = Double(snapshot.settings.taxRateBps) / 10000.0
            
            if let firstCategory = self.categories.first {
                self.selectedCategory = firstCategory
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    func submitOrder() async {
        guard !cart.isEmpty else {
            errorMessage = "السلة فارغة"
            return
        }

        if requiresTableSelection && selectedTableId == nil {
            errorMessage = "اختر الطاولة أولاً"
            return
        }

        isSubmittingOrder = true
        errorMessage = nil
        successMessage = nil
        printStatusMessage = nil

        do {
            let items = cart.map { item in
                [
                    "productId": item.product.id,
                    "qty": item.qty,
                    "unitPrice": item.unitPrice,
                    "itemNameAr": item.product.nameAr,
                ] as [String: Any]
            }

            let response = try await apiClient.createOrder(
                type: orderType,
                items: items,
                tableId: requiresTableSelection ? selectedTableId : nil
            )

            let orderData = response["data"] as? [String: Any]
            let orderId = orderData?["id"] as? String
            let orderNo = orderData?["orderNo"] as? String
            lastCreatedOrderId = orderId
            lastCreatedOrderNo = orderNo
            successMessage = orderNo.map { "تم إنشاء الطلب بنجاح (#\($0))" } ?? "تم إنشاء الطلب بنجاح"
            cart.removeAll()
            selectedTableId = nil

            if let orderId {
                await handlePostOrderActions(orderId: orderId)
            }
        } catch {
            errorMessage = "تعذر إنشاء الطلب: \(error.localizedDescription)"
        }

        isSubmittingOrder = false
    }

    @MainActor
    func printLastReceipt() async {
        guard let orderId = lastCreatedOrderId else {
            setPrintStatus(message: "لا يوجد طلب جاهز للطباعة", isError: true)
            return
        }

        await sendPrintRequest(
            orderId: orderId,
            printerType: "RECEIPT",
            copies: configStore.receiptPrintCopies,
            successMessage: "تم إرسال طلب طباعة الإيصال"
        )
    }

    @MainActor
    func previewLastInvoice() async {
        guard let orderId = lastCreatedOrderId else {
            setPrintStatus(message: "لا يوجد إيصال متاح للمعاينة", isError: true)
            return
        }

        await prepareInvoicePreview(orderId: orderId)
    }
    
    func addToCart(product: ProductDto) {
        // Check if already in cart (without modifiers for now)
        if let index = cart.firstIndex(where: { $0.product.id == product.id && $0.selectedModifiers.isEmpty }) {
            cart[index].qty += 1
        } else {
            cart.append(CartItem(product: product))
        }
    }
    
    func removeFromCart(item: CartItem) {
        if let index = cart.firstIndex(where: { $0.id == item.id }) {
            cart.remove(at: index)
        }
    }
    
    func updateQuantity(item: CartItem, delta: Int) {
        if let index = cart.firstIndex(where: { $0.id == item.id }) {
            let newQty = cart[index].qty + delta
            if newQty > 0 {
                cart[index].qty = newQty
            } else {
                cart.remove(at: index)
            }
        }
    }
    
    func clearCart() {
        cart.removeAll()
        successMessage = nil
        printStatusMessage = nil
    }

    @MainActor
    func clearInvoicePreview() {
        invoicePreviewURL = nil
    }
    
    @MainActor
    func registerDevice(code: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await apiClient.registerDevice(code: code)
            // Device registration success - could show success message
        } catch {
            errorMessage = "فشل تسجيل الجهاز: \(error.localizedDescription)"
        }
        
        isLoading = false
    }

    @MainActor
    private func handlePostOrderActions(orderId: String) async {
        if configStore.autoPrintReceipt {
            await sendPrintRequest(
                orderId: orderId,
                printerType: "RECEIPT",
                copies: configStore.receiptPrintCopies,
                successMessage: "تم إرسال الإيصال إلى \(configStore.receiptPrinterName)"
            )
        }

        if configStore.autoPrintKitchenTicket {
            await sendPrintRequest(
                orderId: orderId,
                printerType: "KITCHEN",
                copies: configStore.kitchenPrintCopies,
                successMessage: "تم إرسال نسخة المطبخ للطباعة"
            )
        }

        if configStore.openInvoicePreviewAfterOrder {
            await prepareInvoicePreview(orderId: orderId)
        }
    }

    @MainActor
    private func sendPrintRequest(orderId: String, printerType: String, copies: Int, successMessage: String) async {
        isPrintingReceipt = true
        do {
            _ = try await apiClient.printReceipt(
                orderId: orderId,
                printerType: printerType,
                copies: copies,
                deviceId: configStore.deviceId
            )
            setPrintStatus(message: successMessage, isError: false)
        } catch {
            setPrintStatus(message: "فشل إرسال الطباعة: \(error.localizedDescription)", isError: true)
        }
        isPrintingReceipt = false
    }

    @MainActor
    private func prepareInvoicePreview(orderId: String) async {
        isPreparingInvoicePreview = true
        do {
            guard let data = try await apiClient.getInvoice(orderId: orderId), !data.isEmpty else {
                setPrintStatus(message: "تعذر تحميل ملف الإيصال", isError: true)
                isPreparingInvoicePreview = false
                return
            }

            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("invoice-\(orderId)")
                .appendingPathExtension("pdf")

            try data.write(to: url, options: .atomic)
            invoicePreviewURL = url
            setPrintStatus(message: "تم تجهيز ملف الإيصال للمشاركة أو الطباعة", isError: false)
        } catch {
            setPrintStatus(message: "فشل تجهيز الإيصال: \(error.localizedDescription)", isError: true)
        }
        isPreparingInvoicePreview = false
    }

    @MainActor
    private func setPrintStatus(message: String, isError: Bool) {
        printStatusMessage = message
        printStatusIsError = isError
    }
}
