import SwiftUI

// MARK: ─ KDS Screen (Ramotion Dark Premium Kanban)

struct KdsScreen: View {
    @StateObject private var viewModel: KdsViewModel
    @State private var refreshTimer: Timer?

    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: KdsViewModel(apiClient: apiClient))
    }

    fileprivate struct KdsColDef {
        let status: String
        let label: String
        let color: Color
    }

    private let columns: [KdsColDef] = [
        KdsColDef(status: "NEW",     label: "جديد",          color: Color(hex: "3B82F6")),
        KdsColDef(status: "COOKING", label: "قيد التحضير",   color: Color(hex: "F59E0B")),
        KdsColDef(status: "READY",   label: "جاهز",          color: Color(hex: "10B981")),
        KdsColDef(status: "SERVED",  label: "تم التقديم",    color: Color(hex: "64748B")),
    ]

    private var slaBreaches: Int {
        viewModel.tickets.filter { $0.elapsedMin > 12 }.count
    }

    var body: some View {
        ZStack {
            Color(hex: "F4F6FF").ignoresSafeArea()

            VStack(spacing: 0) {
                // ── Header ──────────────────────────────────────────
                HStack(spacing: 12) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("شاشة المطبخ")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(Color(hex: "0F172A"))
                        Text("\(viewModel.tickets.count) تذكرة نشطة")
                            .font(.caption)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }

                    Spacer()

                    // SLA breach badge
                    if slaBreaches > 0 {
                        SlaPulseBadge(count: slaBreaches)
                    }

                    // Station filter
                    if viewModel.stations.count > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(viewModel.stations, id: \.self) { station in
                                    Button {
                                        viewModel.selectedStation = station
                                    } label: {
                                        let sel = viewModel.selectedStation == station
                                        Text(station)
                                            .font(.system(size: 12, weight: sel ? .bold : .medium))
                                            .foregroundColor(sel ? PosColors.Violet600 : Color(hex: "64748B"))
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(sel ? PosColors.Violet600.opacity(0.12) : Color.black.opacity(0.04))
                                            .cornerRadius(16)
                                            .overlay(
                                                Capsule().stroke(sel ? PosColors.Violet600.opacity(0.4) : Color.clear, lineWidth: 1)
                                            )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)

                // ── Kanban board ────────────────────────────────────
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(columns, id: \.status) { col in
                            let colTickets = viewModel.filteredTickets(status: col.status)
                            KdsDarkColumn(
                                col: col,
                                tickets: colTickets
                            ) { ticketId, newStatus in
                                Task { await viewModel.updateTicketStatus(ticketId: ticketId, status: newStatus) }
                            }
                            .frame(width: 290)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
                .frame(maxHeight: .infinity)
            }
        }
        .onAppear { startAutoRefresh() }
        .onDisappear { stopAutoRefresh() }
        .task { await viewModel.refreshTickets() }
    }

    private func startAutoRefresh() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: true) { _ in
            Task { await viewModel.refreshTickets() }
        }
    }
    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
}

// MARK: ─ SLA Pulse Badge

private struct SlaPulseBadge: View {
    let count: Int
    @State private var pulse = false

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(Color(hex: "EF4444"))
                .frame(width: 8, height: 8)
                .scaleEffect(pulse ? 1.4 : 1)
                .opacity(pulse ? 0.5 : 1)
                .animation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true), value: pulse)

            Text("\(count) تجاوز SLA")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(hex: "EF4444"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(Color(hex: "EF4444").opacity(0.1))
        .cornerRadius(20)
        .overlay(Capsule().stroke(Color(hex: "EF4444").opacity(0.25), lineWidth: 1))
        .onAppear { pulse = true }
    }
}

// MARK: ─ KDS Column

private struct KdsDarkColumn: View {
    let col: KdsScreen.KdsColDef
    let tickets: [KdsTicketUi]
    let onStatusChange: (String, String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Column header
            HStack {
                HStack(spacing: 7) {
                    Circle().fill(col.color).frame(width: 9, height: 9)
                    Text(col.label)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(col.color)
                }
                Spacer()
                Text("\(tickets.count)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(col.color)
                    .frame(width: 26, height: 26)
                    .background(col.color.opacity(0.14))
                    .clipShape(Circle())
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(col.color.opacity(0.07))

            // Tickets
            if tickets.isEmpty {
                VStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "tray")
                            .font(.system(size: 28))
                            .foregroundColor(Color(hex: "E2E8F0"))
                        Text("لا توجد تذاكر")
                            .font(.caption)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                    Spacer()
                }
                .frame(height: 140)
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 10) {
                        ForEach(tickets) { ticket in
                            KdsDarkTicketCard(
                                ticket: ticket,
                                currentStatus: col.status,
                                accentColor: col.color,
                                onStatusChange: onStatusChange
                            )
                        }
                    }
                    .padding(10)
                }
            }
        }
        .background(Color(hex: "FFFFFF"))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(col.color.opacity(0.12), lineWidth: 1)
        )
        .frame(maxHeight: .infinity)
    }
}

// MARK: ─ KDS Ticket Card

private struct KdsDarkTicketCard: View {
    let ticket: KdsTicketUi
    let currentStatus: String
    let accentColor: Color
    let onStatusChange: (String, String) -> Void

    private var isSla: Bool { ticket.elapsedMin > 12 }
    private var isWarn: Bool { ticket.elapsedMin > 8 }

    private var timerColor: Color {
        isSla ? Color(hex: "DC2626") : isWarn ? Color(hex: "D97706") : Color(hex: "94A3B8")
    }

    private var nextAction: (status: String, label: String)? {
        switch currentStatus {
        case "NEW":     return ("COOKING", "ابدأ التحضير")
        case "COOKING": return ("READY",   "اجعله جاهزاً")
        case "READY":   return ("SERVED",  "تم التقديم")
        default:        return nil
        }
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 10) {
            // Top row
            HStack {
                // Table badge
                if ticket.tableCode != "-" {
                    Text(ticket.tableCode)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "3B82F6"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(hex: "3B82F6").opacity(0.12))
                        .cornerRadius(6)
                }

                Spacer()

                Text("#\(ticket.orderNo)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(hex: "0F172A"))

                // Timer
                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 10))
                    Text("\(ticket.elapsedMin)د")
                        .font(.system(size: 11, weight: .bold))
                        .monospacedDigit()
                }
                .foregroundColor(timerColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(timerColor.opacity(0.12))
                .cornerRadius(6)
            }

            // Items list
            if !ticket.items.isEmpty {
                VStack(alignment: .trailing, spacing: 5) {
                    ForEach(ticket.items) { item in
                        HStack(spacing: 6) {
                            Spacer()
                            Text(item.name)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "475569"))
                            Text("×\(item.qty)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(accentColor)
                                .frame(minWidth: 24)
                        }
                    }
                }
                .padding(10)
                .background(Color.black.opacity(0.03))
                .cornerRadius(10)
            }

            // Action button
            if let action = nextAction {
                Button {
                    onStatusChange(ticket.id, action.status)
                } label: {
                    HStack(spacing: 6) {
                        Text(action.label)
                            .font(.system(size: 12, weight: .bold))
                        Image(systemName: "chevron.left")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundColor(accentColor)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(accentColor.opacity(0.12))
                    .cornerRadius(9)
                    .overlay(
                        RoundedRectangle(cornerRadius: 9)
                            .stroke(accentColor.opacity(0.25), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(Color(hex: "F8F9FF"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(
                    isSla ? Color(hex: "EF4444").opacity(0.3) :
                    isWarn ? Color(hex: "F59E0B").opacity(0.2) :
                    Color.black.opacity(0.07),
                    lineWidth: 1
                )
        )
    }
}
