import SwiftUI

struct ContentView: View {
    @StateObject private var configStore = PosConfigStore()
    @StateObject private var apiClient: ApiClient
    @StateObject private var mainViewModel: MainViewModel
    @StateObject private var authViewModel: AuthViewModel
    
    init() {
        let store = PosConfigStore()
        let client = ApiClient(configStore: store)
        _configStore = StateObject(wrappedValue: store)
        _apiClient = StateObject(wrappedValue: client)
        _mainViewModel = StateObject(wrappedValue: MainViewModel(configStore: store))
        _authViewModel = StateObject(wrappedValue: AuthViewModel(apiClient: client))
    }
    
    var body: some View {
        Group {
            if mainViewModel.isAuthenticated {
                PosScreen(viewModel: mainViewModel)
            } else {
                LoginScreen(viewModel: authViewModel)
            }
        }
        .environmentObject(configStore)
        .environmentObject(apiClient)
        .preferredColorScheme(.light)
    }
}

#Preview {
    ContentView()
}
