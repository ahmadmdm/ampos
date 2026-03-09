package com.pos1.app.ui.screens

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.RoomService
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.ui.viewmodel.ReadyOrderUi
import com.pos1.app.ui.viewmodel.WaiterCallUi
import com.pos1.app.ui.viewmodel.WaiterViewModel
import kotlinx.coroutines.delay

/* ═══════════════════════════════════════════════════════════════
   Waiter Screen — Dark Premium  (Ramotion style)
   ═══════════════════════════════════════════════════════════════ */

private val VoidBg      = Color(0xFFF4F6FF)
private val Surface1    = Color(0xFFFFFFFF)
private val Surface2    = Color(0xFFF8F9FF)
private val GhostBorder = Color(0x12000000)
private val VioletMain  = Color(0xFF7C3AED)
private val AmberMain   = Color(0xFFF59E0B)
private val SuccessMain = Color(0xFF10B981)
private val DangerMain  = Color(0xFFEF4444)

@Composable
fun WaiterScreen(vm: WaiterViewModel) {

    LaunchedEffect(Unit) {
        while (true) {
            vm.refresh()
            delay(5000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(VoidBg)
            .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        // ─── Header ───
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    "النادل",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = PosColors.Slate900,
                )
                Text(
                    "${vm.waiterCalls.count { it.status == "CREATED" }} طلب مفتوح · ${vm.readyOrders.size} طلب جاهز",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF64748B),
                )
            }
            IconButton(onClick = { vm.refresh() }) {
                if (vm.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = VioletMain,
                    )
                } else {
                    Icon(Icons.Default.Refresh, "تحديث", tint = Color(0xFF64748B))
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ─── Left Panel: Waiter Calls ───
            WaiterPanel(modifier = Modifier.weight(1f)) {
                // Panel header
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(AmberMain.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Notifications, null, Modifier.size(18.dp), tint = AmberMain)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "طلبات النادل",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PosColors.Slate800,
                    )
                    Spacer(Modifier.width(8.dp))
                    val pending = vm.waiterCalls.count { it.status == "CREATED" }
                    if (pending > 0) {
                        DarkPendingBadge(count = pending, color = DangerMain)
                    }
                }

                Spacer(Modifier.height(14.dp))

                if (vm.waiterCalls.isEmpty()) {
                    DarkEmptyPanel(icon = Icons.Outlined.RoomService, label = "لا توجد طلبات")
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                    ) {
                        items(vm.waiterCalls, key = { it.id }) { call ->
                            DarkWaiterCallCard(
                                call = call,
                                onAck = { vm.ackCall(call.id) },
                                onResolve = { vm.resolveCall(call.id) },
                            )
                        }
                    }
                }
            }

            // ─── Divider ───
            Box(
                Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .background(GhostBorder),
            )

            // ─── Right Panel: Ready Orders ───
            WaiterPanel(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(SuccessMain.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Restaurant, null, Modifier.size(18.dp), tint = SuccessMain)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "طلبات جاهزة",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = PosColors.Slate800,
                    )
                    Spacer(Modifier.width(8.dp))
                    if (vm.readyOrders.isNotEmpty()) {
                        DarkPendingBadge(count = vm.readyOrders.size, color = SuccessMain)
                    }
                }

                Spacer(Modifier.height(14.dp))

                if (vm.readyOrders.isEmpty()) {
                    DarkEmptyPanel(icon = Icons.Outlined.Restaurant, label = "لا توجد طلبات جاهزة")
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                    ) {
                        items(vm.readyOrders, key = { it.ticketId }) { order ->
                            DarkReadyOrderCard(order)
                        }
                    }
                }
            }
        }
    }
}

/* ─── Panel Container ─── */

@Composable
private fun WaiterPanel(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .clip(RoundedCornerShape(16.dp))
            .background(Surface1)
            .border(1.dp, GhostBorder, RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        content()
    }
}

/* ─── Pending Badge ─── */

@Composable
private fun DarkPendingBadge(count: Int, color: Color) {
    val inf = rememberInfiniteTransition(label = "badgePulse")
    val alpha by inf.animateFloat(
        initialValue = 1f,
        targetValue = 0.4f,
        animationSpec = infiniteRepeatable(tween(800, easing = LinearEasing), RepeatMode.Reverse),
        label = "badgeAlpha",
    )
    Box(
        Modifier
            .alpha(alpha)
            .size(24.dp)
            .clip(CircleShape)
            .background(color.copy(alpha = 0.18f))
            .border(1.dp, color.copy(alpha = 0.4f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text("$count", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

/* ─── Empty Panel ─── */

@Composable
private fun DarkEmptyPanel(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, Modifier.size(44.dp), tint = Color(0xFF1E293B))
            Spacer(Modifier.height(8.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF334155))
        }
    }
}

/* ─── Waiter Call Card ─── */

@Composable
private fun DarkWaiterCallCard(
    call: WaiterCallUi,
    onAck: () -> Unit,
    onResolve: () -> Unit,
) {
    val isUrgent  = call.elapsedMin > 5
    val isPending = call.status == "CREATED"
    val isAcked   = call.status == "ACKNOWLEDGED"

    val accentColor = when {
        !isPending && !isAcked -> SuccessMain
        isUrgent               -> DangerMain
        else                   -> AmberMain
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Surface2)
            .border(1.dp, accentColor.copy(alpha = if (isPending || isAcked) 0.3f else 0.1f), RoundedCornerShape(14.dp))
            .padding(14.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(accentColor.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        call.tableCode,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = accentColor,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(
                        "طاولة ${call.tableCode}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                    )
                    Text(call.reason, style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Box(
                    Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(accentColor.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text(
                        "${call.elapsedMin} د",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = accentColor,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    when (call.status) {
                        "CREATED"      -> "بانتظار"
                        "ACKNOWLEDGED" -> "مستلم"
                        "RESOLVED"     -> "تم"
                        else           -> call.status
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF475569),
                )
            }
        }

        if (isPending || isAcked) {
            Spacer(Modifier.height(10.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(GhostBorder))
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (isPending) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, GhostBorder, RoundedCornerShape(8.dp))
                            .background(Color(0x14FFFFFF)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Button(
                            onClick = onAck,
                            modifier = Modifier.fillMaxSize(),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        ) {
                            Text("استلام", fontSize = 13.sp, color = Color(0xFFCBD5E1))
                        }
                    }
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(SuccessMain.copy(alpha = 0.85f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Button(
                        onClick = onResolve,
                        modifier = Modifier.fillMaxSize(),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    ) {
                        Icon(Icons.Default.Check, null, Modifier.size(15.dp), tint = Color.White)
                        Spacer(Modifier.width(4.dp))
                        Text("تم", fontSize = 13.sp, color = Color.White)
                    }
                }
            }
        }
    }
}

/* ─── Ready Order Card ─── */

@Composable
private fun DarkReadyOrderCard(order: ReadyOrderUi) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(SuccessMain.copy(alpha = 0.08f))
            .border(1.dp, SuccessMain.copy(alpha = 0.25f), RoundedCornerShape(14.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(SuccessMain.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Restaurant, null, Modifier.size(20.dp), tint = SuccessMain)
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    order.orderNo,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = SuccessMain,
                )
                Text(
                    "طاولة ${order.tableCode}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF64748B),
                )
            }
        }
        Box(
            Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(SuccessMain)
                .padding(horizontal = 14.dp, vertical = 6.dp),
        ) {
            Text(
                "جاهز",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
        }
    }
