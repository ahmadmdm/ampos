import SwiftUI
import PDFKit

private struct ShareableDocument: Identifiable {
    let id = UUID()
    let url: URL
}

struct CashierScreen: View {
    @StateObject private var viewModel: CashierViewModel
    @State private var selectedOrderType: String = "DINE_IN"
    
    init(apiClient: ApiClient) {
        _viewModel = StateObject(wrappedValue: CashierViewModel(apiClient: apiClient))
    }
    
    let orderTypes = [
        ("DINE_IN", "صالة الطعام"),
        ("TAKEAWAY", "سفري"),
        ("DELIVERY_PICKUP", "توصيل")
    ]
    
    var body: some View {
        HStack(spacing: 0) {
            // Left Panel: Product Categories & Items
            VStack(spacing: 0) {
                // Categories Bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(viewModel.categories) { category in
                            Button(action: {
                                viewModel.selectedCategory = category
                            }) {
                                Text(category.nameAr)
                                    .font(.system(size: 14, weight: .medium))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(
                                        viewModel.selectedCategory?.id == category.id 
                                            ? PosColors.Brand600 
                                            : PosColors.Slate100
                                    )
                                    .foregroundColor(
                                        viewModel.selectedCategory?.id == category.id 
                                            ? .white 
                                            : PosColors.Slate700
                                    )
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 12)
                .background(Color.white)
                
                Divider()
                
                // Products Grid
                if viewModel.isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                        Text("جاري التحميل...")
                            .font(.caption)
                            .foregroundColor(PosColors.Slate400)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12)
                        ], spacing: 12) {
                            ForEach(viewModel.filteredProducts) { product in
                                ProductCard(product: product) {
                                    viewModel.addToCart(product: product)
                                }
                            }
                        }
                        .padding(16)
                    }
                    .background(PosColors.Slate50)
                }
            }
            .frame(maxWidth: .infinity)
            
            Divider()
            
            // Right Panel: Cart & Order
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 12) {
                    HStack {
                        Text("الطلب الجديد")
                            .font(.title2)
                            .fontWeight(.bold)
                        Spacer()
                        Button(action: {
                            viewModel.clearCart()
                        }) {
                            Text("مسح الكل")
                                .font(.caption)
                                .foregroundColor(PosColors.Danger)
                        }
                    }

                    if let errorMessage = viewModel.errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text(errorMessage)
                                .font(.caption)
                                .multilineTextAlignment(.trailing)
                            Spacer()
                        }
                        .foregroundColor(PosColors.Danger)
                        .padding(10)
                        .background(PosColors.DangerBg)
                        .cornerRadius(8)
                    }

                    if let successMessage = viewModel.successMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                            Text(successMessage)
                                .font(.caption)
                                .multilineTextAlignment(.trailing)
                            Spacer()
                        }
                        .foregroundColor(PosColors.Success)
                        .padding(10)
                        .background(PosColors.SuccessBg)
                        .cornerRadius(8)
                    }

                    if let printStatusMessage = viewModel.printStatusMessage {
                        HStack(spacing: 8) {
                            Image(systemName: viewModel.printStatusIsError ? "printer.fill" : "printer.dotmatrix.fill")
                            Text(printStatusMessage)
                                .font(.caption)
                                .multilineTextAlignment(.trailing)
                            Spacer()
                        }
                        .foregroundColor(viewModel.printStatusIsError ? PosColors.Warning : PosColors.Brand700)
                        .padding(10)
                        .background(viewModel.printStatusIsError ? PosColors.WarningBg : PosColors.Brand100)
                        .cornerRadius(8)
                    }
                    
                    // Order Type Selector
                    HStack(spacing: 8) {
                        ForEach(orderTypes, id: \.0) { orderType in
                            Button(action: {
                                selectedOrderType = orderType.0
                                viewModel.orderType = orderType.0
                                if orderType.0 != "DINE_IN" {
                                    viewModel.selectedTableId = nil
                                }
                            }) {
                                Text(orderType.1)
                                    .font(.caption)
                                    .fontWeight(selectedOrderType == orderType.0 ? .bold : .regular)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(
                                        selectedOrderType == orderType.0 
                                            ? PosColors.Brand100 
                                            : PosColors.Slate100
                                    )
                                    .foregroundColor(
                                        selectedOrderType == orderType.0 
                                            ? PosColors.Brand700 
                                            : PosColors.Slate600
                                    )
                                    .cornerRadius(6)
                            }
                        }
                    }

                    if selectedOrderType == "DINE_IN" {
                        VStack(alignment: .trailing, spacing: 6) {
                            Text("الطاولة")
                                .font(.caption)
                                .foregroundColor(PosColors.Slate600)

                            Picker(
                                "الطاولة",
                                selection: Binding(
                                    get: { viewModel.selectedTableId ?? "" },
                                    set: { newValue in
                                        viewModel.selectedTableId = newValue.isEmpty ? nil : newValue
                                    }
                                )
                            ) {
                                Text("اختر الطاولة")
                                    .tag("")

                                ForEach(viewModel.activeTables) { table in
                                    Text(table.code)
                                        .tag(table.id)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(PosColors.Slate100)
                            .cornerRadius(8)

                            if viewModel.activeTables.isEmpty {
                                Text("لا توجد طاولات متاحة في هذا الفرع")
                                    .font(.caption2)
                                    .foregroundColor(PosColors.Warning)
                            }
                        }
                    }
                }
                .padding(16)
                .background(Color.white)
                
                Divider()
                
                // Cart Items
                if viewModel.cart.isEmpty {
                    VStack {
                        Spacer()
                        Image(systemName: "cart")
                            .font(.system(size: 48))
                            .foregroundColor(PosColors.Slate300)
                        Text("السلة فارغة")
                            .font(.title3)
                            .foregroundColor(PosColors.Slate400)
                        Text("اختر المنتجات لإضافتها")
                            .font(.caption)
                            .foregroundColor(PosColors.Slate400)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(viewModel.cart) { item in
                                CartItemRow(item: item) {
                                    viewModel.removeFromCart(item: item)
                                } onQtyChange: { newQty in
                                    if let index = viewModel.cart.firstIndex(where: { $0.id == item.id }) {
                                        viewModel.cart[index].qty = newQty
                                    }
                                }
                            }
                        }
                        .padding(16)
                    }
                }
                
                Spacer()
                
                // Order Summary & Actions
                VStack(spacing: 16) {
                    Divider()
                    
                    VStack(spacing: 8) {
                        HStack {
                            Text("المجموع الفرعي")
                            Spacer()
                            Text("\(viewModel.subtotal, specifier: "%.2f") ر.س")
                        }
                        
                        HStack {
                            Text("الضريبة (\(Int(viewModel.taxRate * 100))%)")
                            Spacer()
                            Text("\(viewModel.taxAmount, specifier: "%.2f") ر.س")
                        }
                        .foregroundColor(PosColors.Slate600)
                        
                        HStack {
                            Text("الإجمالي")
                                .fontWeight(.bold)
                            Spacer()
                            Text("\(viewModel.grandTotal, specifier: "%.2f") ر.س")
                                .fontWeight(.bold)
                                .foregroundColor(PosColors.Brand600)
                        }
                    }
                    .font(.system(size: 14))
                    
                    // Action Buttons
                    VStack(spacing: 8) {
                        VStack(alignment: .trailing, spacing: 6) {
                            HStack {
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("إعدادات الطباعة")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                    Text(viewModel.lastCreatedOrderNo.map { "آخر طلب: #\($0)" } ?? "سيتم استخدام آخر طلب تم إنشاؤه")
                                        .font(.caption2)
                                        .foregroundColor(PosColors.Slate500)
                                }
                                Spacer()
                                Image(systemName: "printer.dotmatrix")
                                    .foregroundColor(PosColors.Brand600)
                            }

                            HStack(spacing: 8) {
                                Button(action: {
                                    Task {
                                        await viewModel.printLastReceipt()
                                    }
                                }) {
                                    HStack(spacing: 6) {
                                        if viewModel.isPrintingReceipt {
                                            ProgressView()
                                                .tint(PosColors.Brand700)
                                        } else {
                                            Image(systemName: "printer.fill")
                                        }
                                        Text(viewModel.isPrintingReceipt ? "جاري الطباعة" : "طباعة الإيصال")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(PosColors.Brand100)
                                    .foregroundColor(PosColors.Brand700)
                                    .cornerRadius(8)
                                }
                                .disabled(viewModel.lastCreatedOrderId == nil || viewModel.isPrintingReceipt)

                                Button(action: {
                                    Task {
                                        await viewModel.previewLastInvoice()
                                    }
                                }) {
                                    HStack(spacing: 6) {
                                        if viewModel.isPreparingInvoicePreview {
                                            ProgressView()
                                                .tint(PosColors.Slate700)
                                        } else {
                                            Image(systemName: "doc.richtext")
                                        }
                                        Text(viewModel.isPreparingInvoicePreview ? "جاري التحضير" : "معاينة PDF")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(PosColors.Slate100)
                                    .foregroundColor(PosColors.Slate700)
                                    .cornerRadius(8)
                                }
                                .disabled(viewModel.lastCreatedOrderId == nil || viewModel.isPreparingInvoicePreview)
                            }
                        }

                        Button(action: {
                            Task {
                                await viewModel.submitOrder()
                            }
                        }) {
                            HStack(spacing: 8) {
                                if viewModel.isSubmittingOrder {
                                    ProgressView()
                                        .tint(.white)
                                }

                                Text(viewModel.isSubmittingOrder ? "جاري الإرسال..." : "تأكيد الطلب")
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(PosColors.Success)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .disabled(
                            viewModel.cart.isEmpty ||
                            viewModel.isSubmittingOrder ||
                            (selectedOrderType == "DINE_IN" && viewModel.selectedTableId == nil)
                        )
                        
                        Button(action: {
                            // TODO: Implement hold order
                        }) {
                            Text("إيقاف الطلب")
                                .fontWeight(.medium)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(PosColors.Warning)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                        .disabled(viewModel.cart.isEmpty)
                    }
                }
                .padding(16)
                .background(Color.white)
            }
            .frame(width: 320)
        }
        .navigationBarHidden(true)
        .task {
            await viewModel.loadData()
        }
        .sheet(
            item: Binding<ShareableDocument?>(
                get: {
                    guard let url = viewModel.invoicePreviewURL else { return nil }
                    return ShareableDocument(url: url)
                },
                set: { _ in
                    viewModel.clearInvoicePreview()
                }
            )
        ) { document in
            PDFPreviewSheet(documentURL: document.url) {
                viewModel.clearInvoicePreview()
            }
        }
    }
}

private struct PDFPreviewSheet: View {
    let documentURL: URL
    let onClose: () -> Void

    var body: some View {
        NavigationStack {
            PDFDocumentView(documentURL: documentURL)
                .background(Color.white)
                .navigationTitle("معاينة الإيصال")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("إغلاق") {
                            onClose()
                        }
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        ShareLink(item: documentURL) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
        }
    }
}

private struct PDFDocumentView: UIViewRepresentable {
    let documentURL: URL

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.backgroundColor = .white
        view.document = PDFDocument(url: documentURL)
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        if uiView.document?.documentURL != documentURL {
            uiView.document = PDFDocument(url: documentURL)
        }
    }
}

// MARK: - Product Card Component
struct ProductCard: View {
    let product: ProductDto
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                // Product Image Placeholder
                RoundedRectangle(cornerRadius: 8)
                    .fill(PosColors.Slate200)
                    .frame(height: 80)
                    .overlay(
                        Image(systemName: "photo")
                            .foregroundColor(PosColors.Slate400)
                    )
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(product.nameAr)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(PosColors.Slate900)
                        .multilineTextAlignment(.leading)
                    
                    Text("\(product.basePrice, specifier: "%.2f") ر.س")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(PosColors.Brand600)
                }
            }
            .padding(12)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: PosColors.Slate200, radius: 2, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Cart Item Row Component  
struct CartItemRow: View {
    let item: CartItem
    let onRemove: () -> Void
    let onQtyChange: (Int) -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.product.nameAr)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(PosColors.Slate900)
                
                Text("\(item.unitPrice, specifier: "%.2f") ر.س")
                    .font(.caption)
                    .foregroundColor(PosColors.Slate600)
            }
            
            Spacer()
            
            // Quantity Controls
            HStack(spacing: 8) {
                Button(action: {
                    if item.qty > 1 {
                        onQtyChange(item.qty - 1)
                    } else {
                        onRemove()
                    }
                }) {
                    Image(systemName: item.qty > 1 ? "minus" : "trash")
                        .font(.caption)
                        .frame(width: 24, height: 24)
                        .background(item.qty > 1 ? PosColors.Slate200 : PosColors.Danger)
                        .foregroundColor(item.qty > 1 ? PosColors.Slate700 : .white)
                        .cornerRadius(4)
                }
                
                Text("\(item.qty)")
                    .font(.system(size: 14, weight: .medium))
                    .frame(minWidth: 24)
                
                Button(action: {
                    onQtyChange(item.qty + 1)
                }) {
                    Image(systemName: "plus")
                        .font(.caption)
                        .frame(width: 24, height: 24)
                        .background(PosColors.Success)
                        .foregroundColor(.white)
                        .cornerRadius(4)
                }
            }
            
            VStack(alignment: .trailing) {
                Text("\(item.lineTotal, specifier: "%.2f") ر.س")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(PosColors.Brand600)
            }
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(8)
        .shadow(color: PosColors.Slate100, radius: 1, x: 0, y: 1)
    }
}

#Preview {
    CashierScreen(apiClient: ApiClient(configStore: PosConfigStore()))
}