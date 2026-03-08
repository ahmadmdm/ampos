import Foundation
import Combine

struct KdsTicketUi: Identifiable {
    let id: String
    let orderNo: String
    let tableCode: String
    let status: String
    let elapsedMin: Int
    let items: [KdsTicketItemUi]
    let station: String
}

struct KdsTicketItemUi: Identifiable {
    let id = UUID()
    let name: String
    let qty: Int
    let status: String
    let station: String
}

class KdsViewModel: ObservableObject {
    @Published var tickets: [KdsTicketUi] = []
    @Published var stations: [String] = ["الكل"]
    @Published var selectedStation: String = "الكل"
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let apiClient: ApiClient
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
    }
    
    @MainActor
    func refreshTickets() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let result = try await apiClient.getKdsTickets()
            await parseTicketsData(result)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func parseTicketsData(_ data: [String: Any]) async {
        guard let ticketsArray = data["data"] as? [[String: Any]] else {
            return
        }
        
        let now = Date()
        var parsedTickets: [KdsTicketUi] = []
        var stationSet: Set<String> = []
        
        for ticketData in ticketsArray {
            guard let ticketId = ticketData["id"] as? String,
                  let orderData = ticketData["order"] as? [String: Any],
                  let orderNo = orderData["orderNo"] as? String else {
                continue
            }
            
            // Parse creation time for elapsed calculation
            var createdAt = now
            if let createdAtString = ticketData["createdAt"] as? String {
                let formatter = ISO8601DateFormatter()
                createdAt = formatter.date(from: createdAtString) ?? now
            }
            
            let elapsedMin = Int(now.timeIntervalSince(createdAt) / 60)
            
            // Parse table info
            let tableData = orderData["table"] as? [String: Any]
            let tableCode = tableData?["code"] as? String ?? "-"
            
            // Parse items
            var items: [KdsTicketItemUi] = []
            var ticketStation = ""
            
            if let itemsArray = ticketData["items"] as? [[String: Any]] {
                for itemData in itemsArray {
                    if let orderItem = itemData["orderItem"] as? [String: Any] {
                        let station = itemData["station"] as? [String: Any]
                        let stationName = station?["nameAr"] as? String ?? ""
                        
                        if !stationName.isEmpty {
                            stationSet.insert(stationName)
                            if ticketStation.isEmpty {
                                ticketStation = stationName
                            }
                        }
                        
                        let item = KdsTicketItemUi(
                            name: orderItem["itemNameAr"] as? String ?? "عنصر",
                            qty: orderItem["qty"] as? Int ?? 1,
                            status: itemData["status"] as? String ?? "NEW",
                            station: stationName
                        )
                        items.append(item)
                    }
                }
            }
            
            let ticket = KdsTicketUi(
                id: ticketId,
                orderNo: orderNo,
                tableCode: tableCode,
                status: ticketData["status"] as? String ?? "NEW",
                elapsedMin: max(0, elapsedMin),
                items: items,
                station: ticketStation
            )
            
            parsedTickets.append(ticket)
        }
        
        await MainActor.run {
            self.tickets = parsedTickets
            self.stations = ["الكل"] + Array(stationSet).sorted()
        }
    }
    
    @MainActor
    func updateTicketStatus(ticketId: String, status: String) async {
        do {
            try await apiClient.updateTicketStatus(ticketId: ticketId, status: status)
            await refreshTickets()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func filteredTickets(status: String) -> [KdsTicketUi] {
        return tickets.filter { ticket in
            ticket.status == status &&
            (selectedStation == "الكل" || 
             ticket.station == selectedStation ||
             ticket.items.contains { $0.station == selectedStation })
        }
    }
}