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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.ReadyOrderUi
import com.pos1.app.ui.viewmodel.WaiterCallUi
import com.pos1.app.ui.viewmodel.WaiterViewModel
import kotlinx.coroutines.delay

/* ═══════════════════════════════════════════════════════════════
   Waiter Screen — Calls + Ready Orders
   ═══════════════════════════════════════════════════════════════ */

@Composable
fun WaiterScreen(vm: WaiterViewModel) {

    // Auto-refresh every 5 seconds
    LaunchedEffect(Unit) {
        while (true) {
            vm.refresh()
            delay(5000)
        }
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
                    "النادل",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "${vm.waiterCalls.count { it.status == "CREATED" }} طلب مفتوح · ${vm.readyOrders.size} طلب جاهز",
                    style = MaterialTheme.typography.bodySmall,
                    color = PosColors.Slate500,
                )
            }
            IconButton(onClick = { vm.refresh() }) {
                if (vm.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Refresh, contentDescription = "تحديث", tint = MaterialTheme.colorScheme.primary)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // ─── Left: Waiter Calls ───
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Notifications,
                        contentDescription = null,
                        tint = PosColors.Warning,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "طلبات النادل",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.width(8.dp))
                    val pending = vm.waiterCalls.count { it.status == "CREATED" }
                    if (pending > 0) {
                        Surface(
                            shape = CircleShape,
                            color = PosColors.DangerBg,
                            modifier = Modifier.size(24.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    "$pending",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = PosColors.Danger,
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))

                if (vm.waiterCalls.isEmpty()) {
                    Box(
                        Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.RoomService,
                                null,
                                modifier = Modifier.size(48.dp),
                                tint = PosColors.Slate300,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text("لا توجد طلبات", style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate400)
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                    ) {
                        items(vm.waiterCalls, key = { it.id }) { call ->
                            WaiterCallCard(
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
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.outlineVariant)
            )

            // ─── Right: Ready Orders ───
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Restaurant,
                        contentDescription = null,
                        tint = PosColors.Success,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "طلبات جاهزة للتقديم",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Spacer(Modifier.height(12.dp))

                if (vm.readyOrders.isEmpty()) {
                    Box(
                        Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.Restaurant,
                                null,
                                modifier = Modifier.size(48.dp),
                                tint = PosColors.Slate300,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text("لا توجد طلبات جاهزة", style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate400)
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                    ) {
                        items(vm.readyOrders, key = { it.ticketId }) { order ->
                            ReadyOrderCard(order)
                        }
                    }
                }
            }
        }
    }
}

/* ─── Waiter Call Card ─── */

@Composable
private fun WaiterCallCard(
    call: WaiterCallUi,
    onAck: () -> Unit,
    onResolve: () -> Unit,
) {
    val isUrgent = call.elapsedMin > 5
    val isPending = call.status == "CREATED"

    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isPending) MaterialTheme.colorScheme.surface
            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        elevation = CardDefaults.cardElevation(if (isPending) 2.dp else 0.dp),
        shape = RoundedCornerShape(14.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isPending) PosColors.WarningBg else PosColors.SuccessBg,
                        modifier = Modifier.size(40.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                call.tableCode,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isPending) PosColors.Warning else PosColors.Success,
                            )
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(
                            "طاولة ${call.tableCode}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            call.reason,
                            style = MaterialTheme.typography.bodySmall,
                            color = PosColors.Slate500,
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = when {
                            !isPending -> PosColors.SuccessBg
                            isUrgent -> PosColors.DangerBg
                            else -> PosColors.WarningBg
                        },
                    ) {
                        Text(
                            "${call.elapsedMin} د",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = when {
                                !isPending -> PosColors.Success
                                isUrgent -> PosColors.Danger
                                else -> PosColors.Warning
                            },
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        when (call.status) {
                            "CREATED" -> "بانتظار"
                            "ACKNOWLEDGED" -> "مستلم"
                            "RESOLVED" -> "تم"
                            else -> call.status
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = PosColors.Slate400,
                    )
                }
            }

            if (isPending || call.status == "ACKNOWLEDGED") {
                Spacer(Modifier.height(10.dp))
                Divider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (isPending) {
                        OutlinedButton(
                            onClick = onAck,
                            modifier = Modifier.weight(1f).height(36.dp),
                            shape = RoundedCornerShape(8.dp),
                        ) {
                            Text("استلام", fontSize = 13.sp)
                        }
                    }
                    Button(
                        onClick = onResolve,
                        modifier = Modifier.weight(1f).height(36.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PosColors.Success),
                    ) {
                        Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("تم", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

/* ─── Ready Order Card ─── */

@Composable
private fun ReadyOrderCard(order: ReadyOrderUi) {
    Card(
        colors = CardDefaults.cardColors(containerColor = PosColors.SuccessBg),
        elevation = CardDefaults.cardElevation(1.dp),
        shape = RoundedCornerShape(14.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = PosColors.Success.copy(alpha = 0.2f),
                    modifier = Modifier.size(40.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Outlined.Restaurant,
                            null,
                            tint = PosColors.Success,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        order.orderNo,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = PosColors.Success,
                    )
                    Text(
                        "طاولة ${order.tableCode}",
                        style = MaterialTheme.typography.bodySmall,
                        color = PosColors.Slate500,
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = PosColors.Success,
            ) {
                Text(
                    "جاهز",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = PosColors.Slate50,
                )
            }
        }
    }
}
