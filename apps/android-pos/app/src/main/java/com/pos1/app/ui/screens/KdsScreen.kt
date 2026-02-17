package com.pos1.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.KdsTicketUi
import com.pos1.app.ui.viewmodel.KdsViewModel
import kotlinx.coroutines.delay

/* ═══════════════════════════════════════════════════════════════
   KDS Screen — Kitchen Display with Kanban columns
   ═══════════════════════════════════════════════════════════════ */

private data class KdsColumn(
    val status: String,
    val labelAr: String,
    val color: Color,
    val bgColor: Color,
)

private val kdsColumns = listOf(
    KdsColumn("NEW", "جديد", PosColors.Info, PosColors.InfoBg),
    KdsColumn("COOKING", "قيد التحضير", PosColors.Warning, PosColors.WarningBg),
    KdsColumn("READY", "جاهز", PosColors.Success, PosColors.SuccessBg),
    KdsColumn("SERVED", "تم التقديم", PosColors.Slate500, PosColors.Slate100),
)

@Composable
fun KdsScreen(vm: KdsViewModel) {

    // Auto-refresh every 4 seconds
    LaunchedEffect(Unit) {
        while (true) {
            vm.refreshTickets()
            delay(4000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(top = 12.dp),
    ) {
        // ─── Header ───
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    "شاشة المطبخ",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "${vm.tickets.size} تذكرة نشطة",
                    style = MaterialTheme.typography.bodySmall,
                    color = PosColors.Slate500,
                )
            }

            // SLA Warning count
            val slaBreaches = vm.tickets.count { it.elapsedMin > 12 }
            if (slaBreaches > 0) {
                PulsingWarning(count = slaBreaches)
            }
        }

        Spacer(Modifier.height(12.dp))

        // ─── Station Filter (dynamic from API) ───
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) {
            items(vm.stations) { station ->
                val isSelected = station == vm.selectedStation
                FilterChip(
                    selected = isSelected,
                    onClick = { vm.selectedStation = station },
                    label = {
                        Text(station, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.primary,
                    ),
                    shape = RoundedCornerShape(20.dp),
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        // ─── Kanban Board ───
        Row(
            modifier = Modifier
                .fillMaxSize()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            kdsColumns.forEach { column ->
                val columnTickets = vm.filteredTickets(column.status)

                KdsColumnView(
                    column = column,
                    tickets = columnTickets,
                    onStatusChange = { ticketId, newStatus ->
                        vm.updateTicketStatus(ticketId, newStatus)
                    },
                    modifier = Modifier
                        .width(280.dp)
                        .fillMaxHeight(),
                )
            }
        }
    }
}

/* ─── Pulsing SLA Warning ─── */

@Composable
private fun PulsingWarning(count: Int) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulseAlpha",
    )

    Surface(
        shape = RoundedCornerShape(10.dp),
        color = PosColors.DangerBg,
        modifier = Modifier.alpha(alpha),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.AccessTime, null, modifier = Modifier.size(16.dp), tint = PosColors.Danger)
            Spacer(Modifier.width(4.dp))
            Text(
                "$count تجاوز SLA",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = PosColors.Danger,
            )
        }
    }
}

/* ─── KDS Column ─── */

@Composable
private fun KdsColumnView(
    column: KdsColumn,
    tickets: List<KdsTicketUi>,
    onStatusChange: (String, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = column.bgColor.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(0.dp),
    ) {
        Column {
            // Column header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(column.color.copy(alpha = 0.1f))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(column.color)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        column.labelAr,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = column.color,
                    )
                }
                Surface(
                    shape = CircleShape,
                    color = column.color.copy(alpha = 0.15f),
                    modifier = Modifier.size(28.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            "${tickets.size}",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = column.color,
                        )
                    }
                }
            }

            // Tickets
            if (tickets.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "لا توجد تذاكر",
                        style = MaterialTheme.typography.bodySmall,
                        color = PosColors.Slate400,
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(8.dp),
                ) {
                    items(tickets, key = { it.id }) { ticket ->
                        KdsTicketCard(
                            ticket = ticket,
                            currentStatus = column.status,
                            onStatusChange = onStatusChange,
                        )
                    }
                }
            }
        }
    }
}

/* ─── KDS Ticket Card ─── */

@Composable
private fun KdsTicketCard(
    ticket: KdsTicketUi,
    currentStatus: String,
    onStatusChange: (String, String) -> Unit,
) {
    val isSlaBreached = ticket.elapsedMin > 12
    val isWarning = ticket.elapsedMin > 8

    val borderColor by animateColorAsState(
        when {
            isSlaBreached -> PosColors.Danger
            isWarning -> PosColors.Warning
            else -> Color.Transparent
        },
        label = "ticketBorder",
    )

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp),
        shape = RoundedCornerShape(12.dp),
        border = if (isSlaBreached || isWarning) BorderStroke(2.dp, borderColor) else null,
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    ticket.orderNo,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (ticket.tableCode != "-") {
                        Surface(shape = RoundedCornerShape(6.dp), color = PosColors.InfoBg) {
                            Text(
                                ticket.tableCode,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = PosColors.Info,
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                    }
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = when {
                            isSlaBreached -> PosColors.DangerBg
                            isWarning -> PosColors.WarningBg
                            else -> PosColors.Slate100
                        },
                    ) {
                        Text(
                            "${ticket.elapsedMin}د",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = when {
                                isSlaBreached -> PosColors.Danger
                                isWarning -> PosColors.Warning
                                else -> PosColors.Slate600
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Items (parsed from API)
            if (ticket.items.isNotEmpty()) {
                ticket.items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            "• ${item.qty}× ${item.name}",
                            style = MaterialTheme.typography.bodySmall,
                            color = PosColors.Slate600,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        if (item.station.isNotBlank()) {
                            Text(
                                item.station,
                                style = MaterialTheme.typography.labelSmall,
                                color = PosColors.Slate400,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }

            // Action buttons
            val nextStatuses = when (currentStatus) {
                "NEW" -> listOf("COOKING" to "بدء التحضير")
                "COOKING" -> listOf("READY" to "جاهز")
                "READY" -> listOf("SERVED" to "تم التقديم")
                else -> emptyList()
            }

            if (nextStatuses.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    nextStatuses.forEach { (status, label) ->
                        val statusColumn = kdsColumns.firstOrNull { it.status == status }
                        Button(
                            onClick = { onStatusChange(ticket.id, status) },
                            modifier = Modifier.weight(1f).height(36.dp),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = statusColumn?.color ?: MaterialTheme.colorScheme.primary,
                            ),
                        ) {
                            Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.width(4.dp))
                            Icon(Icons.Default.ChevronRight, null, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}
