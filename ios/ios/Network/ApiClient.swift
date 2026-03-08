import Foundation
import Combine

enum APIError: Error {
    case invalidURL
    case requestFailed(statusCode: Int, message: String?)
    case decodingError(Error)
    case unknown(Error)
}

extension APIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "رابط الخادم غير صالح"
        case .requestFailed(let statusCode, let message):
            let normalizedMessage = message?.lowercased() ?? ""
            if normalizedMessage.contains("jwt expired") {
                return "انتهت الجلسة. جاري تجديد الدخول أو أعد تسجيل الدخول."
            }
            if let message, !message.isEmpty {
                return "فشل الطلب (\(statusCode)): \(message)"
            }
            return "فشل الطلب برمز \(statusCode)"
        case .decodingError(let error):
            return "فشل قراءة البيانات: \(error.localizedDescription)"
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}

class ApiClient: ObservableObject {
    let configStore: PosConfigStore
    private let session: URLSession

    init(configStore: PosConfigStore) {
        self.configStore = configStore
        self.session = URLSession.shared
    }

    private func baseURL() -> String {
        return configStore.apiBaseUrl
    }

    private func normalizedBaseURL() -> String {
        var raw = baseURL().trimmingCharacters(in: .whitespacesAndNewlines)

        if raw.isEmpty {
            raw = "http://localhost:3002"
        }

        if !(raw.hasPrefix("http://") || raw.hasPrefix("https://")) {
            raw = "http://\(raw)"
        }

        if raw.hasSuffix("/") {
            raw.removeLast()
        }

        return raw
    }

    private func createRequest(path: String, method: String, body: Data? = nil, useAuth: Bool = true, useDeviceAuth: Bool = false) -> URLRequest? {
        let fullUrlString = "\(normalizedBaseURL())\(path)"
        guard let url = URL(string: fullUrlString) else {
            print("Invalid URL in ApiClient.createRequest: \(fullUrlString)")
            return nil
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if useAuth, let token = configStore.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue(configStore.branchId, forHTTPHeaderField: "x-branch-id")
            request.setValue(configStore.organizationId, forHTTPHeaderField: "x-org-id")
        }

        if useDeviceAuth {
            if let deviceId = configStore.deviceId {
                request.setValue(deviceId, forHTTPHeaderField: "x-device-id")
            }
            if let deviceToken = configStore.deviceToken {
                request.setValue(deviceToken, forHTTPHeaderField: "x-device-token")
            }
        }

        request.httpBody = body
        return request
    }

    private func extractServerMessage(from data: Data) -> String? {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let error = json["error"] as? String, !error.isEmpty {
                return error
            }
            if let message = json["message"] as? String, !message.isEmpty {
                return message
            }
        }

        if let raw = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty {
            return raw
        }

        return nil
    }

    private func shouldRefreshAuth(statusCode: Int, message: String?, request: URLRequest, isRetry: Bool) -> Bool {
        guard !isRetry,
              !(request.url?.path.contains("auth/refresh") ?? false),
              !(request.url?.path.contains("auth/login") ?? false),
              configStore.refreshToken != nil else {
            return false
        }

        if statusCode == 401 {
            return true
        }

        let normalized = (message ?? "").lowercased()
        return statusCode == 400 && (
            normalized.contains("jwt expired") ||
            normalized.contains("unauthorized") ||
            normalized.contains("invalid token")
        )
    }

    private func requestByRefreshingBearerToken(from request: URLRequest) async throws -> URLRequest {
        _ = try await refreshToken()
        var newRequest = request
        if let newToken = configStore.accessToken {
            newRequest.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
        }
        return newRequest
    }

    private func performData(_ request: URLRequest, isRetry: Bool = false) async throws -> Data {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown(NSError(domain: "Invalid Response", code: 0))
        }

        if !(200...299).contains(httpResponse.statusCode) {
            let message = extractServerMessage(from: data)

            if shouldRefreshAuth(statusCode: httpResponse.statusCode, message: message, request: request, isRetry: isRetry) {
                do {
                    let newRequest = try await requestByRefreshingBearerToken(from: request)
                    return try await performData(newRequest, isRetry: true)
                } catch {
                    DispatchQueue.main.async {
                        self.configStore.accessToken = nil
                        self.configStore.refreshToken = nil
                    }
                }
            }

            throw APIError.requestFailed(statusCode: httpResponse.statusCode, message: message)
        }

        return data
    }

    private func performJSONObject(_ request: URLRequest, isRetry: Bool = false) async throws -> [String: Any] {
        let data = try await performData(request, isRetry: isRetry)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw APIError.decodingError(NSError(domain: "Invalid JSON", code: 0))
        }

        return json
    }

    private func perform<T: Decodable>(_ request: URLRequest, isRetry: Bool = false) async throws -> T {
        do {
            let data = try await performData(request, isRetry: isRetry)

            do {
                let decoder = JSONDecoder()
                return try decoder.decode(T.self, from: data)
            } catch {
                print("Decoding error: \(error)")
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.unknown(error)
        }
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> LoginResponse {
        let body: [String: Any] = ["email": email, "password": password]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/auth/login", method: "POST", body: jsonData, useAuth: false) else {
            throw APIError.invalidURL
        }
        
        let wrapper: LoginResponseWrapper = try await perform(request)
        let response = wrapper.data
        
        // Auto-register device for demo to get full API access before triggering UI updates
        _ = try? await registerDevice(code: "IPAD-\(UUID().uuidString.prefix(4))")
        
        // Update tokens
        DispatchQueue.main.async {
            self.configStore.accessToken = response.accessToken
            self.configStore.refreshToken = response.refreshToken
        }
        return response
    }
    
    func refreshToken() async throws -> LoginResponse {
        guard let refreshToken = configStore.refreshToken else {
            throw APIError.unknown(NSError(domain: "No refresh token", code: 401))
        }
        
        let body: [String: Any] = ["refreshToken": refreshToken]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/auth/refresh", method: "POST", body: jsonData, useAuth: false) else {
            throw APIError.invalidURL
        }
        
        let wrapper: LoginResponseWrapper = try await perform(request)
        let response = wrapper.data
        DispatchQueue.main.async {
            self.configStore.accessToken = response.accessToken
            self.configStore.refreshToken = response.refreshToken
        }
        return response
    }
    
    func logout() async throws {
        guard let refreshToken = configStore.refreshToken else { return }
        
        let body: [String: Any] = ["refreshToken": refreshToken]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/auth/logout", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
        
        DispatchQueue.main.async {
            self.configStore.accessToken = nil
            self.configStore.refreshToken = nil
        }
    }

    // MARK: - Device Registration

    struct DeviceRegistrationResponse: Codable {
        let data: DeviceRegistrationData
    }

    struct DeviceRegistrationData: Codable {
        let deviceId: String
        let token: String
    }

    func registerDevice(code: String) async throws -> DeviceRegistrationData {
        let body: [String: Any] = [
            "branchId": configStore.branchId,
            "code": code,
            "name": "iPad POS",
            "platform": "IOS"
        ]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/pos/devices/register", method: "POST", body: jsonData, useAuth: false) else {
            throw APIError.invalidURL
        }

        let response: DeviceRegistrationResponse = try await perform(request)
        
        DispatchQueue.main.async {
            self.configStore.deviceId = response.data.deviceId
            self.configStore.deviceToken = response.data.token
        }
        
        return response.data
    }
    
    func rotateDeviceToken() async throws -> DeviceRegistrationData {
        guard let deviceId = configStore.deviceId,
              let oldToken = configStore.deviceToken else {
            throw APIError.unknown(NSError(domain: "Missing device credentials", code: 400))
        }
        
        let body: [String: Any] = [
            "deviceId": deviceId,
            "oldToken": oldToken
        ]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/pos/devices/rotate-token", method: "POST", body: jsonData, useAuth: false) else {
            throw APIError.invalidURL
        }
        
        let response: DeviceRegistrationResponse = try await perform(request)
        
        DispatchQueue.main.async {
            self.configStore.deviceToken = response.data.token
        }
        
        return response.data
    }

    // MARK: - Snapshot

    struct SnapshotResponse: Codable {
        let data: SnapshotData
    }
    
    // Custom decoding for Snapshot because the response structure might be nested
    // Looking at PosApiClient.kt: `val data = root.optJSONObject("data")`
    // So it returns { data: { ... } }

    func fetchSnapshot() async throws -> SnapshotData {
        guard let request = createRequest(path: "/api/pos/sync/snapshot?branchId=\(configStore.branchId)", method: "GET", useAuth: true, useDeviceAuth: true) else {
            throw APIError.invalidURL
        }
        
        let response: SnapshotResponse = try await perform(request)
        return response.data
    }

    // MARK: - Tables

    struct TablesResponse: Codable {
        let data: TablesData
    }

    struct TablesData: Codable {
        let tables: [TableDto]
        let areas: [TableAreaDto]
    }

    func getTables() async throws -> TablesData {
        guard let request = createRequest(path: "/api/admin/branches/\(configStore.branchId)/tables", method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let response: TablesResponse = try await perform(request)
        return response.data
    }

    // MARK: - Orders

    struct OrdersResponse: Decodable {
        let data: OrdersData
    }

    struct OrdersData: Decodable {
        let orders: [OrderDto]
        let pagination: Pagination?
    }

    struct Pagination: Decodable {
        let total: Int
        let totalPages: Int
    }

    func getOrders(page: Int = 1, limit: Int = 50, status: String? = nil) async throws -> OrdersData {
        var path = "/api/orders?branchId=\(configStore.branchId)&page=\(page)&limit=\(limit)"
        if let status = status {
            path += "&status=\(status)"
        }
        
        guard let request = createRequest(path: path, method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let response: OrdersResponse = try await perform(request)
        return response.data
    }
    
    func voidOrder(orderId: String, reason: String? = nil) async throws {
        var body: [String: Any] = [:]
        if let reason = reason {
            body["reason"] = reason
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(orderId)/void", method: "PATCH", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    func refundOrder(orderId: String, paymentId: String, amount: Double, reason: String? = nil) async throws {
        var body: [String: Any] = [
            "paymentId": paymentId,
            "amount": amount
        ]
        if let reason = reason {
            body["reason"] = reason
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(orderId)/refund", method: "PATCH", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    func applyDiscount(orderId: String, discountAmount: Double, reason: String? = nil) async throws {
        var body: [String: Any] = [
            "discountAmount": discountAmount
        ]
        if let reason = reason {
            body["reason"] = reason
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(orderId)/discount", method: "PATCH", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    func createOrder(type: String, items: [[String: Any]], tableId: String? = nil) async throws -> [String: Any] {
        var body: [String: Any] = [
            "branchId": configStore.branchId,
            "type": type,
            "items": items
        ]
        if let tableId = tableId {
            body["tableId"] = tableId
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func updateOrderStatus(orderId: String, status: String) async throws {
        let body: [String: Any] = ["status": status]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(orderId)/status", method: "PATCH", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    func splitOrder(orderId: String, items: [[String: Any]]) async throws -> [String: Any] {
        let body: [String: Any] = ["items": items]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(orderId)/split", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func mergeOrders(sourceOrderId: String, targetOrderId: String) async throws -> [String: Any] {
        let body: [String: Any] = ["targetOrderId": targetOrderId]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(sourceOrderId)/merge", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func transferTable(orderId: String, tableId: String, reason: String? = nil) async throws {
        var body: [String: Any] = ["tableId": tableId]
        if let reason = reason {
            body["reason"] = reason
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/orders/\(orderId)/transfer-table", method: "PATCH", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    func getInvoice(orderId: String) async throws -> Data? {
        guard let request = createRequest(path: "/api/orders/\(orderId)/invoice", method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }

        return try? await performData(request)
    }
    
    // MARK: - Coupons
    
    func validateCoupon(code: String, orderAmount: Double? = nil) async throws -> [String: Any] {
        var body: [String: Any] = [
            "code": code,
            "branchId": configStore.branchId
        ]
        if let orderAmount = orderAmount {
            body["orderAmount"] = orderAmount
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/pos/coupons/validate", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    // MARK: - Loyalty
    
    func getLoyalty(phone: String) async throws -> [String: Any] {
        guard let request = createRequest(path: "/api/pos/loyalty?phone=\(phone)", method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func loyaltyTransaction(phone: String, type: String, points: Int, orderId: String? = nil) async throws -> [String: Any] {
        var body: [String: Any] = [
            "phone": phone,
            "type": type,
            "points": points
        ]
        if let orderId = orderId {
            body["orderId"] = orderId
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/pos/loyalty", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    // MARK: - Sync
    
    func syncEvents(events: [[String: Any]]) async throws -> [String: Any] {
        guard let deviceId = configStore.deviceId else {
            throw APIError.unknown(NSError(domain: "Missing device ID", code: 400))
        }
        
        let body: [String: Any] = [
            "branchId": configStore.branchId,
            "deviceId": deviceId,
            "events": events
        ]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/pos/sync/events", method: "POST", body: jsonData, useAuth: true, useDeviceAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    // MARK: - Print
    
    func printReceipt(orderId: String, printerType: String = "RECEIPT", copies: Int = 1, deviceId: String? = nil) async throws -> [String: Any] {
        var body: [String: Any] = [
            "orderId": orderId,
            "printerType": printerType,
            "copies": max(1, copies)
        ]
        if let deviceId {
            body["deviceId"] = deviceId
        }
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/pos/print/receipt", method: "POST", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    // MARK: - KDS
    
    func getKdsTickets() async throws -> [String: Any] {
        guard let request = createRequest(path: "/api/kds/tickets?branchId=\(configStore.branchId)", method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func updateTicketStatus(ticketId: String, status: String) async throws {
        let body: [String: Any] = ["status": status]
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        
        guard let request = createRequest(path: "/api/kds/tickets/\(ticketId)/status", method: "PATCH", body: jsonData, useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    // MARK: - Waiter Calls
    
    func getWaiterCalls() async throws -> [String: Any] {
        guard let request = createRequest(path: "/api/waiter/calls?branchId=\(configStore.branchId)", method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func getReadyOrders() async throws -> [String: Any] {
        guard let request = createRequest(path: "/api/waiter/ready-queue?branchId=\(configStore.branchId)", method: "GET", useAuth: true) else {
            throw APIError.invalidURL
        }

        return try await performJSONObject(request)
    }
    
    func ackWaiterCall(callId: String) async throws {
        guard let request = createRequest(path: "/api/waiter/calls/\(callId)/ack", method: "PATCH", useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    func resolveWaiterCall(callId: String) async throws {
        guard let request = createRequest(path: "/api/waiter/calls/\(callId)/resolve", method: "PATCH", useAuth: true) else {
            throw APIError.invalidURL
        }
        
        let _: EmptyResponse = try await perform(request)
    }
    
    struct EmptyResponse: Codable {}
}
