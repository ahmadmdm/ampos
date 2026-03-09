import SwiftUI

// MARK: ─ Settings Screen (Ramotion Dark Premium)

struct SettingsScreen: View {
    @ObservedObject var viewModel: MainViewModel
    @EnvironmentObject var configStore: PosConfigStore

    var body: some View {
        ZStack {
            Color(hex: "F4F6FF").ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    // ── Page header ──────────────────────────────────
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Text("الإعدادات")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(Color(hex: "0F172A"))
                            Text("تخصيص النظام")
                                .font(.caption)
                                .foregroundColor(Color(hex: "94A3B8"))
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)

                    // ── Connection ───────────────────────────────────
                    DarkSection(title: "الاتصال", icon: "network") {
                        DarkTextField(label: "رابط الخادم", icon: "link", text: $configStore.apiBaseUrl, keyboard: .URL)
                        DarkDivider()
                        DarkTextField(label: "معرف المنظمة", icon: "building.2", text: $configStore.organizationId)
                        DarkDivider()
                        DarkTextField(label: "معرف الفرع", icon: "mappin", text: $configStore.branchId)
                    }

                    // ── Device info ──────────────────────────────────
                    DarkSection(title: "معلومات الجهاز", icon: "ipad") {
                        DarkInfoRow(label: "معرف الجهاز", value: configStore.deviceId ?? "غير مسجل")
                        DarkDivider()
                        DarkInfoRow(label: "الطابعة الحالية", value: configStore.receiptPrinterName)
                    }

                    // ── Printing ─────────────────────────────────────
                    DarkSection(title: "الطباعة", icon: "printer") {
                        DarkTextField(label: "اسم طابعة الإيصالات", icon: "printer.dotmatrix", text: $configStore.receiptPrinterName)
                        DarkDivider()
                        DarkToggleRow(label: "طباعة إيصال تلقائياً", isOn: $configStore.autoPrintReceipt, accent: PosColors.Violet500)
                        if configStore.autoPrintReceipt {
                            DarkDivider()
                            DarkStepperRow(label: "نسخ الإيصال", value: $configStore.receiptPrintCopies, range: 1...5)
                        }
                        DarkDivider()
                        DarkToggleRow(label: "إرسال نسخة للمطبخ", isOn: $configStore.autoPrintKitchenTicket, accent: Color(hex: "10B981"))
                        if configStore.autoPrintKitchenTicket {
                            DarkDivider()
                            DarkStepperRow(label: "نسخ المطبخ", value: $configStore.kitchenPrintCopies, range: 1...5)
                        }
                        DarkDivider()
                        DarkToggleRow(label: "فتح معاينة PDF بعد الطلب", isOn: $configStore.openInvoicePreviewAfterOrder, accent: Color(hex: "06B6D4"))
                    }

                    // ── Account ──────────────────────────────────────
                    DarkSection(title: "الحساب", icon: "person.circle") {
                        HStack {
                            Spacer()
                            if configStore.accessToken != nil {
                                HStack(spacing: 7) {
                                    Circle().fill(Color(hex: "10B981")).frame(width: 8, height: 8)
                                    Text("مسجل الدخول")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "10B981"))
                                }
                            } else {
                                HStack(spacing: 7) {
                                    Circle().fill(Color(hex: "F59E0B")).frame(width: 8, height: 8)
                                    Text("غير مسجل الدخول")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "F59E0B"))
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)

                        DarkDivider()

                        Button {
                            Task { await viewModel.logout() }
                        } label: {
                            HStack {
                                Spacer()
                                HStack(spacing: 8) {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                    Text("تسجيل الخروج")
                                        .font(.system(size: 15, weight: .semibold))
                                }
                                .foregroundColor(Color(hex: "EF4444"))
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                        }
                        .buttonStyle(.plain)
                    }

                    // ── Version ──────────────────────────────────────
                    Text("الإصدار 1.0.0")
                        .font(.caption2)
                        .foregroundColor(Color.white.opacity(0.18))
                        .padding(.bottom, 24)
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

// MARK: ─ Reusable Dark Components

private struct DarkSection<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 0) {
            // Section header
            HStack(spacing: 8) {
                Spacer()
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color(hex: "94A3B8"))
                    .textCase(.uppercase)
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)

            // Card
            VStack(spacing: 0) {
                content
            }
            .background(Color(hex: "FFFFFF"))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.black.opacity(0.07), lineWidth: 1)
            )
            .padding(.horizontal, 16)
        }
    }
}

private struct DarkTextField: View {
    let label: String
    let icon: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        HStack(spacing: 12) {
            Spacer()
            TextField(label, text: $text)
                .foregroundColor(Color(hex: "0F172A"))
                .font(.system(size: 14))
                .multilineTextAlignment(.trailing)
                .keyboardType(keyboard)
                .autocapitalization(.none)
                .accentColor(PosColors.Violet400)
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(hex: "64748B"))
                .lineLimit(1)
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "94A3B8"))
                .frame(width: 22)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

private struct DarkInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(value)
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "94A3B8"))
            Spacer()
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(hex: "475569"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

private struct DarkToggleRow: View {
    let label: String
    @Binding var isOn: Bool
    let accent: Color

    var body: some View {
        Toggle(isOn: $isOn) {
            HStack {
                Spacer()
                Text(label)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "0F172A"))
            }
        }
        .toggleStyle(SwitchToggleStyle(tint: accent))
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

private struct DarkStepperRow: View {
    let label: String
    @Binding var value: Int
    let range: ClosedRange<Int>

    var body: some View {
        HStack {
            Stepper(value: $value, in: range) { EmptyView() }
                .labelsHidden()

            Spacer()

            HStack(spacing: 8) {
                Text("\(value)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(PosColors.Violet400)
                    .monospacedDigit()
                Text(label)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "475569"))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

private struct DarkDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.black.opacity(0.06))
            .frame(height: 1)
            .padding(.horizontal, 16)
    }
}
