import SwiftUI

// MARK: ─ Login Screen (Ramotion Dark Premium)

struct LoginScreen: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var appear = false

    var body: some View {
        HStack(spacing: 0) {
            BrandPanel(appear: appear)
                .frame(maxWidth: .infinity)

            LoginFormPanel(viewModel: viewModel, appear: appear)
                .frame(maxWidth: .infinity)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onAppear {
            withAnimation(.spring(response: 0.9, dampingFraction: 0.75).delay(0.1)) {
                appear = true
            }
        }
    }
}

// MARK: ─ Brand Panel

private struct BrandPanel: View {
    let appear: Bool

    var body: some View {
        ZStack {
            // Rich violet gradient (Ramotion signature hero)
            LinearGradient(
                colors: [
                    Color(hex: "5B21B6"),
                    Color(hex: "7C3AED"),
                    Color(hex: "4C1D95")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Ambient light orb — top right
            Circle()
                .fill(Color(hex: "A78BFA").opacity(0.25))
                .frame(width: 420, height: 420)
                .blur(radius: 90)
                .offset(x: 80, y: -120)

            // Ambient indigo orb — bottom left
            Circle()
                .fill(Color(hex: "06B6D4").opacity(0.14))
                .frame(width: 320, height: 320)
                .blur(radius: 70)
                .offset(x: -80, y: 200)

            VStack(spacing: 36) {
                // ── Logo orb ──
                ZStack {
                    // Outer glow
                    Circle()
                        .fill(Color.white.opacity(0.15))
                        .frame(width: 160, height: 160)
                        .blur(radius: 28)

                    // Icon card
                    RoundedRectangle(cornerRadius: 32)
                        .fill(Color.white.opacity(0.22))
                        .frame(width: 96, height: 96)
                        .overlay(
                            RoundedRectangle(cornerRadius: 32)
                                .stroke(Color.white.opacity(0.4), lineWidth: 1)
                        )
                        .shadow(color: Color.black.opacity(0.18), radius: 24, x: 0, y: 8)

                    Image(systemName: "storefront.fill")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 46, height: 46)
                        .foregroundColor(.white)
                }
                .scaleEffect(appear ? 1 : 0.4)
                .opacity(appear ? 1 : 0)

                // ── Title block ──
                VStack(spacing: 14) {
                    Text("POS1")
                        .font(.system(size: 58, weight: .black))
                        .foregroundColor(.white)

                    Text("نظام نقاط البيع المتكامل")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(Color.white.opacity(0.75))

                    // Feature pills grid
                    VStack(spacing: 8) {
                        HStack(spacing: 8) {
                            FeaturePill(text: "فواتير ZATCA",    color: Color.white)
                            FeaturePill(text: "شاشة المطبخ KDS", color: Color.white)
                        }
                        HStack(spacing: 8) {
                            FeaturePill(text: "إدارة الطاولات",  color: Color.white)
                            FeaturePill(text: "تقارير لحظية",    color: Color.white)
                        }
                    }
                }
                .offset(y: appear ? 0 : 40)
                .opacity(appear ? 1 : 0)
            }
            .padding(.horizontal, 40)
        }
    }
}

// MARK: ─ Login Form Panel

private struct LoginFormPanel: View {
    @ObservedObject var viewModel: AuthViewModel
    let appear: Bool

    var body: some View {
        ZStack {
            Color(hex: "F4F6FF").ignoresSafeArea()

            // Top-right subtle glow
            Circle()
                .fill(Color(hex: "7C3AED").opacity(0.05))
                .frame(width: 320, height: 320)
                .blur(radius: 80)
                .offset(x: 80, y: -120)

            VStack {
                Spacer()

                // ── Clean form card ──
                VStack(spacing: 28) {
                    // Greeting
                    VStack(spacing: 6) {
                        Text("مرحباً بك 👋")
                            .font(.system(size: 30, weight: .bold))
                            .foregroundColor(Color(hex: "0F172A"))
                        Text("سجّل دخولك للمتابعة")
                            .font(.subheadline)
                            .foregroundColor(Color(hex: "94A3B8"))
                    }

                    // Fields
                    VStack(spacing: 14) {
                        PremiumTextField(
                            placeholder: "البريد الإلكتروني",
                            text: $viewModel.email,
                            icon: "envelope",
                            keyboard: .emailAddress,
                            contentType: .emailAddress
                        )

                        PremiumSecureField(
                            placeholder: "كلمة المرور",
                            text: $viewModel.password
                        )

                        // Error banner
                        if let err = viewModel.errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.caption)
                                Text(err)
                                    .font(.caption)
                                Spacer()
                            }
                            .foregroundColor(Color(hex: "EF4444"))
                            .padding(12)
                            .background(Color(hex: "EF4444").opacity(0.1))
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color(hex: "EF4444").opacity(0.2), lineWidth: 1)
                            )
                        }

                        // CTA button
                        Button {
                            Task { await viewModel.login() }
                        } label: {
                            ZStack {
                                if viewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    HStack(spacing: 10) {
                                        Text("تسجيل الدخول")
                                            .font(.system(size: 16, weight: .bold))
                                        Image(systemName: "arrow.forward.circle.fill")
                                            .font(.system(size: 18))
                                    }
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color(hex: "7C3AED"), Color(hex: "5B21B6")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(14)
                            .shadow(color: Color(hex: "7C3AED").opacity(0.45), radius: 24, x: 0, y: 8)
                        }
                        .disabled(viewModel.isLoading)
                        .animation(.easeOut(duration: 0.15), value: viewModel.isLoading)
                    }
                }
                .padding(40)
                .frame(maxWidth: 460)
                .background(
                    RoundedRectangle(cornerRadius: 28)
                        .fill(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 28)
                                .stroke(Color.black.opacity(0.06), lineWidth: 1)
                        )
                )
                .shadow(color: Color(hex: "7C3AED").opacity(0.08), radius: 40, x: 0, y: 16)
                .offset(y: appear ? 0 : 30)
                .opacity(appear ? 1 : 0)

                Spacer()

                Text("الإصدار 1.0.0")
                    .font(.caption2)
                    .foregroundColor(Color(hex: "94A3B8"))
                    .padding(.bottom, 28)
            }
            .padding(.horizontal, 40)
        }
    }
}

// MARK: ─ Shared Helpers

private struct FeaturePill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(color)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(color.opacity(0.1))
            .overlay(Capsule().stroke(color.opacity(0.22), lineWidth: 1))
            .clipShape(Capsule())
    }
}

struct PremiumTextField: View {
    let placeholder: String
    @Binding var text: String
    let icon: String
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType?
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(focused ? PosColors.Violet500 : Color(hex: "94A3B8"))
                .frame(width: 22)

            TextField(placeholder, text: $text)
                .foregroundColor(Color(hex: "0F172A"))
                .font(.system(size: 15))
                .keyboardType(keyboard)
                .autocapitalization(.none)
                .textContentType(contentType)
                .focused($focused)
                .accentColor(PosColors.Violet600)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 15)
        .background(Color.black.opacity(0.03))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    focused ? PosColors.Violet600.opacity(0.5) : Color.black.opacity(0.08),
                    lineWidth: 1
                )
        )
        .animation(.easeInOut(duration: 0.2), value: focused)
    }
}

struct PremiumSecureField: View {
    let placeholder: String
    @Binding var text: String
    @State private var showPassword = false
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lock")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(focused ? PosColors.Violet500 : Color(hex: "94A3B8"))
                .frame(width: 22)

            Group {
                if showPassword {
                    TextField(placeholder, text: $text)
                } else {
                    SecureField(placeholder, text: $text)
                }
            }
            .foregroundColor(Color(hex: "0F172A"))
            .font(.system(size: 15))
            .textContentType(.password)
            .focused($focused)
            .accentColor(PosColors.Violet600)

            Button {
                showPassword.toggle()
            } label: {
                Image(systemName: showPassword ? "eye.slash" : "eye")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 15)
        .background(Color.black.opacity(0.03))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    focused ? PosColors.Violet600.opacity(0.5) : Color.black.opacity(0.08),
                    lineWidth: 1
                )
        )
        .animation(.easeInOut(duration: 0.2), value: focused)
    }
}
