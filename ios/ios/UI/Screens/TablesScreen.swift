import SwiftUI

struct TablesScreen: View {
    @StateObject private var viewModel: TablesViewModel
    @State private var selectedArea = "الكل"
    
    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: TablesViewModel(apiClient: apiClient))
    }
    
    var filteredTables: [TableWithStatus] {
        if selectedArea == "الكل" {
            return viewModel.tables
        } else {
            return viewModel.tables.filter { $0.table.area?.nameAr == selectedArea }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("الطاولات")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Spacer()
                Button(action: {
                    Task {
                        await viewModel.loadTables()
                    }
                }) {
                    Image(systemName: "arrow.clockwise")
                        .font(.title2)
                }
            }
            .padding()
            .background(Color.white)
            
            // Areas Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.areas, id: \.self) { area in
                        Button(action: {
                            selectedArea = area
                        }) {
                            Text(area)
                                .fontWeight(selectedArea == area ? .bold : .regular)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(selectedArea == area ? PosColors.Brand600 : PosColors.Slate100)
                                .foregroundColor(selectedArea == area ? .white : PosColors.Slate700)
                                .cornerRadius(20)
                        }
                    }
                }
                .padding()
            }
            .background(Color.white)
            
            Divider()
            
            // Tables Grid
            if viewModel.isLoading {
                Spacer()
                ProgressView()
                Spacer()
            } else if let errorMessage = viewModel.errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(PosColors.Danger)
                    Text(errorMessage)
                        .multilineTextAlignment(.center)
                        .foregroundColor(PosColors.Slate700)
                    Button("إعادة المحاولة") {
                        Task {
                            await viewModel.loadTables()
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                if filteredTables.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "table.furniture")
                            .font(.system(size: 32))
                            .foregroundColor(PosColors.Slate400)
                        Text("لا توجد طاولات للعرض")
                            .foregroundColor(PosColors.Slate600)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PosColors.Slate50)
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 16)], spacing: 16) {
                            ForEach(filteredTables, id: \.table.id) { item in
                                TableCard(item: item)
                            }
                        }
                        .padding()
                    }
                    .background(PosColors.Slate50)
                }
            }
        }
        .onAppear {
            Task {
                await viewModel.loadTables()
            }
        }
    }
}

struct TableCard: View {
    let item: TableWithStatus
    
    var statusColor: Color {
        switch item.status {
        case .available: return PosColors.Success
        case .occupied: return PosColors.Warning
        case .reserved: return PosColors.Info
        case .needsService: return PosColors.Danger
        }
    }
    
    var statusBg: Color {
        switch item.status {
        case .available: return PosColors.SuccessBg
        case .occupied: return PosColors.WarningBg
        case .reserved: return PosColors.InfoBg
        case .needsService: return PosColors.DangerBg
        }
    }
    
    var statusLabel: String {
        switch item.status {
        case .available: return "متاحة"
        case .occupied: return "مشغولة"
        case .reserved: return "محجوزة"
        case .needsService: return "تحتاج خدمة"
        }
    }
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text(item.table.code)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                Text("\(item.table.seats) 👤")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if let order = item.activeOrder {
                VStack(spacing: 4) {
                    Text("#\(order.orderNo)")
                        .font(.caption)
                        .fontWeight(.bold)
                    Text(String(format: "%.2f SAR", order.grandTotal))
                        .font(.subheadline)
                        .foregroundColor(PosColors.Brand700)
                    
                    HStack {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text("\(item.elapsedMin) دقيقة")
                            .font(.caption2)
                    }
                    .foregroundColor(.secondary)
                }
                .padding(8)
                .background(PosColors.Slate50)
                .cornerRadius(8)
            } else {
                Spacer()
                    .frame(height: 40) // Placeholder height to match occupied card somewhat
            }
            
            Text(statusLabel)
                .font(.caption)
                .fontWeight(.bold)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusBg)
                .foregroundColor(statusColor)
                .cornerRadius(4)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(item.status == .available ? Color.clear : statusColor, lineWidth: 2)
        )
    }
}
