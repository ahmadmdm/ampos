import SwiftUI

struct OrdersScreen: View {
    @StateObject private var viewModel: OrdersViewModel
    
    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: OrdersViewModel(apiClient: apiClient))
    }
    
    let statuses: [(key: String?, label: String)] = [
        (nil, "الكل"),
        ("CONFIRMED", "مؤكد"),
        ("IN_KITCHEN", "في المطبخ"),
        ("READY", "جاهز"),
        ("SERVED", "تم التقديم"),
        ("COMPLETED", "مكتمل"),
        ("VOIDED", "ملغي")
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("الطلبات")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Spacer()
                Button(action: {
                    Task {
                        await viewModel.loadOrders()
                    }
                }) {
                    Image(systemName: "arrow.clockwise")
                        .font(.title2)
                }
            }
            .padding()
            .background(Color.white)
            
            // Status Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(statuses, id: \.label) { status in
                        Button(action: {
                            viewModel.updateStatusFilter(status.key)
                        }) {
                            Text(status.label)
                                .fontWeight(viewModel.statusFilter == status.key ? .bold : .regular)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(viewModel.statusFilter == status.key ? PosColors.Brand600 : PosColors.Slate100)
                                .foregroundColor(viewModel.statusFilter == status.key ? .white : PosColors.Slate700)
                                .cornerRadius(20)
                        }
                    }
                }
                .padding()
            }
            .background(Color.white)
            
            Divider()
            
            // Orders List
            if viewModel.isLoading {
                Spacer()
                ProgressView()
                Spacer()
            } else if viewModel.orders.isEmpty {
                Spacer()
                Text("لا توجد طلبات")
                    .foregroundColor(.secondary)
                Spacer()
            } else {
                List {
                    ForEach(viewModel.orders) { order in
                        OrderRow(order: order)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                if order.status != "VOIDED" {
                                    Button(role: .destructive) {
                                        Task {
                                            await viewModel.voidOrder(orderId: order.id, reason: "Cancelled by user")
                                        }
                                    } label: {
                                        Label("إلغاء", systemImage: "xmark.circle")
                                    }
                                }
                            }
                    }
                }
                .listStyle(PlainListStyle())
            }
            
            Divider()
            
            // Pagination
            HStack {
                Button(action: {
                    viewModel.prevPage()
                }) {
                    Image(systemName: "chevron.right")
                        .padding()
                }
                .disabled(viewModel.currentPage <= 1)
                
                Text("صفحة \(viewModel.currentPage) من \(viewModel.totalPages)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Button(action: {
                    viewModel.nextPage()
                }) {
                    Image(systemName: "chevron.left")
                        .padding()
                }
                .disabled(viewModel.currentPage >= viewModel.totalPages)
            }
            .padding()
            .background(Color.white)
        }
        .onAppear {
            Task {
                await viewModel.loadOrders()
            }
        }
    }
}

struct OrderRow: View {
    let order: OrderDto
    
    var statusColor: Color {
        switch order.status {
        case "CONFIRMED": return PosColors.Info
        case "IN_KITCHEN": return PosColors.Warning
        case "READY": return PosColors.Teal500
        case "SERVED", "COMPLETED": return PosColors.Success
        case "VOIDED": return PosColors.Danger
        default: return .secondary
        }
    }
    
    var statusLabel: String {
        switch order.status {
        case "CONFIRMED": return "مؤكد"
        case "IN_KITCHEN": return "في المطبخ"
        case "READY": return "جاهز"
        case "SERVED": return "تم التقديم"
        case "COMPLETED": return "مكتمل"
        case "VOIDED": return "ملغي"
        default: return order.status
        }
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Circle()
                .fill(statusColor.opacity(0.1))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: "doc.text")
                        .foregroundColor(statusColor)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("#\(order.orderNo)")
                        .font(.headline)
                    Spacer()
                    Text(order.createdAt.prefix(10)) // Just date for now
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text(order.type) // Should translate
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(PosColors.Slate100)
                        .cornerRadius(4)
                    
                    if let tableName = order.table?.code {
                        Text("طاولة \(tableName)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Text("\(order.items.count) عناصر")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "%.2f SAR", order.grandTotal))
                    .fontWeight(.bold)
                    .foregroundColor(PosColors.Brand700)
                
                Text(statusLabel)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(statusColor)
            }
        }
        .padding(.vertical, 8)
    }
}
