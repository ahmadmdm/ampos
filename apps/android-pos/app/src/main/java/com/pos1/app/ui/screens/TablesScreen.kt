package com.pos1.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.TableWithStatus
import com.pos1.app.ui.viewmodel.TablesViewModel

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
