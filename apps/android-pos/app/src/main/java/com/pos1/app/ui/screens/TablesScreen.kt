package com.pos1.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.TableWithStatus
import com.pos1.app.ui.viewmodel.TablesViewModel

/* ═══════════════════════════════════════════════════════════════
   Tables Screen – Ramotion Dark Premium
   ═══════════════════════════════════════════════════════════════ */

private fun statusAccent(status: String): Color = when (status) {
    "OCCUPIED"      -> PosColors.Warning
    "RESERVED"      -> PosColors.Info
    "NEEDS_SERVICE" -> PosColors.Danger
    else            -> PosColors.Success
}

private fun statusLabel(status: String): String = when (status) {
    "OCCUPIED"      -> "مشغولة"
    "RESERVED"      -> "محجوزة"
    "NEEDS_SERVICE" -> "تحتاج خدمة"
    else            -> "متاحة"
}

@Composable
fun TablesScreen(vm: TablesViewModel) {
    var selectedArea by remember { mutableStateOf("الكل") }
    LaunchedEffect(Unit) { vm.loadTables() }

    val filtered = remember(vm.tables, selectedArea) {
        if (selectedArea == "الكل") vm.tables
        else vm.tables.filter { it.table.area?.nameAr == selectedArea }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PosColors.Void),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Header ───────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.End,
            ) {
                Row(
                    modifier              = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment     = Alignment.CenterVertically,
                ) {
                    // Refresh button
                    IconButton(
                        onClick   = { vm.loadTables() },
                        modifier  = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.05f)),
                    ) {
                        Icon(Icons.Default.Refresh, null, tint = PosColors.Slate600, modifier = Modifier.size(18.dp))
                    }

                    // Title + stats
                    Column(horizontalAlignment = Alignment.End) {
                        Text("إدارة الطاولات", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = PosColors.Slate900)
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            DarkStatBadge(vm.tables.count { it.status == "AVAILABLE" }, "متاحة",  PosColors.Success)
                            DarkStatBadge(vm.tables.count { it.status == "OCCUPIED" },  "مشغولة", PosColors.Warning)
                            val svc = vm.tables.count { it.status == "NEEDS_SERVICE" }
                            if (svc > 0) DarkStatBadge(svc, "تحتاج خدمة", PosColors.Danger)
                        }
                    }
                }

                // Area filter
                if (vm.areas.size > 1) {
                    Spacer(Modifier.height(14.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(vm.areas) { area ->
                            val sel = area == selectedArea
                            Surface(
                                onClick = { selectedArea = area },
                                shape   = RoundedCornerShape(20.dp),
                                color   = if (sel) PosColors.Violet600.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.05f),
                                modifier = Modifier.border(
                                    1.dp,
                                    if (sel) PosColors.Violet600.copy(alpha = 0.4f) else Color.Transparent,
                                    RoundedCornerShape(20.dp),
                                ),
                            ) {
                                Text(
                                    area,
                                    modifier   = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                                    style      = MaterialTheme.typography.labelMedium,
                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                                    color      = if (sel) PosColors.Violet400 else PosColors.Slate500,
                                )
                            }
                        }
                    }
                }
            }

            // ── Content ──────────────────────────────────────────
            when {
                vm.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PosColors.Violet500)
                }
                filtered.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("لا توجد طاولات", style = MaterialTheme.typography.titleMedium, color = PosColors.Slate400)
                }
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 200.dp),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                    verticalArrangement   = Arrangement.spacedBy(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(filtered, key = { it.table.id }) { table ->
                        DarkTableCard(table)
                    }
                }
            }
        }
    }
}

/* ─── Stat Badge ─── */

@Composable
private fun DarkStatBadge(count: Int, label: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.1f))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Box(Modifier.size(7.dp).clip(CircleShape).background(color))
        Text("$count", fontWeight = FontWeight.Bold, color = color,       fontSize = 13.sp)
        Text(label,   color      = color.copy(alpha = 0.7f),              fontSize = 12.sp)
    }
}

/* ─── Table Card ─── */

@Composable
private fun DarkTableCard(table: TableWithStatus) {
    val accent = statusAccent(table.status)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Color.Black.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
            .background(PosColors.Surface)
            .clickable { },
    ) {
        // Colored top strip
        Box(Modifier.fillMaxWidth().height(3.dp).background(accent))

        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.End,
        ) {
            // Top row: status badge + table code box
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.Top,
            ) {
                // Status badge
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = accent.copy(alpha = 0.12f),
                ) {
                    Text(
                        statusLabel(table.status),
                        modifier   = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                        style      = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color      = accent,
                    )
                }

                // Table code box
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = accent.copy(alpha = 0.1f),
                    modifier = Modifier.size(58.dp, 52.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            table.table.code,
                            style      = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color      = accent,
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Area name
            table.table.area?.nameAr?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = PosColors.Slate400)
                Spacer(Modifier.height(4.dp))
            }

            // Seat row
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Icon(Icons.Default.People, null, Modifier.size(14.dp), tint = PosColors.Slate400)
                Spacer(Modifier.width(4.dp))
                Text(
                    "${table.guestCount}/${table.table.seats}",
                    style = MaterialTheme.typography.bodySmall,
                    color = PosColors.Slate400,
                )
            }

            // Active order
            table.activeOrder?.let { order ->
                Spacer(Modifier.height(10.dp))
                Divider(color = Color.Black.copy(alpha = 0.05f))
                Spacer(Modifier.height(10.dp))

                Row(
                    modifier              = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment     = Alignment.CenterVertically,
                ) {
                    // Elapsed
                    if (table.elapsedMin > 0) {
                        Text(
                            "${table.elapsedMin} د",
                            style      = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                            color      = if (table.elapsedMin > 30) PosColors.Danger else PosColors.Slate500,
                        )
                    }
                    // Amount
                    Text(
                        "%.0f ر.س".format(order.grandTotal),
                        style      = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color      = PosColors.Amber400,
                    )
                }

                Text(
                    "#${order.orderNo}",
                    modifier = Modifier.fillMaxWidth(),
                    style    = MaterialTheme.typography.bodySmall,
                    color    = PosColors.Slate400,
                )
            }
        }
    }
}


/* ═══════════════════════════════════════════════════════════════
   Tables Screen — Real API tables with live order status
   ═══════════════════════════════════════════════════════════════ */

private fun tableStatusColor(status: String): Color = when (status) {
    "OCCUPIED" -> PosColors.Warning
    "RESERVED" -> PosColors.Info
    "NEEDS_SERVICE" -> PosColors.Danger
    else -> PosColors.Success // AVAILABLE
}

private fun tableStatusBg(status: String): Color = when (status) {
    "OCCUPIED" -> PosColors.WarningBg
    "RESERVED" -> PosColors.InfoBg
    "NEEDS_SERVICE" -> PosColors.DangerBg
    else -> PosColors.SuccessBg
}

private fun tableStatusLabel(status: String): String = when (status) {
    "OCCUPIED" -> "مشغولة"
    "RESERVED" -> "محجوزة"
    "NEEDS_SERVICE" -> "تحتاج خدمة"
    else -> "متاحة"
}

@Composable
fun TablesScreen(vm: TablesViewModel) {
    var selectedArea by remember { mutableStateOf("الكل") }

    LaunchedEffect(Unit) { vm.loadTables() }

    val filtered = remember(vm.tables, selectedArea) {
        if (selectedArea == "الكل") vm.tables
        else vm.tables.filter { it.table.area?.nameAr == selectedArea }
    }

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
                    "إدارة الطاولات",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(4.dp))
                // Summary
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    val available = vm.tables.count { it.status == "AVAILABLE" }
                    val occupied = vm.tables.count { it.status == "OCCUPIED" }
                    StatusSummaryBadge("متاحة", available, PosColors.Success, PosColors.SuccessBg)
                    StatusSummaryBadge("مشغولة", occupied, PosColors.Warning, PosColors.WarningBg)
                }
            }

            IconButton(onClick = { vm.loadTables() }) {
                Icon(Icons.Default.Refresh, contentDescription = "تحديث", tint = MaterialTheme.colorScheme.primary)
            }
        }

        Spacer(Modifier.height(16.dp))

        // ─── Area Filter ───
        if (vm.areas.size > 1) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(vm.areas) { area ->
                    val isSelected = area == selectedArea
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedArea = area },
                        label = { Text(area, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                            selectedLabelColor = MaterialTheme.colorScheme.primary,
                        ),
                        shape = RoundedCornerShape(20.dp),
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        // ─── Content ───
        when {
            vm.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            filtered.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("لا توجد طاولات", style = MaterialTheme.typography.titleMedium, color = PosColors.Slate400)
                }
            }
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 180.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(bottom = 16.dp),
                ) {
                    items(filtered, key = { it.table.id }) { table ->
                        TableCard(table = table)
                    }
                }
            }
        }
    }
}

/* ─── Summary Badge ─── */

@Composable
private fun StatusSummaryBadge(label: String, count: Int, color: Color, bgColor: Color) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = bgColor,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(color)
            )
            Text("$count", fontWeight = FontWeight.Bold, color = color, fontSize = 14.sp)
            Text(label, color = color.copy(alpha = 0.8f), fontSize = 12.sp)
        }
    }
}

/* ─── Table Card ─── */

@Composable
private fun TableCard(table: TableWithStatus) {
    val stColor = tableStatusColor(table.status)
    val stBgColor = tableStatusBg(table.status)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* TODO: Open table actions */ },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column {
            // Status strip
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(stColor)
            )

            Column(modifier = Modifier.padding(16.dp)) {
                // Table code + status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = stBgColor,
                            modifier = Modifier.size(44.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    table.table.code,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = stColor,
                                )
                            }
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                "طاولة ${table.table.code}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                table.table.area?.nameAr ?: "",
                                style = MaterialTheme.typography.bodySmall,
                                color = PosColors.Slate400,
                            )
                        }
                    }

                    Surface(shape = RoundedCornerShape(8.dp), color = stBgColor) {
                        Text(
                            tableStatusLabel(table.status),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = stColor,
                        )
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Seats + time
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.People, null, modifier = Modifier.size(16.dp), tint = PosColors.Slate400)
                        Spacer(Modifier.width(4.dp))
                        Text(
                            "${table.guestCount}/${table.table.seats}",
                            style = MaterialTheme.typography.bodySmall,
                            color = PosColors.Slate500,
                        )
                    }

                    if (table.elapsedMin > 0) {
                        Text(
                            "${table.elapsedMin} د",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (table.elapsedMin > 30) PosColors.Danger else PosColors.Slate500,
                            fontWeight = if (table.elapsedMin > 30) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                }

                // Order total if occupied
                table.activeOrder?.let { order ->
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        color = PosColors.Slate50,
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(order.orderNo, style = MaterialTheme.typography.labelSmall, color = PosColors.Slate500)
                            Text(
                                "${"%.2f".format(order.grandTotal)} ر.س",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }
        }
    }
}
