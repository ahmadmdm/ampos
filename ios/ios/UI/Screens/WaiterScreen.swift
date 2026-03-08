import SwiftUI

struct WaiterScreen: View {
    @StateObject private var viewModel: WaiterViewModel
    @State private var refreshTimer: Timer?
    
    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: WaiterViewModel(apiClient: apiClient))
    }
    
    var pendingCallsCount: Int {
        viewModel.waiterCalls.filter { $0.status == "CREATED" }.count
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text("النادل")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("\(pendingCallsCount) طلب مفتوح • \(viewModel.readyOrders.count) طلب جاهز")
                        .font(.caption)
                        .foregroundColor(PosColors.Slate500)
                }
                
                Spacer()
                
                Button(action: {
                    Task {
                        await viewModel.refresh()
                    }
                }) {
                    if viewModel.isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(PosColors.Brand600)
                    }
                }
            }
            .padding(16)
            
            // Main Content
            HStack(spacing: 16) {
                // Left: Waiter Calls
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: "bell")
                            .foregroundColor(PosColors.Warning)
                            .font(.system(size: 22))
                        
                        Text("طلبات النادل")
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        if pendingCallsCount > 0 {
                            Text("\(pendingCallsCount)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(PosColors.Danger)
                                .frame(width: 24, height: 24)
                                .background(PosColors.DangerBg)
                                .clipShape(Circle())
                        }
                    }
                    
                    if viewModel.waiterCalls.isEmpty {
                        VStack {
                            Spacer()
                            
                            Image(systemName: "bell.slash")
                                .font(.system(size: 48))
                                .foregroundColor(PosColors.Slate300)
                            Text("لا توجد طلبات")
                                .foregroundColor(PosColors.Slate400)
                            
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 8) {
                                ForEach(viewModel.waiterCalls) { call in
                                    WaiterCallCard(
                                        call: call,
                                        onAck: {
                                            Task {
                                                await viewModel.ackCall(callId: call.id)
                                            }
                                        },
                                        onResolve: {
                                            Task {
                                                await viewModel.resolveCall(callId: call.id)
                                            }
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal, 8)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                
                // Divider
                Rectangle()
                    .fill(PosColors.Slate200)
                    .frame(width: 1)
                
                // Right: Ready Orders
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: "fork.knife")
                            .foregroundColor(PosColors.Success)
                            .font(.system(size: 22))
                        
                        Text("طلبات جاهزة للتقديم")
                            .font(.headline)
                            .fontWeight(.bold)
                    }
                    
                    if viewModel.readyOrders.isEmpty {
                        VStack {
                            Spacer()
                            
                            Image(systemName: "fork.knife")
                                .font(.system(size: 48))
                                .foregroundColor(PosColors.Slate300)
                            Text("لا توجد طلبات جاهزة")
                                .foregroundColor(PosColors.Slate400)
                            
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 8) {
                                ForEach(viewModel.readyOrders) { order in
                                    ReadyOrderCard(order: order)
                                }
                            }
                            .padding(.horizontal, 8)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .frame(maxHeight: .infinity)
            .padding(.horizontal, 16)
        }
        .navigationBarHidden(true)
        .onAppear {
            startAutoRefresh()
        }
        .onDisappear {
            stopAutoRefresh()
        }
        .task {
            await viewModel.refresh()
        }
    }
    
    private func startAutoRefresh() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            Task {
                await viewModel.refresh()
            }
        }
    }
    
    private func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
}

// MARK: - Waiter Call Card
struct WaiterCallCard: View {
    let call: WaiterCallUi
    let onAck: () -> Void
    let onResolve: () -> Void
    
    var isUrgent: Bool { call.elapsedMin > 5 }
    var isPending: Bool { call.status == "CREATED" }
    
    var statusText: String {
        switch call.status {
        case "CREATED": return "بانتظار"
        case "ACKNOWLEDGED": return "مستلم"
        case "RESOLVED": return "تم"
        default: return call.status
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                // Table Badge
                Text(call.tableCode)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(isPending ? PosColors.Warning : PosColors.Success)
                    .frame(width: 40, height: 40)
                    .background(isPending ? PosColors.WarningBg : PosColors.SuccessBg)
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("طاولة \(call.tableCode)")
                        .font(.system(size: 14, weight: .semibold))
                    Text(call.reason)
                        .font(.caption)
                        .foregroundColor(PosColors.Slate500)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(call.elapsedMin) د")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(
                            !isPending ? PosColors.Success :
                            isUrgent ? PosColors.Danger :
                            PosColors.Warning
                        )
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(
                            !isPending ? PosColors.SuccessBg :
                            isUrgent ? PosColors.DangerBg :
                            PosColors.WarningBg
                        )
                        .cornerRadius(6)
                    
                    Text(statusText)
                        .font(.caption)
                        .foregroundColor(PosColors.Slate400)
                }
            }
            
            // Action Buttons
            if isPending || call.status == "ACKNOWLEDGED" {
                Divider()
                
                HStack(spacing: 8) {
                    if isPending {
                        Button(action: onAck) {
                            Text("استلام")
                                .font(.caption)
                                .foregroundColor(PosColors.Brand600)
                                .frame(maxWidth: .infinity, minHeight: 36)
                        }
                        .buttonStyle(.bordered)
                        .cornerRadius(8)
                    }
                    
                    Button(action: onResolve) {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark")
                                .font(.caption)
                            Text("تم")
                                .font(.caption)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .background(PosColors.Success)
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding(14)
        .background(
            isPending ? Color.white : PosColors.Slate100.opacity(0.5)
        )
        .cornerRadius(14)
        .shadow(color: isPending ? PosColors.Slate200 : Color.clear, radius: isPending ? 2 : 0, x: 0, y: 1)
    }
}

// MARK: - Ready Order Card
struct ReadyOrderCard: View {
    let order: ReadyOrderUi
    
    var body: some View {
        HStack {
            // Restaurant Icon
            Image(systemName: "fork.knife")
                .font(.system(size: 22))
                .foregroundColor(PosColors.Success)
                .frame(width: 40, height: 40)
                .background(PosColors.Success.opacity(0.2))
                .cornerRadius(10)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(order.orderNo)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(PosColors.Success)
                Text("طاولة \(order.tableCode)")
                    .font(.caption)
                    .foregroundColor(PosColors.Slate500)
            }
            
            Spacer()
            
            Text("جاهز")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(PosColors.Success)
                .cornerRadius(8)
        }
        .padding(14)
        .background(PosColors.SuccessBg)
        .cornerRadius(14)
        .shadow(color: PosColors.Slate200, radius: 1, x: 0, y: 1)
    }
}

#Preview {
    WaiterScreen(apiClient: ApiClient(configStore: PosConfigStore()))
}