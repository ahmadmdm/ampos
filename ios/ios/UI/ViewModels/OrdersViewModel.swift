import Foundation
import Combine

class OrdersViewModel: ObservableObject {
    @Published var orders: [OrderDto] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Pagination
    @Published var currentPage = 1
    @Published var totalPages = 1
    @Published var totalOrders = 0
    
    // Filter
    @Published var statusFilter: String? = nil
    
    private let apiClient: ApiClient
    
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
    }
    
    @MainActor
    func loadOrders() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await apiClient.getOrders(page: currentPage, limit: 20, status: statusFilter)
            self.orders = response.orders
            if let pagination = response.pagination {
                self.totalPages = pagination.totalPages
                self.totalOrders = pagination.total
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func refreshOrders() {
        currentPage = 1
        Task {
            await loadOrders()
        }
    }
    
    func nextPage() {
        if currentPage < totalPages {
            currentPage += 1
            Task {
                await loadOrders()
            }
        }
    }
    
    func prevPage() {
        if currentPage > 1 {
            currentPage -= 1
            Task {
                await loadOrders()
            }
        }
    }
    
    func updateStatusFilter(_ status: String?) {
        statusFilter = status
        refreshOrders()
    }
    
    @MainActor
    func voidOrder(orderId: String, reason: String? = nil) async {
        isLoading = true
        do {
            try await apiClient.voidOrder(orderId: orderId, reason: reason)
            await loadOrders() // Refresh list
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    @MainActor
    func refundOrder(orderId: String, paymentId: String, amount: Double, reason: String? = nil) async {
        isLoading = true
        do {
            try await apiClient.refundOrder(orderId: orderId, paymentId: paymentId, amount: amount, reason: reason)
            await loadOrders()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    @MainActor
    func applyDiscount(orderId: String, amount: Double, reason: String? = nil) async {
        isLoading = true
        do {
            try await apiClient.applyDiscount(orderId: orderId, discountAmount: amount, reason: reason)
            await loadOrders()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
