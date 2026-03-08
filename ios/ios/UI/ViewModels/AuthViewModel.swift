import Foundation
import Combine

class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiClient: ApiClient
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
    }
    
    @MainActor
    func login() async {
        guard !email.isEmpty && !password.isEmpty else {
            errorMessage = "Please enter email and password"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            _ = try await apiClient.login(email: email, password: password)
            // Successful login will update PosConfigStore, which MainViewModel observes
            isLoading = false
        } catch {
            isLoading = false
            print("Login error details: \(error)")
            if let apiError = error as? APIError {
                switch apiError {
                case .requestFailed(_, let message):
                    errorMessage = message ?? "Login failed"
                case .invalidURL:
                    errorMessage = "Invalid server URL"
                case .unknown(let underlyingError):
                    errorMessage = "Connection failed: \(underlyingError.localizedDescription)"
                default:
                    errorMessage = "Login failed: \(error.localizedDescription)"
                }
            } else {
                errorMessage = "Network error: \(error.localizedDescription)"
            }
        }
    }
}
