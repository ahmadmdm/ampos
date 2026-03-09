import SwiftUI

// MARK: ─ Tables Screen (Ramotion Dark Premium)

struct TablesScreen: View {
    @StateObject private var viewModel: TablesViewModel
    @State private var selectedArea = "الكل"

    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: TablesViewModel(apiClient: apiClient))
    }

    var filteredTables: [TableWithStatus] {
        selectedArea == "الكل"
            ? viewModel.tables
            : viewModel.tables.filter { $0.table.area?.nameAr == selectedArea }
    }

    var body: some View {
        ZStack {
            Color(hex: "F4F6FF").ignoresSafeArea()

            // Ambient glow
            Circle()
                .fill(Color(hex: "7C3AED").opacity(0.06))
                .frame(width: 400, height: 400)
                .blur(radius: 80)
                .offset(x: 100, y: -100)
                .allowsHitTesting(false)

            VStack(spacing: 0) {
                // ── Header ──────────────────────────────────────────
                VStack(spacing: 14) {
                    HStack(alignment: .center) {
                        VStack(alignment: .trailing, spacing: 6) {
                            Text("إدارة الطاولات")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(Color(hex: "0F172A"))

                            // Live stat badges
                            HStack(spacing: 8) {
                                TableStatBadge(
                                    count: viewModel.tables.filter { $0.status == .available }.count,
                                    label: "متاحة",
                                    color: Color(hex: "10B981")
                                )
                                TableStatBadge(
                                    count: viewModel.tables.filter { $0.status == .occupied }.count,
                                    label: "مشغولة",
                                    color: Color(hex: "F59E0B")
                                )
                                let needsService = viewModel.tables.filter { $0.status == .needsService }.count
                                if needsService > 0 {
                                    TableStatBadge(
                                        count: needsService,
                                        label: "تحتاج خدمة",
                                        color: Color(hex: "EF4444")
                                    )
                                }
                            }
                        }

                        Spacer()

                        // Refresh button
                        Button {
                            Task { await viewModel.loadTables() }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(11)
                                .background(Color.white.opacity(0.07))
                                .clipShape(Circle())
                                .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))
                        }
                    }

                    // Area filter chips
                    if viewModel.areas.count > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(viewModel.areas, id: \.self) { area in
                                    AreaFilterChip(area: area, isSelected: selectedArea == area) {
                                        withAnimation(.spring(response: 0.3)) {
                                            selectedArea = area
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 16)

                // ── Content ──────────────────────────────────────────
                if viewModel.isLoading {
                    Spacer()
                    VStack(spacing: 14) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: PosColors.Violet500))
                            .scaleEffect(1.2)
                        Text("جاري التحميل…")
                            .font(.subheadline)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                    Spacer()
                } else if filteredTables.isEmpty {
                    Spacer()
                    VStack(spacing: 14) {
                        Image(systemName: "table.furniture")
                            .font(.system(size: 52))
                            .foregroundColor(Color(hex: "CBD5E1"))
                        Text("لا توجد طاولات")
                            .font(.title3)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                    Spacer()
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVGrid(
                            columns: [GridItem(.adaptive(minimum: 200, maximum: 300), spacing: 14)],
                            spacing: 14
                        ) {
                            ForEach(filteredTables, id: \.table.id) { item in
                                TableCard(item: item)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
        }
        .onAppear {
            Task { await viewModel.loadTables() }
        }
    }
}

// MARK: ─ Area Filter Chip

private struct AreaFilterChip: View {
    let area: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(area)
                .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? PosColors.Violet600 : Color(hex: "64748B"))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(
                    isSelected
                        ? PosColors.Violet600.opacity(0.12)
                        : Color.black.opacity(0.04)
                )
                .cornerRadius(20)
                .overlay(
                    Capsule()
                        .stroke(
                            isSelected ? PosColors.Violet600.opacity(0.4) : Color.clear,
                            lineWidth: 1
                        )
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: ─ Stat Badge

struct TableStatBadge: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text("\(count)")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(color.opacity(0.7))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: ─ Table Card

struct TableCard: View {
    let item: TableWithStatus

    private var accent: Color {
        switch item.status {
        case .available:    return Color(hex: "10B981")
        case .occupied:     return Color(hex: "F59E0B")
        case .reserved:     return Color(hex: "3B82F6")
        case .needsService: return Color(hex: "EF4444")
        }
    }

    private var statusLabel: String {
        switch item.status {
        case .available:    return "متاحة"
        case .occupied:     return "مشغولة"
        case .reserved:     return "محجوزة"
        case .needsService: return "تحتاج خدمة"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Colored top strip
            accent.frame(height: 3)

            VStack(alignment: .trailing, spacing: 14) {
                // Top row
                HStack(alignment: .top) {
                    // Status badge
                    Text(statusLabel)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(accent)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(accent.opacity(0.12))
                        .cornerRadius(6)

                    Spacer()

                    // Table code box
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(accent.opacity(0.1))
                            .frame(width: 58, height: 52)

                        Text(item.table.code)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(accent)
                    }
                }

                // Area name
                if let areaName = item.table.area?.nameAr {
                    HStack {
                        Spacer()
                        Text(areaName)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                }

                // Seat count
                HStack(spacing: 4) {
                    Spacer()
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 11))
                    Text("\(item.table.seats) مقاعد")
                        .font(.system(size: 12))
                }
                .foregroundColor(Color(hex: "94A3B8"))

                // Active order info
                if let order = item.activeOrder {
                    VStack(spacing: 10) {
                        Rectangle()
                            .fill(Color.black.opacity(0.06))
                            .frame(height: 1)

                        HStack {
                            // Elapsed time
                            HStack(spacing: 4) {
                                Image(systemName: "clock.fill")
                                    .font(.system(size: 11))
                                Text("\(item.elapsedMin) د")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(
                                item.elapsedMin > 30
                                    ? Color(hex: "EF4444")
                                    : Color(hex: "94A3B8")
                            )

                            Spacer()

                            // Amount
                            Text(String(format: "%.0f ر.س", order.grandTotal))
                                .font(.system(size: 17, weight: .bold))
                                .foregroundColor(Color(hex: "FBBF24"))
                        }

                        HStack {
                            Spacer()
                            Text("#\(order.orderNo)")
                                .font(.system(size: 11))
                                .foregroundColor(Color(hex: "94A3B8"))
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color(hex: "FFFFFF"))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.black.opacity(0.07), lineWidth: 1)
        )
        .shadow(
            color: item.status == .available
                ? .clear
                : accent.opacity(0.08),
            radius: 12, x: 0, y: 4
        )
    }
}
