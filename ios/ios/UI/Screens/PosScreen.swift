import SwiftUI

// MARK: ─ POS Screen (Ramotion Dark Premium Tab Bar)

struct PosScreen: View {
    @ObservedObject var viewModel: MainViewModel
    @EnvironmentObject var apiClient: ApiClient
    @State private var selectedTab: Tab = .cashier

    enum Tab: Int, CaseIterable {
        case cashier, tables, orders, kds, waiter, settings
    }

    fileprivate struct TabItem {
        let tab: Tab
        let icon: String
        let label: String
    }

    private let tabItems: [TabItem] = [
        TabItem(tab: .cashier,  icon: "storefront.fill",        label: "نقاط البيع"),
        TabItem(tab: .tables,   icon: "table.furniture",        label: "الطاولات"),
        TabItem(tab: .orders,   icon: "list.bullet.rectangle",  label: "الطلبات"),
        TabItem(tab: .kds,      icon: "flame.fill",             label: "المطبخ"),
        TabItem(tab: .waiter,   icon: "person.3.fill",          label: "النادل"),
        TabItem(tab: .settings, icon: "gearshape.fill",         label: "الإعدادات"),
    ]

    var body: some View {
        ZStack(alignment: .bottom) {
            // ── Content area ──────────────────────────────────────
            Group {
                switch selectedTab {
                case .cashier:  CashierScreen(apiClient: apiClient)
                case .tables:   TablesScreen(apiClient: apiClient)
                case .orders:   OrdersScreen(apiClient: apiClient)
                case .kds:      KdsScreen(apiClient: apiClient)
                case .waiter:   WaiterScreen(apiClient: apiClient)
                case .settings: SettingsScreen(viewModel: viewModel)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.bottom, 68)

            // ── Light glass tab bar ──────────────────────────────
            HStack(spacing: 0) {
                ForEach(tabItems, id: \.tab.rawValue) { item in
                    LightTabItem(
                        item: item,
                        isSelected: selectedTab == item.tab
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedTab = item.tab
                        }
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                ZStack {
                    Color.white
                    Rectangle()
                        .fill(Color.black.opacity(0.02))
                }
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(Color.black.opacity(0.07), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.10), radius: 20, x: 0, y: -4)
            )
            .padding(.horizontal, 20)
            .padding(.bottom, 10)
        }
        .ignoresSafeArea(edges: .bottom)
        .environment(\.layoutDirection, .rightToLeft)
        .background(Color(hex: "F4F6FF").ignoresSafeArea())
    }
}

// MARK: ─ Light Tab Item

private struct LightTabItem: View {
    let item: PosScreen.TabItem
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack {
                    if isSelected {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(PosColors.Violet600.opacity(0.12))
                            .frame(width: 44, height: 30)
                    }

                    Image(systemName: item.icon)
                        .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
                        .foregroundColor(
                            isSelected ? PosColors.Violet600 : Color(hex: "94A3B8")
                        )
                }

                Text(item.label)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(
                        isSelected ? PosColors.Violet600 : Color(hex: "94A3B8")
                    )
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    PosScreen(viewModel: MainViewModel(configStore: PosConfigStore()))
        .environmentObject(ApiClient(configStore: PosConfigStore()))
}
