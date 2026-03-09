import SwiftUI

// MARK: ─ Waiter Screen (Ramotion Dark Premium)

struct WaiterScreen: View {
    @StateObject private var viewModel: WaiterViewModel
    @State private var refreshTimer: Timer?

    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: WaiterViewModel(apiClient: apiClient))
    }

    private var pendingCount: Int {
        viewModel.waiterCalls.filter { $0.status == "CREATED" }.count
    }

    var body: some View {
        ZStack {
            Color(hex: "F4F6FF").ignoresSafeArea()

            VStack(spacing: 0) {
                // ── Header ──────────────────────────────────────────
                HStack {
                    // Refresh
                    Button {
                        Task { await viewModel.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.white.opacity(0.07))
                            .clipShape(Circle())
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 4) {
                        Text("النادل")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(Color(hex: "0F172A"))

                        HStack(spacing: 10) {
                            if pendingCount > 0 {
                                TableStatBadge(count: pendingCount,   label: "طلب مفتوح",  color: Color(hex: "EF4444"))
                            }
                            TableStatBadge(count: viewModel.readyOrders.count, label: "جاهز",        color: Color(hex: "10B981"))
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 16)

                // ── Two-column layout ────────────────────────────────
                HStack(alignment: .top, spacing: 14) {
                    // Left: Waiter Calls
                    WaiterPanel(
                        title: "طلبات النادل",
                        icon: "bell.fill",
                        iconColor: Color(hex: "F59E0B"),
                        badge: pendingCount > 0 ? "\(pendingCount)" : nil
                    ) {
                        if viewModel.waiterCalls.isEmpty {
                            EmptyPanelPlaceholder(icon: "bell.slash", text: "لا توجد طلبات")
                        } else {
                            ScrollView(showsIndicators: false) {
                                LazyVStack(spacing: 10) {
                                    ForEach(viewModel.waiterCalls) { call in
                                        WaiterCallCard(call: call) {
                                            Task { await viewModel.ackCall(callId: call.id) }
                                        } onResolve: {
                                            Task { await viewModel.resolveCall(callId: call.id) }
                                        }
                                    }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 12)
                            }
                        }
                    }

                    // Right: Ready Orders
                    WaiterPanel(
                        title: "جاهز للتقديم",
                        icon: "fork.knife",
                        iconColor: Color(hex: "10B981"),
                        badge: viewModel.readyOrders.isEmpty ? nil : "\(viewModel.readyOrders.count)"
                    ) {
                        if viewModel.readyOrders.isEmpty {
                            EmptyPanelPlaceholder(icon: "tray", text: "لا توجد طلبات جاهزة")
                        } else {
                            ScrollView(showsIndicators: false) {
                                LazyVStack(spacing: 10) {
                                    ForEach(viewModel.readyOrders) { order in
                                        ReadyOrderCard(order: order)
                                    }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 12)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .frame(maxHeight: .infinity)
            }
        }
        .onAppear { startAutoRefresh() }
        .onDisappear { stopAutoRefresh() }
        .task { await viewModel.refresh() }
    }

    private func startAutoRefresh() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            Task { await viewModel.refresh() }
        }
    }
    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
}

// MARK: ─ Waiter Panel Container

private struct WaiterPanel<Content: View>: View {
    let title: String
    let icon: String
    let iconColor: Color
    let badge: String?
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 0) {
            // Panel header
            HStack(spacing: 8) {
                Spacer()
                Text(title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Color(hex: "1E293B"))
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundColor(iconColor)
                if let badge = badge {
                    Text(badge)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(iconColor)
                        .frame(width: 22, height: 22)
                        .background(iconColor.opacity(0.15))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(iconColor.opacity(0.06))

            content
                .frame(maxHeight: .infinity)
        }
        .background(Color(hex: "FFFFFF"))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.black.opacity(0.07), lineWidth: 1)
        )
        .frame(maxWidth: .infinity)
    }
}

// MARK: ─ Waiter Call Card

private struct WaiterCallCard: View {
    let call: WaiterCallUi
    let onAck: () -> Void
    let onResolve: () -> Void

    private var isPending: Bool { call.status == "CREATED" }
    private var isUrgent: Bool { call.elapsedMin > 5 }

    private var statusColor: Color {
        switch call.status {
        case "CREATED":      return isUrgent ? Color(hex: "EF4444") : Color(hex: "F59E0B")
        case "ACKNOWLEDGED": return Color(hex: "3B82F6")
        default:             return Color(hex: "10B981")
        }
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                // Table badge
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(statusColor.opacity(0.12))
                        .frame(width: 48, height: 48)
                    Text(call.tableCode)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(statusColor)
                }

                VStack(alignment: .trailing, spacing: 4) {
                    Text("طاولة \(call.tableCode)")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: "0F172A"))
                    Text(call.reason)
                        .font(.caption)
                        .foregroundColor(Color(hex: "94A3B8"))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill").font(.system(size: 10))
                        Text("\(call.elapsedMin)د")
                            .font(.system(size: 12, weight: .bold))
                            .monospacedDigit()
                    }
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.12))
                    .cornerRadius(6)
                }
            }

            if isPending || call.status == "ACKNOWLEDGED" {
                HStack(spacing: 8) {
                    if isPending {
                        Button(action: onAck) {
                            Text("استلام")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(PosColors.Violet400)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(PosColors.Violet600.opacity(0.12))
                                .cornerRadius(9)
                                .overlay(RoundedRectangle(cornerRadius: 9).stroke(PosColors.Violet600.opacity(0.25), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                    Button(action: onResolve) {
                        HStack(spacing: 5) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .bold))
                            Text("تم")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .foregroundColor(Color(hex: "10B981"))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(hex: "10B981").opacity(0.12))
                        .cornerRadius(9)
                        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color(hex: "10B981").opacity(0.25), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(12)
        .background(Color(hex: "F8F9FF"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(statusColor.opacity(isUrgent && isPending ? 0.3 : 0.07), lineWidth: 1)
        )
    }
}

// MARK: ─ Ready Order Card

private struct ReadyOrderCard: View {
    let order: ReadyOrderUi

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "10B981").opacity(0.12))
                    .frame(width: 46, height: 46)
                Image(systemName: "fork.knife")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "10B981"))
            }

            VStack(alignment: .trailing, spacing: 3) {
                Text(order.orderNo)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(hex: "0F172A"))
                Text("طاولة \(order.tableCode)")
                    .font(.caption)
                    .foregroundColor(Color(hex: "94A3B8"))
            }

            Spacer()

            Text("جاهز")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(hex: "10B981"))
                .cornerRadius(8)
        }
        .padding(12)
        .background(Color(hex: "F8F9FF"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color(hex: "10B981").opacity(0.12), lineWidth: 1)
        )
    }
}

// MARK: ─ Empty Placeholder

private struct EmptyPanelPlaceholder: View {
    let icon: String
    let text: String

    var body: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundColor(Color(hex: "E2E8F0"))
            Text(text)
                .font(.subheadline)
                .foregroundColor(Color(hex: "94A3B8"))
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: ─ Shared Stat Badge (reused across screens)
// (Defined in TablesScreen.swift)

#Preview {
    WaiterScreen(apiClient: ApiClient(configStore: PosConfigStore()))
}
