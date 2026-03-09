package com.pos1.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
   Orders Screen – Ramotion Dark Premium
   ═══════════════════════════════════════════════════════════════ */

private data class StatusOpt(val key: String?, val label: String, val color: Color)
private val statusOpts = listOf(
    StatusOpt(null,          "الكل",        PosColors.Violet500),
    StatusOpt("CONFIRMED",   "مؤكد",        PosColors.Info),
    StatusOpt("IN_KITCHEN",  "في المطبخ",   PosColors.Warning),
    StatusOpt("READY",       "جاهز",        PosColors.Teal500),
    StatusOpt("SERVED",      "تم التقديم",  PosColors.Success),
    StatusOpt("COMPLETED",   "مكتمل",       PosColors.Success),
    StatusOpt("VOIDED",      "ملغي",        PosColors.Danger),
)
private fun accentFor(status: String): Color = statusOpts.firstOrNull { it.key == status }?.color ?: PosColors.Slate500
private fun labelFor(status: String): String = statusOpts.firstOrNull { it.key == status }?.label ?: status
private fun typeAr(type: String): String = when (type) {
    "DINE_IN" -> "صالة"; "TAKEAWAY" -> "سفري"; "PICKUP" -> "استلام"; else -> type
}

@Composable
fun OrdersScreen(vm: OrdersViewModel) {
    LaunchedEffect(Unit) { vm.refreshOrders() }

    Box(
        modifier = Modifier.fillMaxSize().background(PosColors.Void)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Header ───────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                // Pagination controls
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick  = { vm.nextPage() },
                        enabled  = vm.currentPage < vm.totalPages,
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.05f)),
                    ) { Icon(Icons.Default.ChevronLeft, null, tint = if (vm.currentPage < vm.totalPages) PosColors.Slate700 else PosColors.Slate300, modifier = Modifier.size(18.dp)) }

                    Text(
                        "${vm.currentPage}/${vm.totalPages}",
                        style  = MaterialTheme.typography.labelMedium,
                        color  = PosColors.Slate500,
                        modifier = Modifier.padding(horizontal = 8.dp),
                    )

                    IconButton(
                        onClick  = { vm.prevPage() },
                        enabled  = vm.currentPage > 1,
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.05f)),
                    ) { Icon(Icons.Default.ChevronRight, null, tint = if (vm.currentPage > 1) PosColors.Slate700 else PosColors.Slate300, modifier = Modifier.size(18.dp)) }

                    Spacer(Modifier.width(8.dp))

                    IconButton(
                        onClick  = { vm.refreshOrders() },
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.05f)),
                    ) { Icon(Icons.Default.Refresh, null, tint = PosColors.Slate600, modifier = Modifier.size(18.dp)) }
                }

                // Title
                Column(horizontalAlignment = Alignment.End) {
                    Text("الطلبات", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = PosColors.Slate900)
                    Text("${vm.totalOrders} طلب", style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400)
                }
            }

            // ── Status filters ────────────────────────────────────
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 20.dp),
            ) {
                items(statusOpts) { opt ->
                    val sel = vm.statusFilter == opt.key
                    Surface(
                        onClick  = { vm.loadOrders(status = if (vm.statusFilter == opt.key) null else opt.key) },
                        shape    = RoundedCornerShape(20.dp),
                        color    = if (sel) opt.color.copy(alpha = 0.13f) else Color.Black.copy(alpha = 0.05f),
                        modifier = Modifier.border(1.dp, if (sel) opt.color.copy(alpha = 0.35f) else Color.Transparent, RoundedCornerShape(20.dp)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 13.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            if (opt.key != null) Box(Modifier.size(7.dp).clip(CircleShape).background(opt.color))
                            Text(opt.label, style = MaterialTheme.typography.labelMedium, fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal, color = if (sel) opt.color else PosColors.Slate500)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // ── Content ──────────────────────────────────────────
            when {
                vm.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PosColors.Violet500)
                }
                vm.orders.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.Receipt, null, Modifier.size(56.dp), tint = PosColors.Slate200)
                        Spacer(Modifier.height(12.dp))
                        Text("لا توجد طلبات", style = MaterialTheme.typography.titleMedium, color = PosColors.Slate400)
                    }
                }
                else -> LazyColumn(
                    contentPadding        = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                    verticalArrangement   = Arrangement.spacedBy(10.dp),
                ) {
                    items(vm.orders, key = { it.id }) { order ->
                        DarkOrderCard(order, onVoid = { vm.voidOrder(order.id) })
                    }
                }
            }
        }
    }
}

/* ─── Dark Order Card ─── */

@Composable
private fun DarkOrderCard(order: OrderDto, onVoid: () -> Unit) {
    val accent = accentFor(order.status)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, Color.Black.copy(alpha = 0.05f), RoundedCornerShape(14.dp))
            .background(PosColors.Surface),
    ) {
        // Left accent strip
        Box(Modifier.width(3.dp).heightIn(min = 90.dp).background(accent))

        Column(modifier = Modifier.weight(1f).padding(14.dp)) {
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                // Status badge
                Surface(shape = RoundedCornerShape(7.dp), color = accent.copy(alpha = 0.12f)) {
                    Text(labelFor(order.status), modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = accent)
                }

                // Order number
                Text("#${order.orderNo}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = PosColors.Slate900)
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    // Type tag
                    Surface(shape = RoundedCornerShape(6.dp), color = Color.Black.copy(alpha = 0.05f)) {
                        Text(typeAr(order.type), modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp), style = MaterialTheme.typography.labelSmall, color = PosColors.Slate500)
                    }
                    order.table?.let { Text("طاولة ${it.code}", style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400) }
                }
                Text(order.createdAt.take(10), style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400)
            }

            Spacer(Modifier.height(8.dp))

            // Items preview
            if (order.items.isNotEmpty()) {
                Text(
                    order.items.joinToString("  ·  ") { "${it.qty}× ${it.itemNameAr}" },
                    style    = MaterialTheme.typography.bodySmall,
                    color    = PosColors.Slate400,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(8.dp))
            }

            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Text("${order.items.size} عناصر", style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400)
                Text("${"%.2f".format(order.grandTotal)} ر.س", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = PosColors.Amber400)
            }

            if (order.status !in listOf("VOIDED", "COMPLETED", "REFUNDED")) {
                Spacer(Modifier.height(8.dp))
                Divider(color = Color.Black.copy(alpha = 0.05f))
                Spacer(Modifier.height(8.dp))
                Surface(
                    onClick = onVoid,
                    shape   = RoundedCornerShape(8.dp),
                    color   = PosColors.Danger.copy(alpha = 0.1f),
                    modifier = Modifier.border(1.dp, PosColors.Danger.copy(alpha = 0.2f), RoundedCornerShape(8.dp)),
                ) {
                    Text("إلغاء الطلب", modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = PosColors.Danger)
                }
            }
        }
    }
}


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
