package com.pos1.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Discount
import androidx.compose.material.icons.outlined.Kitchen
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.pos1.app.data.model.ProductDto
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.CartItem
import com.pos1.app.ui.viewmodel.CashierViewModel
import com.pos1.app.ui.viewmodel.SelectedModifier

/* ═══════════════════════════════════════════════════════════════
   Cashier Screen — Professional POS split-pane layout
   ═══════════════════════════════════════════════════════════════ */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CashierScreen(vm: CashierViewModel) {
    var selectedCategory by remember { mutableStateOf("الكل") }
    var searchQuery by remember { mutableStateOf("") }
    var showPaymentSheet by remember { mutableStateOf(false) }
    var showModifierDialog by remember { mutableStateOf<ProductDto?>(null) }

    // Filter products
    val filtered = remember(vm.products, selectedCategory, searchQuery) {
        vm.products.filter { p ->
            (selectedCategory == "الكل" || p.category?.nameAr == selectedCategory) &&
                    (searchQuery.isBlank() || p.nameAr.contains(searchQuery, true) ||
                            (p.nameEn?.contains(searchQuery, true) == true))
        }
    }

    Row(modifier = Modifier.fillMaxSize()) {
        // ─── Left: Product Catalog ───
        Column(
            modifier = Modifier
                .weight(0.6f)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.background)
                .padding(start = 16.dp, end = 8.dp, top = 12.dp),
        ) {
            // Order Type Selector
            OrderTypeSelector(
                selected = vm.orderType,
                onSelect = { vm.orderType = it },
                tables = vm.tables.map { it.code },
                selectedTable = vm.selectedTableId,
                onTableSelect = { vm.selectedTableId = it },
            )

            Spacer(Modifier.height(8.dp))

            // Category Chips
            CategoryChips(
                categories = vm.categories,
                selected = selectedCategory,
                onSelect = { selectedCategory = it },
            )

            Spacer(Modifier.height(12.dp))

            // Search
            SearchField(
                query = searchQuery,
                onQueryChange = { searchQuery = it },
            )

            Spacer(Modifier.height(12.dp))

            // Product Grid
            if (filtered.isEmpty()) {
                EmptyProductsState()
            } else {
                ProductGrid(
                    products = filtered,
                    categories = vm.categories,
                    onAddToCart = { product ->
                        if (product.modifierGroups.isNotEmpty()) {
                            showModifierDialog = product
                        } else {
                            vm.addToCart(product)
                        }
                    },
                )
            }
        }

        // ─── Divider ───
        Box(
            Modifier
                .width(1.dp)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.outlineVariant)
        )

        // ─── Right: Cart Panel ───
        CartPanel(
            cart = vm.cart,
            subtotal = vm.subtotal,
            taxAmount = vm.taxAmount,
            discountAmount = vm.discountAmount,
            grandTotal = vm.grandTotal,
            couponCode = vm.couponCode,
            couponMessage = vm.couponMessage,
            onCouponCodeChange = { vm.couponCode = it },
            onValidateCoupon = { vm.validateCoupon() },
            onClearCoupon = { vm.clearCoupon() },
            onUpdateQty = { index, qty -> vm.updateCartItemQty(index, qty) },
            onRemove = { vm.removeCartItem(it) },
            onClear = { vm.clearCart() },
            onSendToKitchen = { vm.sendToKitchen() },
            onPayment = { showPaymentSheet = true },
            modifier = Modifier
                .weight(0.4f)
                .fillMaxHeight(),
        )
    }

    // Payment Sheet
    if (showPaymentSheet) {
        PaymentBottomSheet(
            grandTotal = vm.grandTotal,
            onDismiss = { showPaymentSheet = false },
            onConfirm = { received ->
                vm.processPayment(received)
                showPaymentSheet = false
            },
        )
    }

    // Modifier Selection Dialog
    showModifierDialog?.let { product ->
        ModifierSelectionDialog(
            product = product,
            onDismiss = { showModifierDialog = null },
            onConfirm = { modifiers ->
                vm.addToCart(product, modifiers)
                showModifierDialog = null
            },
        )
    }
}

/* ─── Order Type Selector ─── */

@Composable
private fun OrderTypeSelector(
    selected: String,
    onSelect: (String) -> Unit,
    tables: List<String>,
    selectedTable: String?,
    onTableSelect: (String?) -> Unit,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        listOf("DINE_IN" to "محلي", "TAKEAWAY" to "سفري", "PICKUP" to "استلام").forEach { (type, label) ->
            val isSelected = selected == type
            val bgColor by animateColorAsState(
                if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                label = "orderType_$type",
            )
            val textColor by animateColorAsState(
                if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                label = "orderTypeText_$type",
            )
            Surface(
                onClick = { onSelect(type) },
                shape = RoundedCornerShape(10.dp),
                color = bgColor,
                modifier = Modifier.height(36.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(label, fontWeight = FontWeight.SemiBold, color = textColor, fontSize = 13.sp)
                }
            }
        }

        // Table selector for DINE_IN
        if (selected == "DINE_IN" && tables.isNotEmpty()) {
            Spacer(Modifier.width(8.dp))
            var expanded by remember { mutableStateOf(false) }
            Surface(
                onClick = { expanded = !expanded },
                shape = RoundedCornerShape(10.dp),
                color = PosColors.InfoBg,
                modifier = Modifier.height(36.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 12.dp)) {
                    Text(
                        selectedTable ?: "اختر طاولة",
                        color = PosColors.Info,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

/* ─── Category Chips ─── */

@Composable
private fun CategoryChips(
    categories: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(end = 8.dp),
    ) {
        itemsIndexed(categories) { index, cat ->
            val isSelected = cat == selected
            val accentColor = if (index == 0) MaterialTheme.colorScheme.primary
            else PosColors.CategoryAccents.getOrElse(index - 1) { MaterialTheme.colorScheme.primary }

            FilterChip(
                selected = isSelected,
                onClick = { onSelect(cat) },
                label = {
                    Text(
                        cat,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = accentColor.copy(alpha = 0.15f),
                    selectedLabelColor = accentColor,
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = if (isSelected) accentColor.copy(alpha = 0.3f) else MaterialTheme.colorScheme.outlineVariant,
                    selectedBorderColor = accentColor.copy(alpha = 0.3f),
                    enabled = true,
                    selected = isSelected,
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.height(40.dp),
            )
        }
    }
}

/* ─── Search Field ─── */

@Composable
private fun SearchField(query: String, onQueryChange: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        placeholder = { Text("ابحث عن منتج...", color = PosColors.Slate400) },
        leadingIcon = { Icon(Icons.Default.Search, null, tint = PosColors.Slate400) },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Close, null, tint = PosColors.Slate400, modifier = Modifier.size(18.dp))
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            focusedContainerColor = MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.fillMaxWidth().height(52.dp),
    )
}

/* ─── Empty State ─── */

@Composable
private fun EmptyProductsState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Outlined.ShoppingBag,
                contentDescription = "لا توجد منتجات",
                modifier = Modifier.size(64.dp),
                tint = PosColors.Slate300,
            )
            Spacer(Modifier.height(12.dp))
            Text("لا توجد منتجات", style = MaterialTheme.typography.titleMedium, color = PosColors.Slate400)
            Text("قم بتحميل القائمة من الإعدادات", style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400)
        }
    }
}

/* ─── Product Grid ─── */

@Composable
private fun ProductGrid(
    products: List<ProductDto>,
    categories: List<String>,
    onAddToCart: (ProductDto) -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 150.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 16.dp),
    ) {
        items(products, key = { it.id }) { product ->
            ProductCard(
                product = product,
                categoryIndex = categories.indexOf(product.category?.nameAr ?: "").coerceAtLeast(0),
                hasModifiers = product.modifierGroups.isNotEmpty(),
                onClick = { onAddToCart(product) },
            )
        }
    }
}

/* ─── Product Card ─── */

@Composable
private fun ProductCard(
    product: ProductDto,
    categoryIndex: Int,
    hasModifiers: Boolean,
    onClick: () -> Unit,
) {
    val accentColor = PosColors.CategoryAccents.getOrElse(categoryIndex) { PosColors.Teal500 }
    val bgColor = PosColors.CategoryPalette.getOrElse(categoryIndex) { PosColors.Teal50 }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .animateContentSize(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 1.dp,
            pressedElevation = 4.dp,
        ),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column {
            // Product image or colored category strip
            if (!product.imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(product.imageUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = product.nameAr,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(accentColor, accentColor.copy(alpha = 0.5f))
                            )
                        )
                )
            }

            Column(
                modifier = Modifier
                    .background(bgColor.copy(alpha = 0.3f))
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Product name
                Text(
                    product.nameAr,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = PosColors.Slate900,
                )

                product.nameEn?.let { en ->
                    Text(
                        en,
                        style = MaterialTheme.typography.bodySmall,
                        color = PosColors.Slate400,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                // Price row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "${"%.2f".format(product.basePrice)} ر.س",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = accentColor,
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (hasModifiers) {
                            Icon(
                                Icons.Outlined.Tune,
                                contentDescription = "خيارات",
                                tint = PosColors.Slate400,
                                modifier = Modifier.size(16.dp),
                            )
                            Spacer(Modifier.width(4.dp))
                        }
                        Surface(
                            shape = CircleShape,
                            color = accentColor,
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = "إضافة",
                                tint = Color.White,
                                modifier = Modifier.padding(6.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════════
   Modifier Selection Dialog
   ═══════════════════════════════════════════════════════════════ */

@Composable
private fun ModifierSelectionDialog(
    product: ProductDto,
    onDismiss: () -> Unit,
    onConfirm: (List<SelectedModifier>) -> Unit,
) {
    val selectedModifiers = remember { mutableStateListOf<SelectedModifier>() }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("خيارات ${product.nameAr}", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                product.modifierGroups.forEach { group ->
                    Text(
                        group.nameAr,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (group.minSelections > 0) {
                        Text(
                            "مطلوب (${group.minSelections}-${group.maxSelections})",
                            style = MaterialTheme.typography.bodySmall,
                            color = PosColors.Slate500,
                        )
                    }

                    group.options.forEach { option ->
                        val isSelected = selectedModifiers.any { it.optionId == option.id }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (isSelected) {
                                        selectedModifiers.removeAll { it.optionId == option.id }
                                    } else {
                                        if (group.maxSelections == 1) {
                                            selectedModifiers.removeAll { it.groupId == group.id }
                                        }
                                        if (selectedModifiers.count { it.groupId == group.id } < group.maxSelections) {
                                            selectedModifiers.add(
                                                SelectedModifier(
                                                    groupId = group.id,
                                                    optionId = option.id,
                                                    nameAr = option.nameAr,
                                                    priceAdjustment = option.priceAdjustment,
                                                )
                                            )
                                        }
                                    }
                                }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (group.maxSelections == 1) {
                                RadioButton(selected = isSelected, onClick = null)
                            } else {
                                Checkbox(checked = isSelected, onCheckedChange = null)
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(
                                option.nameAr,
                                modifier = Modifier.weight(1f),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            if (option.priceAdjustment > 0) {
                                Text(
                                    "+${"%.2f".format(option.priceAdjustment)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PosColors.Slate500,
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(selectedModifiers.toList()) }) {
                Text("إضافة للسلة")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("إلغاء")
            }
        },
    )
}

/* ═══════════════════════════════════════════════════════════════
   Cart Panel
   ═══════════════════════════════════════════════════════════════ */

@Composable
private fun CartPanel(
    cart: List<CartItem>,
    subtotal: Double,
    taxAmount: Double,
    discountAmount: Double,
    grandTotal: Double,
    couponCode: String,
    couponMessage: String?,
    onCouponCodeChange: (String) -> Unit,
    onValidateCoupon: () -> Unit,
    onClearCoupon: () -> Unit,
    onUpdateQty: (Int, Int) -> Unit,
    onRemove: (Int) -> Unit,
    onClear: () -> Unit,
    onSendToKitchen: () -> Unit,
    onPayment: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
    ) {
        // ─── Header ───
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.ShoppingCart,
                    contentDescription = "سلة المشتريات",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "سلة المشتريات",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                if (cart.isNotEmpty()) {
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.size(24.dp),
                    ) {
                        Text(
                            "${cart.sumOf { it.qty }}",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
            if (cart.isNotEmpty()) {
                TextButton(onClick = onClear) {
                    Text("مسح", color = PosColors.Danger, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        Divider(color = MaterialTheme.colorScheme.outlineVariant)

        // ─── Cart Items ───
        if (cart.isEmpty()) {
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Outlined.ShoppingBag,
                        contentDescription = "السلة فارغة",
                        modifier = Modifier.size(48.dp),
                        tint = PosColors.Slate300,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text("السلة فارغة", style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate400)
                    Text("اختر منتج لإضافته", style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
                contentPadding = PaddingValues(vertical = 8.dp),
            ) {
                itemsIndexed(cart) { index, item ->
                    CartItemRow(
                        item = item,
                        onUpdateQty = { onUpdateQty(index, it) },
                        onRemove = { onRemove(index) },
                    )
                }
            }
        }

        // ─── Coupon Input ───
        AnimatedVisibility(visible = cart.isNotEmpty()) {
            Column {
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = couponCode,
                        onValueChange = onCouponCodeChange,
                        placeholder = { Text("كود الخصم", fontSize = 13.sp, color = PosColors.Slate400) },
                        leadingIcon = {
                            Icon(Icons.Outlined.Discount, null, tint = PosColors.Slate400, modifier = Modifier.size(18.dp))
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f).height(46.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        ),
                    )
                    Button(
                        onClick = onValidateCoupon,
                        modifier = Modifier.height(46.dp),
                        shape = RoundedCornerShape(10.dp),
                        enabled = couponCode.isNotBlank(),
                    ) {
                        Text("تطبيق", fontSize = 13.sp)
                    }
                }
                couponMessage?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (it.contains("✓")) PosColors.Success else PosColors.Danger,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }

        // ─── Totals ───
        AnimatedVisibility(
            visible = cart.isNotEmpty(),
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        ) {
            Column {
                Divider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(Modifier.height(12.dp))

                TotalRow("المجموع الفرعي", subtotal)
                TotalRow("الضريبة", taxAmount)
                if (discountAmount > 0) {
                    TotalRow("الخصم", -discountAmount, PosColors.Success)
                }

                Spacer(Modifier.height(8.dp))
                Divider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "الإجمالي",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        "${"%.2f".format(grandTotal)} ر.س",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                Spacer(Modifier.height(16.dp))

                // ─── Actions ───
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = onSendToKitchen,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = Brush.linearGradient(listOf(PosColors.Warning, PosColors.Warning))
                        ),
                    ) {
                        Icon(Icons.Outlined.Kitchen, null, modifier = Modifier.size(18.dp), tint = PosColors.Warning)
                        Spacer(Modifier.width(6.dp))
                        Text("المطبخ", color = PosColors.Warning, fontWeight = FontWeight.SemiBold)
                    }

                    Button(
                        onClick = onPayment,
                        modifier = Modifier.weight(1.5f).height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                        ),
                        elevation = ButtonDefaults.buttonElevation(4.dp),
                    ) {
                        Icon(Icons.Outlined.Payments, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "الدفع · ${"%.2f".format(grandTotal)} ر.س",
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }
    }
}

/* ─── Cart Item Row ─── */

@Composable
private fun CartItemRow(
    item: CartItem,
    onUpdateQty: (Int) -> Unit,
    onRemove: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Name + price + modifiers
        Column(modifier = Modifier.weight(1f)) {
            Text(
                item.product.nameAr,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (item.selectedModifiers.isNotEmpty()) {
                Text(
                    item.selectedModifiers.joinToString("، ") { it.nameAr },
                    style = MaterialTheme.typography.bodySmall,
                    color = PosColors.Slate400,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                "${"%.2f".format(item.unitPrice)} ر.س",
                style = MaterialTheme.typography.bodySmall,
                color = PosColors.Slate500,
            )
        }

        // Quantity stepper
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            QuantityButton(icon = Icons.Default.Remove) { onUpdateQty(item.qty - 1) }

            Text(
                "${item.qty}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.widthIn(min = 28.dp),
                textAlign = TextAlign.Center,
            )

            QuantityButton(icon = Icons.Default.Add) { onUpdateQty(item.qty + 1) }
        }

        Spacer(Modifier.width(12.dp))

        // Line total
        Text(
            "${"%.2f".format(item.lineTotal)}",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.widthIn(min = 56.dp),
            textAlign = TextAlign.End,
        )

        // Remove
        IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = PosColors.Danger.copy(alpha = 0.7f), modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun QuantityButton(icon: ImageVector, onClick: () -> Unit) {
    FilledIconButton(
        onClick = onClick,
        modifier = Modifier.size(30.dp),
        shape = RoundedCornerShape(8.dp),
        colors = IconButtonDefaults.filledIconButtonColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.primary,
        ),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
    }
}

/* ─── Total Row ─── */

@Composable
private fun TotalRow(label: String, amount: Double, color: Color = PosColors.Slate600) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate500)
        Text("${"%.2f".format(amount)} ر.س", style = MaterialTheme.typography.bodyMedium, color = color)
    }
}

/* ═══════════════════════════════════════════════════════════════
   Payment Bottom Sheet
   ═══════════════════════════════════════════════════════════════ */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaymentBottomSheet(
    grandTotal: Double,
    onDismiss: () -> Unit,
    onConfirm: (Double) -> Unit,
) {
    var selectedMethod by remember { mutableStateOf("cash") }
    var inputAmount by remember { mutableStateOf("") }

    val receivedAmount = inputAmount.toDoubleOrNull() ?: 0.0
    val changeAmount = (receivedAmount - grandTotal).coerceAtLeast(0.0)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                "الدفع",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(4.dp))
            Text("الإجمالي المطلوب", style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate500)
            Text(
                "${"%.2f".format(grandTotal)} ر.س",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )

            Spacer(Modifier.height(20.dp))

            // Payment Method
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PaymentMethodChip("نقدي", "cash", selectedMethod) { selectedMethod = it }
                PaymentMethodChip("بطاقة", "card", selectedMethod) { selectedMethod = it }
                PaymentMethodChip("NFC", "nfc", selectedMethod) { selectedMethod = it }
            }

            Spacer(Modifier.height(20.dp))

            if (selectedMethod == "cash") {
                // Received Amount Display
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = PosColors.Slate50,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("المبلغ المستلم", style = MaterialTheme.typography.labelMedium, color = PosColors.Slate500)
                        Text(
                            if (inputAmount.isBlank()) "0.00" else inputAmount,
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (receivedAmount >= grandTotal) PosColors.Success else PosColors.Slate900,
                        )
                        Text("ر.س", style = MaterialTheme.typography.labelMedium, color = PosColors.Slate400)
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Quick Amount Chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    listOf(10, 20, 50, 100, 200).forEach { amount ->
                        OutlinedButton(
                            onClick = {
                                inputAmount = if (inputAmount.isBlank()) "$amount"
                                else "${(inputAmount.toDoubleOrNull() ?: 0.0) + amount}"
                            },
                            modifier = Modifier.weight(1f).height(42.dp),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(0.dp),
                        ) {
                            Text("$amount", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                    }
                    OutlinedButton(
                        onClick = { inputAmount = "%.2f".format(grandTotal) },
                        modifier = Modifier.weight(1f).height(42.dp),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(0.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PosColors.Success),
                    ) {
                        Text("المبلغ", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Numpad
                NumpadGrid(
                    onKey = { key ->
                        inputAmount = when (key) {
                            "⌫" -> inputAmount.dropLast(1)
                            "." -> if (inputAmount.contains(".")) inputAmount else inputAmount + "."
                            "C" -> ""
                            else -> inputAmount + key
                        }
                    },
                )

                Spacer(Modifier.height(12.dp))

                // Change Display
                if (receivedAmount > 0) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = if (receivedAmount >= grandTotal) PosColors.SuccessBg else PosColors.WarningBg,
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                if (receivedAmount >= grandTotal) "الباقي" else "المتبقي",
                                style = MaterialTheme.typography.titleSmall,
                                color = if (receivedAmount >= grandTotal) PosColors.Success else PosColors.Warning,
                            )
                            Text(
                                "${"%.2f".format(if (receivedAmount >= grandTotal) changeAmount else grandTotal - receivedAmount)} ر.س",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (receivedAmount >= grandTotal) PosColors.Success else PosColors.Warning,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Confirm Button
            Button(
                onClick = { onConfirm(receivedAmount) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                elevation = ButtonDefaults.buttonElevation(4.dp),
                enabled = selectedMethod != "cash" || receivedAmount >= grandTotal,
            ) {
                Icon(Icons.Outlined.Payments, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    "تأكيد الدفع وطباعة الفاتورة",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PaymentMethodChip(
    label: String,
    method: String,
    selected: String,
    onSelect: (String) -> Unit,
) {
    val isSelected = method == selected
    val bgColor by animateColorAsState(
        if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
        label = "methodBg_$method",
    )
    val textColor by animateColorAsState(
        if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
        label = "methodText_$method",
    )

    Surface(
        onClick = { onSelect(method) },
        shape = RoundedCornerShape(12.dp),
        color = bgColor,
        modifier = Modifier.height(48.dp).widthIn(min = 80.dp),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 20.dp)) {
            Text(label, fontWeight = FontWeight.SemiBold, color = textColor)
        }
    }
}

@Composable
private fun NumpadGrid(onKey: (String) -> Unit) {
    val keys = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf(".", "0", "⌫"),
    )

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        keys.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                row.forEach { key ->
                    Surface(
                        onClick = { onKey(key) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = when (key) {
                            "⌫" -> PosColors.DangerBg
                            "." -> PosColors.Slate100
                            else -> PosColors.Slate50
                        },
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                key,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = if (key == "⌫") PosColors.Danger else PosColors.Slate800,
                            )
                        }
                    }
                }
            }
        }
    }
}
