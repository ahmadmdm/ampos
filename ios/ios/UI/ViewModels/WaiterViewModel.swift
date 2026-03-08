import Foundation
import Combine

struct WaiterCallUi: Identifiable {
    let id: String
    let tableCode: String
    let reason: String
    let status: String
    let createdAt: String
    let elapsedMin: Int
}

struct ReadyOrderUi: Identifiable {
    let id = UUID()  // Since ticketId might not be unique
    let ticketId: String
    let orderNo: String
    let tableCode: String
}

class WaiterViewModel: ObservableObject {
    @Published var waiterCalls: [WaiterCallUi] = []
    @Published var readyOrders: [ReadyOrderUi] = []
    @Published var isLoading: Bool = false
    @Published var message: String?
    
    private let apiClient: ApiClient
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
    }
    
    @MainActor
    func refresh() async {
        isLoading = true
        message = nil
        
        do {
            // Load waiter calls
            let callsResult = try await apiClient.getWaiterCalls()
            await parseWaiterCallsData(callsResult)
            
            // Load ready orders  
            let readyResult = try await apiClient.getReadyOrders()
            await parseReadyOrdersData(readyResult)
            
        } catch {
            message = "فشل التحميل: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    private func parseWaiterCallsData(_ data: [String: Any]) async {
        guard let callsArray = data["data"] as? [[String: Any]] else {
            return
        }
        
        let now = Date()
        var parsedCalls: [WaiterCallUi] = []
        
        for callData in callsArray {
            guard let callId = callData["id"] as? String else { continue }
            
            // Parse creation time for elapsed calculation
            var createdAt = now
            let createdAtString = callData["createdAt"] as? String ?? ""
            if !createdAtString.isEmpty {
                let formatter = ISO8601DateFormatter()
                createdAt = formatter.date(from: createdAtString) ?? now
            }
            
            let elapsedMin = Int(now.timeIntervalSince(createdAt) / 60)
            
            // Parse table info
            let tableData = callData["table"] as? [String: Any]
            let tableCode = tableData?["code"] as? String ?? "-"
            
            let call = WaiterCallUi(
                id: callId,
                tableCode: tableCode,
                reason: callData["reason"] as? String ?? "-",
                status: callData["status"] as? String ?? "CREATED",
                createdAt: createdAtString,
                elapsedMin: max(0, elapsedMin)
            )
            
            parsedCalls.append(call)
        }
        
        await MainActor.run {
            self.waiterCalls = parsedCalls
        }
    }
    
    private func parseReadyOrdersData(_ data: [String: Any]) async {
        guard let ordersArray = data["data"] as? [[String: Any]] else {
            return
        }
        
        var parsedOrders: [ReadyOrderUi] = []
        
        for orderData in ordersArray {
            guard let ticketId = orderData["id"] as? String,
                  let order = orderData["order"] as? [String: Any] else {
                continue
            }
            
            let orderNo = order["orderNo"] as? String ?? "-"
            
            // Parse table info
            let tableData = order["table"] as? [String: Any]
            let tableCode = tableData?["code"] as? String ?? "-"
            
            let readyOrder = ReadyOrderUi(
                ticketId: ticketId,
                orderNo: orderNo,
                tableCode: tableCode
            )
            
            parsedOrders.append(readyOrder)
        }
        
        await MainActor.run {
            self.readyOrders = parsedOrders
        }
    }
    
    @MainActor
    func ackCall(callId: String) async {
        do {
            try await apiClient.ackWaiterCall(callId: callId)
            message = "تم الاستلام ✓"
            await refresh()
        } catch {
            message = "خطأ: \(error.localizedDescription)"
        }
    }
    
    @MainActor
    func resolveCall(callId: String) async {
        do {
            try await apiClient.resolveWaiterCall(callId: callId)
            message = "تم الإنهاء ✓"
            await refresh()
        } catch {
            message = "خطأ: \(error.localizedDescription)"
        }
    }
}