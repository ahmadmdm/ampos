import SwiftUI

struct SettingsScreen: View {
    @ObservedObject var viewModel: MainViewModel
    @EnvironmentObject var configStore: PosConfigStore
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("إعدادات الاتصال")) {
                    TextField("رابط الخادم", text: $configStore.apiBaseUrl)
                        .textContentType(.URL)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    
                    TextField("معرف المنظمة", text: $configStore.organizationId)
                    
                    TextField("معرف الفرع", text: $configStore.branchId)
                }
                
                Section(header: Text("معلومات الجهاز")) {
                    HStack {
                        Text("معرف الجهاز")
                        Spacer()
                        Text(configStore.deviceId ?? "غير مسجل")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("الطابعة الحالية")
                        Spacer()
                        Text(configStore.receiptPrinterName)
                            .foregroundColor(.secondary)
                    }
                }

                Section(
                    header: Text("إعدادات الطباعة"),
                    footer: Text("يمكنك تفعيل الطباعة التلقائية بعد إنشاء الطلب، وتحديد عدد النسخ لكل نوع طباعة.")
                ) {
                    TextField("اسم طابعة الإيصالات", text: $configStore.receiptPrinterName)

                    Toggle("طباعة الإيصال تلقائياً بعد تأكيد الطلب", isOn: $configStore.autoPrintReceipt)

                    Stepper(value: $configStore.receiptPrintCopies, in: 1...5) {
                        HStack {
                            Text("عدد نسخ الإيصال")
                            Spacer()
                            Text("\(configStore.receiptPrintCopies)")
                                .foregroundColor(.secondary)
                        }
                    }

                    Toggle("إرسال نسخة للمطبخ تلقائياً", isOn: $configStore.autoPrintKitchenTicket)

                    if configStore.autoPrintKitchenTicket {
                        Stepper(value: $configStore.kitchenPrintCopies, in: 1...5) {
                            HStack {
                                Text("عدد نسخ المطبخ")
                                Spacer()
                                Text("\(configStore.kitchenPrintCopies)")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }

                    Toggle("فتح معاينة PDF بعد إنشاء الطلب", isOn: $configStore.openInvoicePreviewAfterOrder)
                }

                Section(header: Text("ملخص التشغيل")) {
                    Label(
                        configStore.autoPrintReceipt
                            ? "سيتم إرسال الإيصال تلقائياً إلى \(configStore.receiptPrinterName)"
                            : "الطباعة التلقائية للإيصال متوقفة",
                        systemImage: configStore.autoPrintReceipt ? "printer.fill" : "printer"
                    )
                    .foregroundColor(configStore.autoPrintReceipt ? PosColors.Success : PosColors.Warning)

                    Label(
                        configStore.openInvoicePreviewAfterOrder
                            ? "سيتم فتح ملف PDF بعد إنشاء الطلب"
                            : "لن يتم فتح ملف PDF تلقائياً",
                        systemImage: "doc.richtext"
                    )
                    .foregroundColor(PosColors.Slate700)
                }
                
                Section(header: Text("الحساب")) {
                    if configStore.accessToken != nil {
                        Text("تم تسجيل الدخول")
                            .foregroundColor(PosColors.Success)
                    } else {
                        Text("غير مسجل الدخول")
                            .foregroundColor(PosColors.Warning)
                    }
                    
                    Button(action: {
                        Task {
                            await viewModel.logout()
                        }
                    }) {
                        Text("تسجيل الخروج")
                            .foregroundColor(PosColors.Danger)
                    }
                }
                
                Section(footer: Text("الإصدار 1.0.0")) {
                    // Spacer
                }
            }
            .navigationTitle("الإعدادات")
        }
        .navigationViewStyle(.stack)
    }
}
