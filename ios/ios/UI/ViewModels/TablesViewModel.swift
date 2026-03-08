import Foundation
import Combine

struct TableWithStatus: Identifiable {
    var id: String { table.id }
    let table: TableDto
    let status: TableStatus
    let activeOrder: OrderDto?
    let guestCount: Int
    let elapsedMin: Int
}

enum TableStatus: String {
    case available = "AVAILABLE"
    case occupied = "OCCUPIED"
    case reserved = "RESERVED"
    case needsService = "NEEDS_SERVICE"
}

class TablesViewModel: ObservableObject {
    @Published var tables: [TableWithStatus] = []
    @Published var areas: [String] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiClient: ApiClient
    
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
    }
    
    @MainActor
    func loadTables() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Fetch tables and orders in parallel
            async let tablesTask = apiClient.getTables()
            async let ordersTask = apiClient.getOrders(page: 1, limit: 100, status: nil)
            
            let (tablesData, ordersData) = try await (tablesTask, ordersTask)
            
            // Process Areas
            var areasList = ["الكل"]
            areasList.append(contentsOf: tablesData.areas.map { $0.nameAr })
            self.areas = areasList
            
            // Process Active Orders
            var activeOrdersByTable: [String: OrderDto] = [:]
            let activeStatuses = ["CONFIRMED", "IN_KITCHEN", "READY", "SERVED"]
            
            for order in ordersData.orders {
                if let tableId = order.tableId, !tableId.isEmpty, activeStatuses.contains(order.status) {
                    activeOrdersByTable[tableId] = order
                }
            }
            
            // Map Tables
            self.tables = tablesData.tables.map { table in
                let activeOrder = activeOrdersByTable[table.id]
                let status: TableStatus
                
                if activeOrder != nil {
                    status = .occupied // Simplified logic, can be enhanced
                } else {
                    status = .available
                }
                
                // Calculate elapsed time if order exists
                var elapsed = 0
                if let order = activeOrder, let date = ISO8601DateFormatter().date(from: order.createdAt) {
                    elapsed = Int(Date().timeIntervalSince(date) / 60)
                }
                
                return TableWithStatus(
                    table: table,
                    status: status,
                    activeOrder: activeOrder,
                    guestCount: 0, // Need to add guest count to order or table model if available
                    elapsedMin: elapsed
                )
            }
            
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
