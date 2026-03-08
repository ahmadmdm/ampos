import SwiftUI

struct LoginScreen: View {
    @ObservedObject var viewModel: AuthViewModel
    
    var body: some View {
        HStack(spacing: 0) {
            // Left: Brand Panel
            ZStack {
                LinearGradient(
                    gradient: Gradient(colors: [PosColors.Brand700, PosColors.Brand900]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 24) {
                    Circle()
                        .fill(PosColors.Brand500.opacity(0.2))
                        .frame(width: 100, height: 100)
                        .overlay(
                            Image(systemName: "storefront")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 50, height: 50)
                                .foregroundColor(PosColors.Brand100)
                        )
                    
                    Text("POS1")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(PosColors.Brand50)
                    
                    Text("نظام نقاط البيع المتكامل")
                        .font(.title3)
                        .foregroundColor(PosColors.Brand200)
                }
            }
            .frame(maxWidth: .infinity)
            
            // Right: Login Form
            VStack {
                Spacer()
                
                VStack(spacing: 32) {
                    VStack(spacing: 8) {
                        Text("مرحباً بك مجدداً")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(PosColors.Slate900)
                        
                        Text("الرجاء تسجيل الدخول للمتابعة")
                            .font(.body)
                            .foregroundColor(PosColors.Slate500)
                    }
                    
                    VStack(spacing: 20) {
                        TextField("البريد الإلكتروني", text: $viewModel.email)
                            .padding()
                            .background(PosColors.Slate50)
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(PosColors.Slate200, lineWidth: 1)
                            )
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                        
                        SecureField("كلمة المرور", text: $viewModel.password)
                            .padding()
                            .background(PosColors.Slate50)
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(PosColors.Slate200, lineWidth: 1)
                            )
                            .textContentType(.password)
                        
                        if let errorMessage = viewModel.errorMessage {
                            Text(errorMessage)
                                .foregroundColor(PosColors.Danger)
                                .font(.caption)
                        }
                        
                        Button(action: {
                            Task {
                                await viewModel.login()
                            }
                        }) {
                            if viewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("تسجيل الدخول")
                                    .fontWeight(.bold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(PosColors.Brand600)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .disabled(viewModel.isLoading)
                    }
                    .frame(maxWidth: 400)
                }
                .padding(48)
                
                Spacer()
                
                Text("الإصدار 1.0.0")
                    .font(.caption)
                    .foregroundColor(PosColors.Slate400)
                    .padding()
            }
            .frame(maxWidth: .infinity)
            .background(Color.white)
        }
        .environment(\.layoutDirection, .rightToLeft) // Force RTL for Arabic
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }
}
