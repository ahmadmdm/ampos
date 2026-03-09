import SwiftUI

// MARK: ─ Orders Screen (Ramotion Dark Premium)

struct OrdersScreen: View {
    @StateObject private var viewModel: OrdersViewModel

    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: OrdersViewModel(apiClient: apiClient))
    }

    private struct StatusOption: Identifiable {
        let id = UUID()
        let key: String?
        let label: String
        let color: Color
    }

    private let statusOptions: [StatusOption] = [
        StatusOption(key: nil,           label: "الكل",         color: Color(hex: "8B5CF6")),
        StatusOption(key: "CONFIRMED",   label: "مؤكد",         color: Color(hex: "3B82F6")),
        StatusOption(key: "IN_KITCHEN",  label: "في المطبخ",    color: Color(hex: "F59E0B")),
        StatusOption(key: "READY",       label: "جاهز",         color: Color(hex: "14B8A6")),
        StatusOption(key: "SERVED",      label: "تم التقديم",   color: Color(hex: "10B981")),
        StatusOption(key: "COMPLETED",   label: "مكتمل",        color: Color(hex: "10B981")),
        StatusOption(key: "VOIDED",      label: "ملغي",         color: Color(hex: "EF4444")),
    ]

    var body: some View {
        ZStack {
            Color(hex: "F4F6FF").ignoresSafeArea()

            VStack(spacing: 0) {
                // ── Header ─────────────────────────────────────────
                HStack {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("الطلبات")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(Color(hex: "0F172A"))
                        Text("\(viewModel.totalPages > 0 ? viewModel.totalPages : 0) صفحة")
                            .font(.caption)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                    Spacer()

                    // Pagination
                    HStack(spacing: 6) {
                        Button { viewModel.nextPage() } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(
                                    viewModel.currentPage < viewModel.totalPages
                                        ? Color(hex: "334155") : Color(hex: "CBD5E1")
                                )
                                .padding(9)
                                .background(Color.black.opacity(0.05))
                                .clipShape(Circle())
                        }
                        .disabled(viewModel.currentPage >= viewModel.totalPages)

                        Text("\(viewModel.currentPage) / \(viewModel.totalPages)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(hex: "64748B"))
                            .monospacedDigit()

                        Button { viewModel.prevPage() } label: {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(
                                    viewModel.currentPage > 1
                                        ? Color(hex: "334155") : Color(hex: "CBD5E1")
                                )
                                .padding(9)
                                .background(Color.black.opacity(0.05))
                                .clipShape(Circle())
                        }
                        .disabled(viewModel.currentPage <= 1)

                        Button { Task { await viewModel.loadOrders() } } label: {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Color(hex: "475569"))
                                .padding(9)
                                .background(Color.black.opacity(0.05))
                                .clipShape(Circle())
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                // ── Status filters ──────────────────────────────────
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(statusOptions) { opt in
                            let isSelected = viewModel.statusFilter == opt.key
                            Button {
                                viewModel.updateStatusFilter(opt.key)
                            } label: {
                                HStack(spacing: 5) {
                                    if opt.key != nil {
                                        Circle()
                                            .fill(opt.color)
                                            .frame(width: 7, height: 7)
                                    }
                                    Text(opt.label)
                                        .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                        .foregroundColor(isSelected ? opt.color : Color.white.opacity(0.4))
                                }
                                .padding(.horizontal, 13)
                                .padding(.vertical, 7)
                                .background(
                                    isSelected
                                        ? opt.color.opacity(0.12)
                                        : Color.black.opacity(0.04)
                                )
                                .cornerRadius(20)
                                .overlay(
                                    Capsule()
                                        .stroke(
                                            isSelected ? opt.color.opacity(0.35) : Color.clear,
                                            lineWidth: 1
                                        )
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.vertical, 14)

                // ── Orders list ─────────────────────────────────────
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: PosColors.Violet500))
                    Spacer()
                } else if viewModel.orders.isEmpty {
                    Spacer()
                    VStack(spacing: 14) {
                        Image(systemName: "tray")
                            .font(.system(size: 48))
                            .foregroundColor(Color(hex: "CBD5E1"))
                        Text("لا توجد طلبات")
                            .font(.title3)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }
                    Spacer()
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(viewModel.orders) { order in
                                OrderRowCard(order: order) {
                                    Task {
                                        await viewModel.voidOrder(orderId: order.id, reason: "Cancelled by user")
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
        }
        .onAppear {
            Task { await viewModel.loadOrders() }
        }
    }
}

// MARK: ─ Order Row Card

private struct OrderRowCard: View {
    let order: OrderDto
    let onVoid: () -> Void

    private var accent: Color {
        switch order.status {
        case "CONFIRMED":           return Color(hex: "3B82F6")
        case "IN_KITCHEN":          return Color(hex: "F59E0B")
        case "READY":               return Color(hex: "14B8A6")
        case "SERVED", "COMPLETED": return Color(hex: "10B981")
        case "VOIDED":              return Color(hex: "EF4444")
        default:                    return Color(hex: "64748B")
        }
    }

    private var statusLabel: String {
        switch order.status {
        case "CONFIRMED":   return "مؤكد"
        case "IN_KITCHEN":  return "في المطبخ"
        case "READY":       return "جاهز"
        case "SERVED":      return "تم التقديم"
        case "COMPLETED":   return "مكتمل"
        case "VOIDED":      return "ملغي"
        default:            return order.status
        }
    }

    private var typeAr: String {
        switch order.type {
        case "DINE_IN":          return "صالة"
        case "TAKEAWAY":         return "سفري"
        case "DELIVERY_PICKUP":  return "توصيل"
        default:                 return order.type
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            // Left accent strip
            accent.frame(width: 3)

            HStack(spacing: 14) {
                // Icon circle
                ZStack {
                    Circle()
                        .fill(accent.opacity(0.1))
                        .frame(width: 46, height: 46)
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 18))
                        .foregroundColor(accent)
                }

                // Middle info
                VStack(alignment: .trailing, spacing: 6) {
                    HStack {
                        // Status badge
                        Text(statusLabel)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(accent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(accent.opacity(0.12))
                            .cornerRadius(5)

                        Spacer()

                        Text("#\(order.orderNo)")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(hex: "0F172A"))
                    }

                    HStack(spacing: 8) {
                        // Type tag
                        Text(typeAr)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(hex: "64748B"))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.05))
                            .cornerRadius(5)

                        if let tbl = order.table?.code {
                            Text("طاولة \(tbl)")
                                .font(.system(size: 11))
                                .foregroundColor(Color(hex: "64748B"))
                        }

                        Spacer()

                        Text(String(order.createdAt.prefix(10)))
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "94A3B8"))
                    }

                    HStack {
                        Text("\(order.items.count) عناصر")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "94A3B8"))
                        Spacer()
                    }
                }

                Spacer(minLength: 0)

                // Right: amount + void
                VStack(alignment: .trailing, spacing: 8) {
                    Text(String(format: "%.2f", order.grandTotal))
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(Color(hex: "D97706"))
                    Text("ر.س")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "D97706").opacity(0.7))

                    if order.status != "VOIDED" {
                        Button(action: onVoid) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(Color(hex: "EF4444").opacity(0.7))
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
        }
        .background(Color(hex: "FFFFFF"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.black.opacity(0.07), lineWidth: 1)
        )
    }
}
