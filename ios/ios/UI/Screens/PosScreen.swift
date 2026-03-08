import SwiftUI

struct PosScreen: View {
    @ObservedObject var viewModel: MainViewModel
    @EnvironmentObject var apiClient: ApiClient
    @State private var selectedTab: Tab = .cashier
    
    // We can hold the view models here to preserve state across tab switches
    // But initializing them with apiClient from environment is tricky in init.
    // So we'll let the child views manage their state for now, or use a dependency injection container.
    // For now, simpler approach:
    
    enum Tab {
        case cashier
        case tables
        case orders
        case kds
        case waiter
        case settings
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            CashierScreen(apiClient: apiClient)
                .tabItem {
                    Label("نقاط البيع", systemImage: "storefront")
                }
                .tag(Tab.cashier)
            
            TablesScreen(apiClient: apiClient)
                .tabItem {
                    Label("الطاولات", systemImage: "table.furniture")
                }
                .tag(Tab.tables)
            
            OrdersScreen(apiClient: apiClient)
                .tabItem {
                    Label("الطلبات", systemImage: "list.bullet.rectangle")
                }
                .tag(Tab.orders)
            
            KdsScreen(apiClient: apiClient)
                .tabItem {
                    Label("المطبخ", systemImage: "flame")
                }
                .tag(Tab.kds)
            
            WaiterScreen(apiClient: apiClient)
                .tabItem {
                    Label("النادل", systemImage: "person.3")
                }
                .tag(Tab.waiter)
            
            SettingsScreen(viewModel: viewModel)
                .tabItem {
                    Label("الإعدادات", systemImage: "gearshape")
                }
                .tag(Tab.settings)
        }
        .accentColor(PosColors.Brand600)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

#Preview {
    PosScreen(viewModel: MainViewModel(configStore: PosConfigStore()))
        .environmentObject(ApiClient(configStore: PosConfigStore()))
}
