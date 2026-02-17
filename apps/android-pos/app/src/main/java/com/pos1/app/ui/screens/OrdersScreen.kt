package com.pos1.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.Block
import androidx.compose.material.icons.outlined.Discount
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Undo
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.data.model.OrderDto
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.OrdersViewModel

/* ═══════════════════════════════════════════════════════════════
   Orders Screen — Real API-backed order management
   ═══════════════════════════════════════════════════════════════ */

private data class StatusOption(
    val key: String?,
    val labelAr: String,
    val color: Color,
    val bgColor: Color,
)

private val statuses = listOf(
    StatusOption(null, "الكل", PosColors.Brand600, PosColors.Brand50),
    StatusOption("CONFIRMED", "مؤكد", PosColors.Info, PosColors.InfoBg),
    StatusOption("IN_KITCHEN", "في المطبخ", PosColors.Warning, PosColors.WarningBg),
    StatusOption("READY", "جاهز", PosColors.Teal500, PosColors.Teal50),
    StatusOption("SERVED", "تم التقديم", PosColors.Success, PosColors.SuccessBg),
    StatusOption("COMPLETED", "مكتمل", PosColors.Success, PosColors.SuccessBg),
    StatusOption("VOIDED", "ملغي", PosColors.Danger, PosColors.DangerBg),
)

private fun statusLabelAr(status: String): String = statuses.firstOrNull { it.key == status }?.labelAr ?: status
private fun statusColor(status: String): Color = statuses.firstOrNull { it.key == status }?.color ?: PosColors.Slate500
private fun statusBgColor(status: String): Color = statuses.firstOrNull { it.key == status }?.bgColor ?: PosColors.Slate100

private fun typeAr(type: String): String = when (type) {
    "DINE_IN" -> "محلي"
    "TAKEAWAY" -> "سفري"
    "PICKUP" -> "استلام"
    else -> type
}

@Composable
fun OrdersScreen(vm: OrdersViewModel) {

    LaunchedEffect(Unit) { vm.refreshOrders() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
    ) {
        // ─── Header ───
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    "الطلبات",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "${vm.totalOrders} طلب",
                    style = MaterialTheme.typography.bodySmall,
                    color = PosColors.Slate500,
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                // Refresh
                IconButton(onClick = { vm.refreshOrders() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "تحديث", tint = MaterialTheme.colorScheme.primary)
                }

                // Pagination
                if (vm.totalPages > 1) {
                    Spacer(Modifier.width(8.dp))
                    IconButton(onClick = { vm.prevPage() }, enabled = vm.currentPage > 1) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "السابق")
                    }
                    Text(
                        "${vm.currentPage}/${vm.totalPages}",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    IconButton(onClick = { vm.nextPage() }, enabled = vm.currentPage < vm.totalPages) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "التالي")
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // ─── Status Filters ───
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(statuses) { st ->
                FilterChip(
                    selected = vm.statusFilter == st.key,
                    onClick = { vm.loadOrders(status = if (vm.statusFilter == st.key) null else st.key) },
                    label = { Text(st.labelAr) },
                    leadingIcon = {
                        if (st.key != null) {
                            Box(
                                Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(st.color)
                            )
                        }
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = st.bgColor,
                        selectedLabelColor = st.color,
                    ),
                    shape = RoundedCornerShape(20.dp),
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // ─── Loading / Empty / List ───
        when {
            vm.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            vm.orders.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.Receipt, null, modifier = Modifier.size(64.dp), tint = PosColors.Slate300)
                        Spacer(Modifier.height(12.dp))
                        Text("لا توجد طلبات", style = MaterialTheme.typography.titleMedium, color = PosColors.Slate400)
                    }
                }
            }
            else -> {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 16.dp),
                ) {
                    items(vm.orders, key = { it.id }) { order ->
                        OrderCard(order, onVoid = { vm.voidOrder(order.id) })
                    }
                }
            }
        }
    }
}

/* ─── Order Card ─── */

@Composable
private fun OrderCard(order: OrderDto, onVoid: () -> Unit) {
    val stColor = statusColor(order.status)
    val stBgColor = statusBgColor(order.status)

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(14.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Status indicator strip
            Box(
                Modifier
                    .width(4.dp)
                    .height(140.dp)
                    .background(stColor, RoundedCornerShape(topStart = 14.dp, bottomStart = 14.dp))
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(14.dp),
            ) {
                // Row 1: order number + type + status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            order.orderNo,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (order.type == "DINE_IN") PosColors.InfoBg else PosColors.WarningBg,
                        ) {
                            Text(
                                typeAr(order.type),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (order.type == "DINE_IN") PosColors.Info else PosColors.Warning,
                            )
                        }
                        order.table?.let {
                            Spacer(Modifier.width(6.dp))
                            Text(it.code, style = MaterialTheme.typography.labelMedium, color = PosColors.Slate500)
                        }
                    }

                    Surface(shape = RoundedCornerShape(8.dp), color = stBgColor) {
                        Text(
                            statusLabelAr(order.status),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = stColor,
                        )
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Items summary
                if (order.items.isNotEmpty()) {
                    Text(
                        order.items.joinToString("، ") { "${it.qty}× ${it.itemNameAr}" },
                        style = MaterialTheme.typography.bodySmall,
                        color = PosColors.Slate500,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(8.dp))
                }

                // Row 2: details
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Receipt, null, Modifier.size(14.dp), tint = PosColors.Slate400)
                            Spacer(Modifier.width(4.dp))
                            Text("${order.items.size} عناصر", style = MaterialTheme.typography.bodySmall, color = PosColors.Slate500)
                        }
                        if (order.payments.isNotEmpty()) {
                            Text(
                                order.payments.first().method,
                                style = MaterialTheme.typography.bodySmall,
                                color = PosColors.Slate400,
                            )
                        }
                    }

                    Text(
                        "${"%.2f".format(order.grandTotal)} ر.س",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                // Action buttons
                if (order.status !in listOf("VOIDED", "COMPLETED", "REFUNDED")) {
                    Spacer(Modifier.height(8.dp))
                    Divider(color = MaterialTheme.colorScheme.outlineVariant)
                    Spacer(Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = onVoid,
                            modifier = Modifier.height(32.dp),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = PosColors.Danger),
                        ) {
                            Icon(Icons.Outlined.Block, null, Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("إلغاء", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}
