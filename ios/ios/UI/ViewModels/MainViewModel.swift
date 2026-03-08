import Foundation
import Combine

class MainViewModel: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentScreen: AppScreen = .login
    
    private var cancellables = Set<AnyCancellable>()
    private let configStore: PosConfigStore
    private let apiClient: ApiClient
    
    enum AppScreen {
        case login
        case pos
        case settings
    }
    
    init(configStore: PosConfigStore) {
        self.configStore = configStore
        self.apiClient = ApiClient(configStore: configStore)
        
        // Check initial auth state
        self.isAuthenticated = configStore.accessToken != nil
        
        // Update state when config changes
        configStore.$accessToken
            .receive(on: RunLoop.main)
            .sink { [weak self] token in
                self?.isAuthenticated = token != nil
                if token != nil {
                    self?.currentScreen = .pos
                } else {
                    self?.currentScreen = .login
                }
            }
            .store(in: &cancellables)
    }
    
    @MainActor
    func logout() async {
        // Try to logout properly via API
        do {
            try await apiClient.logout()
        } catch {
            // Even if API logout fails, clear local tokens
            print("Logout API call failed: \(error)")
        }
        
        // Clear local tokens
        configStore.accessToken = nil
        configStore.refreshToken = nil
    }
}
