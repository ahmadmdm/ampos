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
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
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
   KDS Screen — Dark Premium Kitchen Display  (Ramotion style)
   ═══════════════════════════════════════════════════════════════ */

private val VoidBg      = Color(0xFFF4F6FF)
private val Surface1    = Color(0xFFFFFFFF)
private val Surface2    = Color(0xFFF8F9FF)
private val Ghost       = Color(0x0D000000)
private val GhostBorder = Color(0x12000000)

private data class KdsColDef(val status: String, val labelAr: String, val color: Color)

private val kdsColumns = listOf(
    KdsColDef("NEW",     "جديد",         Color(0xFF3B82F6)),
    KdsColDef("COOKING", "قيد التحضير",  Color(0xFFF59E0B)),
    KdsColDef("READY",   "جاهز",          Color(0xFF10B981)),
    KdsColDef("SERVED",  "تم التقديم",   Color(0xFF64748B)),
)

@Composable
fun KdsScreen(vm: KdsViewModel) {

    LaunchedEffect(Unit) {
        while (true) {
            vm.refreshTickets()
            delay(4000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(VoidBg)
            .padding(top = 12.dp),
    ) {
        // ─── Header ───
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    "شاشة المطبخ",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = PosColors.Slate900,
                )
                Text(
                    "${vm.tickets.size} تذكرة نشطة",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF64748B),
                )
            }
            val slaBreaches = vm.tickets.count { it.elapsedMin > 12 }
            if (slaBreaches > 0) {
                DarkSlaBadge(count = slaBreaches)
            }
        }

        Spacer(Modifier.height(12.dp))

        // ─── Station Filter ───
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 20.dp),
        ) {
            items(vm.stations) { station ->
                val isSelected = station == vm.selectedStation
                Surface(
                    onClick = { vm.selectedStation = station },
                    shape = RoundedCornerShape(20.dp),
                    color = if (isSelected) Color(0xFF7C3AED) else Ghost,
                    border = BorderStroke(1.dp, if (isSelected) Color(0xFF7C3AED) else GhostBorder),
                ) {
                    Text(
                        station,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 7.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) Color.White else Color(0xFF94A3B8),
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // ─── Kanban Board ───
        Row(
            modifier = Modifier
                .fillMaxSize()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            kdsColumns.forEach { col ->
                val colTickets = vm.filteredTickets(col.status)
                DarkKdsColumn(
                    col = col,
                    tickets = colTickets,
                    onStatusChange = { id, next -> vm.updateTicketStatus(id, next) },
                    modifier = Modifier
                        .width(288.dp)
                        .fillMaxHeight(),
                )
            }
        }
    }
}

/* ─── Pulsing SLA Badge ─── */

@Composable
private fun DarkSlaBadge(count: Int) {
    val inf = rememberInfiniteTransition(label = "slaPulse")
    val alpha by inf.animateFloat(
        initialValue = 1f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(tween(700, easing = LinearEasing), RepeatMode.Reverse),
        label = "slaAlpha",
    )
    Box(
        modifier = Modifier
            .alpha(alpha)
            .clip(RoundedCornerShape(10.dp))
            .background(Color(0xFF7F1D1D))
            .border(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.AccessTime, null, modifier = Modifier.size(15.dp), tint = Color(0xFFEF4444))
            Spacer(Modifier.width(6.dp))
            Text(
                "$count تجاوز SLA",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFEF4444),
            )
        }
    }
}

/* ─── KDS Column ─── */

@Composable
private fun DarkKdsColumn(
    col: KdsColDef,
    tickets: List<KdsTicketUi>,
    onStatusChange: (String, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Surface1)
            .border(1.dp, col.color.copy(alpha = 0.18f), RoundedCornerShape(16.dp)),
    ) {
        // ── Column header strip ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(col.color.copy(alpha = 0.12f))
                .padding(horizontal = 14.dp, vertical = 11.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(9.dp)
                            .clip(CircleShape)
                            .background(col.color)
                            .shadow(4.dp, CircleShape, ambientColor = col.color, spotColor = col.color)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        col.labelAr,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = col.color,
                    )
                }
                Box(
                    Modifier
                        .clip(CircleShape)
                        .background(col.color.copy(alpha = 0.18f))
                        .padding(horizontal = 9.dp, vertical = 3.dp),
                ) {
                    Text(
                        "${tickets.size}",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = col.color,
                    )
                }
            }
        }

        // ── Tickets ──
        if (tickets.isEmpty()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("لا توجد تذاكر", style = MaterialTheme.typography.bodySmall, color = Color(0xFF475569))
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(10.dp),
            ) {
                items(tickets, key = { it.id }) { ticket ->
                    DarkKdsTicketCard(
                        ticket = ticket,
                        currentStatus = col.status,
                        columnColor = col.color,
                        onStatusChange = onStatusChange,
                    )
                }
            }
        }
    }
}

/* ─── KDS Ticket Card ─── */

@Composable
private fun DarkKdsTicketCard(
    ticket: KdsTicketUi,
    currentStatus: String,
    columnColor: Color,
    onStatusChange: (String, String) -> Unit,
) {
    val isSlaBreached = ticket.elapsedMin > 12
    val isWarning     = ticket.elapsedMin > 8

    val borderColor by animateColorAsState(
        when {
            isSlaBreached -> Color(0xFFEF4444)
            isWarning     -> Color(0xFFF59E0B)
            else          -> Color.Transparent
        },
        label = "ticketBorder",
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Surface2)
            .border(
                width = 1.5.dp,
                color = if (isSlaBreached || isWarning) borderColor else GhostBorder,
                shape = RoundedCornerShape(12.dp),
            )
            .padding(12.dp),
    ) {
        // Header row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                ticket.orderNo,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = PosColors.Slate900,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (ticket.tableCode != "-") {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(0xFFEFF6FF))
                            .padding(horizontal = 7.dp, vertical = 2.dp),
                    ) {
                        Text(
                            ticket.tableCode,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF60A5FA),
                        )
                    }
                    Spacer(Modifier.width(6.dp))
                }
                // Timer badge
                val timerBg = when {
                    isSlaBreached -> Color(0xFF7F1D1D)
                    isWarning     -> Color(0xFF451A03)
                    else          -> Ghost
                }
                val timerColor = when {
                    isSlaBreached -> Color(0xFFEF4444)
                    isWarning     -> Color(0xFFF59E0B)
                    else          -> Color(0xFF94A3B8)
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(timerBg)
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.AccessTime, null, Modifier.size(11.dp), tint = timerColor)
                        Spacer(Modifier.width(3.dp))
                        Text(
                            "${ticket.elapsedMin}د",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = timerColor,
                        )
                    }
                }
            }
        }

        if (ticket.items.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            // Thin accent divider
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(columnColor.copy(alpha = 0.15f))
            )
            Spacer(Modifier.height(8.dp))
            ticket.items.forEach { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "• ${item.qty}× ${item.name}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFCBD5E1),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    if (item.station.isNotBlank()) {
                        Text(
                            item.station,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF475569),
                        )
                    }
                }
            }
        }

        // Action button
        val nextStatuses = when (currentStatus) {
            "NEW"     -> listOf("COOKING" to "بدء التحضير")
            "COOKING" -> listOf("READY"   to "جاهز")
            "READY"   -> listOf("SERVED"  to "تم التقديم")
            else      -> emptyList()
        }
        if (nextStatuses.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            nextStatuses.forEach { (nextStatus, label) ->
                val btnColor = kdsColumns.firstOrNull { it.status == nextStatus }?.color ?: columnColor
                Button(
                    onClick = { onStatusChange(ticket.id, nextStatus) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(36.dp),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = btnColor.copy(alpha = 0.85f)),
                ) {
                    Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.Default.ChevronRight, null, Modifier.size(15.dp), tint = Color.White)
                }
            }
        }
    }
}
