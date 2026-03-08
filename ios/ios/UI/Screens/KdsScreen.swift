import SwiftUI

struct KdsScreen: View {
    @StateObject private var viewModel: KdsViewModel
    @State private var refreshTimer: Timer?
    
    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: KdsViewModel(apiClient: apiClient))
    }
    
    let kdsColumns = [
        KdsColumn(status: "NEW", labelAr: "جديد", color: PosColors.Info, bgColor: PosColors.InfoBg),
        KdsColumn(status: "COOKING", labelAr: "قيد التحضير", color: PosColors.Warning, bgColor: PosColors.WarningBg),
        KdsColumn(status: "READY", labelAr: "جاهز", color: PosColors.Success, bgColor: PosColors.SuccessBg),
        KdsColumn(status: "SERVED", labelAr: "تم التقديم", color: PosColors.Slate500, bgColor: PosColors.Slate100)
    ]
    
    var slaBreaches: Int {
        viewModel.tickets.filter { $0.elapsedMin > 12 }.count
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text("شاشة المطبخ")
                        .font(.title2)  
                        .fontWeight(.bold)
                    Text("\(viewModel.tickets.count) تذكرة نشطة")
                        .font(.caption)
                        .foregroundColor(PosColors.Slate500)
                }
                
                Spacer()
                
                // SLA Warning
                if slaBreaches > 0 {
                    PulsingWarningView(count: slaBreaches)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            
            // Station Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(viewModel.stations, id: \.self) { station in
                        Button(action: {
                            viewModel.selectedStation = station
                        }) {
                            Text(station)
                                .font(.caption)
                                .fontWeight(viewModel.selectedStation == station ? .bold : .regular)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    viewModel.selectedStation == station 
                                        ? PosColors.Brand100 
                                        : PosColors.Slate100
                                )
                                .foregroundColor(
                                    viewModel.selectedStation == station 
                                        ? PosColors.Brand700 
                                        : PosColors.Slate600
                                )
                                .cornerRadius(20)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.top, 12)
            
            // Kanban Board 
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 8) {
                    ForEach(kdsColumns, id: \.status) { column in
                        let columnTickets = viewModel.filteredTickets(status: column.status)
                        
                        KdsColumnView(
                            column: column,
                            tickets: columnTickets,
                            onStatusChange: { ticketId, newStatus in
                                Task {
                                    await viewModel.updateTicketStatus(ticketId: ticketId, status: newStatus)
                                }
                            }
                        )
                        .frame(width: 280)
                    }
                }
                .padding(.horizontal, 8)
            }
            .frame(maxHeight: .infinity)
            .padding(.top, 12)
        }
        .navigationBarHidden(true)
        .onAppear {
            startAutoRefresh()
        }
        .onDisappear {
            stopAutoRefresh()
        }
        .task {
            await viewModel.refreshTickets()
        }
    }
    
    private func startAutoRefresh() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: true) { _ in
            Task {
                await viewModel.refreshTickets()
            }
        }
    }
    
    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
}

// MARK: - KdsColumn Data Structure
struct KdsColumn {
    let status: String
    let labelAr: String
    let color: Color
    let bgColor: Color
}

// MARK: - Pulsing SLA Warning
struct PulsingWarningView: View {
    let count: Int
    @State private var pulseAnimation = false
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock")
                .font(.system(size: 16))
                .foregroundColor(PosColors.Danger)
            
            Text("\(count) تجاوز SLA")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(PosColors.Danger)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(PosColors.DangerBg)
        .cornerRadius(10)
        .opacity(pulseAnimation ? 0.4 : 1.0)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                pulseAnimation = true
            }
        }
    }
}

// MARK: - KDS Column View
struct KdsColumnView: View {
    let column: KdsColumn
    let tickets: [KdsTicketUi]
    let onStatusChange: (String, String) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Column Header
            HStack {
                HStack(spacing: 8) {
                    Circle()
                        .fill(column.color)
                        .frame(width: 10, height: 10)
                    
                    Text(column.labelAr)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(column.color)
                }
                
                Spacer()
                
                Text("\(tickets.count)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(column.color)
                    .frame(width: 28, height: 28)
                    .background(column.color.opacity(0.15))
                    .clipShape(Circle())
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(column.color.opacity(0.1))
            
            // Tickets
            if tickets.isEmpty {
                VStack {
                    Spacer()
                    Text("لا توجد تذاكر")
                        .font(.caption)
                        .foregroundColor(PosColors.Slate400)
                    Spacer()
                }
                .frame(height: 120)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(tickets) { ticket in
                            KdsTicketCard(
                                ticket: ticket,
                                currentStatus: column.status,
                                onStatusChange: onStatusChange
                            )
                        }
                    }
                    .padding(8)
                }
            }
        }
        .background(column.bgColor.opacity(0.3))
        .cornerRadius(16)
        .frame(maxHeight: .infinity)
    }
}

// MARK: - KDS Ticket Card
struct KdsTicketCard: View {
    let ticket: KdsTicketUi
    let currentStatus: String
    let onStatusChange: (String, String) -> Void
    
    var isSlaBreached: Bool { ticket.elapsedMin > 12 }
    var isWarning: Bool { ticket.elapsedMin > 8 }
    
    var borderColor: Color {
        if isSlaBreached { return PosColors.Danger }
        if isWarning { return PosColors.Warning }
        return Color.clear
    }
    
    var nextStatuses: [(status: String, label: String)] {
        switch currentStatus {
        case "NEW":
            return [("COOKING", "بدء التحضير")]
        case "COOKING":
            return [("READY", "جاهز")]
        case "READY":
            return [("SERVED", "تم التقديم")]
        default:
            return []
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text(ticket.orderNo)
                    .font(.system(size: 14, weight: .bold))
                
                Spacer()
                
                HStack(spacing: 6) {
                    if ticket.tableCode != "-" {
                        Text(ticket.tableCode)
                            .font(.caption)
                            .foregroundColor(PosColors.Info)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(PosColors.InfoBg)
                            .cornerRadius(6)
                    }
                    
                    Text("\(ticket.elapsedMin)د")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(
                            isSlaBreached ? PosColors.Danger :
                            isWarning ? PosColors.Warning :
                            PosColors.Slate600
                        )
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            isSlaBreached ? PosColors.DangerBg :
                            isWarning ? PosColors.WarningBg :
                            PosColors.Slate100
                        )
                        .cornerRadius(6)
                }
            }
            
            // Items
            if !ticket.items.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(ticket.items) { item in
                        HStack {
                            Text("• \(item.qty)× \(item.name)")
                                .font(.caption)
                                .foregroundColor(PosColors.Slate600)
                                .lineLimit(1)
                            
                            Spacer()
                            
                            if !item.station.isEmpty {
                                Text(item.station)
                                    .font(.caption)
                                    .foregroundColor(PosColors.Slate400)
                            }
                        }
                    }
                }
            }
            
            // Action Buttons
            if !nextStatuses.isEmpty {
                HStack(spacing: 6) {
                    ForEach(nextStatuses, id: \.status) { statusInfo in
                        let statusColumn = kdsColumns.first { $0.status == statusInfo.status }
                        
                        Button(action: {
                            onStatusChange(ticket.id, statusInfo.status)
                        }) {
                            HStack(spacing: 4) {
                                Text(statusInfo.label)
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 36)
                            .background(statusColumn?.color ?? PosColors.Brand600)
                            .cornerRadius(8)
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(borderColor, lineWidth: (isSlaBreached || isWarning) ? 2 : 0)
        )
        .shadow(color: PosColors.Slate200, radius: 2, x: 0, y: 1)
    }
}

// Define kdsColumns as static property for use in KdsTicketCard
private let kdsColumns = [
    KdsColumn(status: "NEW", labelAr: "جديد", color: PosColors.Info, bgColor: PosColors.InfoBg),
    KdsColumn(status: "COOKING", labelAr: "قيد التحضير", color: PosColors.Warning, bgColor: PosColors.WarningBg),
    KdsColumn(status: "READY", labelAr: "جاهز", color: PosColors.Success, bgColor: PosColors.SuccessBg),
    KdsColumn(status: "SERVED", labelAr: "تم التقديم", color: PosColors.Slate500, bgColor: PosColors.Slate100)
]

#Preview {
    KdsScreen(apiClient: ApiClient(configStore: PosConfigStore()))
}