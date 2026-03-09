import Foundation
import Combine

class PosConfigStore: ObservableObject {
    @Published var apiBaseUrl: String {
        didSet { UserDefaults.standard.set(apiBaseUrl, forKey: "apiBaseUrl") }
    }
    @Published var branchId: String {
        didSet { UserDefaults.standard.set(branchId, forKey: "branchId") }
    }
    @Published var organizationId: String {
        didSet { UserDefaults.standard.set(organizationId, forKey: "organizationId") }
    }
    @Published var deviceId: String? {
        didSet { UserDefaults.standard.set(deviceId, forKey: "deviceId") }
    }
    @Published var deviceToken: String? {
        didSet { UserDefaults.standard.set(deviceToken, forKey: "deviceToken") }
    }
    @Published var accessToken: String? {
        didSet { UserDefaults.standard.set(accessToken, forKey: "accessToken") }
    }
    @Published var refreshToken: String? {
        didSet { UserDefaults.standard.set(refreshToken, forKey: "refreshToken") }
    }
    @Published var receiptPrinterName: String {
        didSet { UserDefaults.standard.set(receiptPrinterName, forKey: "receiptPrinterName") }
    }
    @Published var autoPrintReceipt: Bool {
        didSet { UserDefaults.standard.set(autoPrintReceipt, forKey: "autoPrintReceipt") }
    }
    @Published var autoPrintKitchenTicket: Bool {
        didSet { UserDefaults.standard.set(autoPrintKitchenTicket, forKey: "autoPrintKitchenTicket") }
    }
    @Published var openInvoicePreviewAfterOrder: Bool {
        didSet { UserDefaults.standard.set(openInvoicePreviewAfterOrder, forKey: "openInvoicePreviewAfterOrder") }
    }
    @Published var receiptPrintCopies: Int {
        didSet { UserDefaults.standard.set(receiptPrintCopies, forKey: "receiptPrintCopies") }
    }
    @Published var kitchenPrintCopies: Int {
        didSet { UserDefaults.standard.set(kitchenPrintCopies, forKey: "kitchenPrintCopies") }
    }

    private static let defaultApiBaseUrl = "https://api.clo0.net"

    private static func normalizedApiBaseUrl(from rawValue: String?) -> String {
        let trimmed = (rawValue ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let lowercased = trimmed.lowercased()

        if trimmed.isEmpty {
            return defaultApiBaseUrl
        }

        if trimmed.contains("api.ampos.com") {
            return defaultApiBaseUrl
        }

        if lowercased.contains("localhost") ||
            lowercased.contains("127.0.0.1") ||
            lowercased.contains("0.0.0.0") {
            return defaultApiBaseUrl
        }

        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            return trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }

        return "http://\(trimmed)".trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
    
    init() {
        let storedApiBaseUrl = UserDefaults.standard.string(forKey: "apiBaseUrl")
        self.apiBaseUrl = Self.normalizedApiBaseUrl(from: storedApiBaseUrl)
        self.branchId = UserDefaults.standard.string(forKey: "branchId") ?? "br_demo" // Default demo branch
        self.organizationId = UserDefaults.standard.string(forKey: "organizationId") ?? "org_demo" // Demo organization
        self.deviceId = UserDefaults.standard.string(forKey: "deviceId")
        self.deviceToken = UserDefaults.standard.string(forKey: "deviceToken")
        self.accessToken = UserDefaults.standard.string(forKey: "accessToken")
        self.refreshToken = UserDefaults.standard.string(forKey: "refreshToken")
        self.receiptPrinterName = UserDefaults.standard.string(forKey: "receiptPrinterName") ?? "طابعة الكاشير الرئيسية"
        self.autoPrintReceipt = UserDefaults.standard.object(forKey: "autoPrintReceipt") as? Bool ?? true
        self.autoPrintKitchenTicket = UserDefaults.standard.object(forKey: "autoPrintKitchenTicket") as? Bool ?? false
        self.openInvoicePreviewAfterOrder = UserDefaults.standard.object(forKey: "openInvoicePreviewAfterOrder") as? Bool ?? false
        self.receiptPrintCopies = max(1, UserDefaults.standard.integer(forKey: "receiptPrintCopies"))
        self.kitchenPrintCopies = max(1, UserDefaults.standard.integer(forKey: "kitchenPrintCopies"))

        UserDefaults.standard.set(self.apiBaseUrl, forKey: "apiBaseUrl")
    }
}
