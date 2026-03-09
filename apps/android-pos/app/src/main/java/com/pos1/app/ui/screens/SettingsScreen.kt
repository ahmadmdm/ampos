package com.pos1.app.ui.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudSync
import androidx.compose.material.icons.outlined.DevicesOther
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.PosApplication
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.AuthViewModel
import com.pos1.app.ui.viewmodel.CashierViewModel

/* ═══════════════════════════════════════════════════════════════
   Settings Screen — Dark Premium  (Ramotion style)
   ═══════════════════════════════════════════════════════════════ */

private val VoidBg      = Color(0xFFF4F6FF)
private val Surface1    = Color(0xFFFFFFFF)
private val Surface2    = Color(0xFFF8F9FF)
private val GhostBorder = Color(0x12000000)
private val VioletMain  = Color(0xFF7C3AED)
private val CyanMain    = Color(0xFF06B6D4)
private val AmberMain   = Color(0xFFF59E0B)
private val DangerMain  = Color(0xFFEF4444)

@Composable
fun SettingsScreen(
    cashierVm: CashierViewModel,
    authVm: AuthViewModel,
    context: Context,
) {
    val prefs = PosApplication.instance.securePrefs
    var isEditing by remember { mutableStateOf(false) }

    var apiUrl     by remember { mutableStateOf(prefs.apiBaseUrl) }
    var branchId   by remember { mutableStateOf(prefs.branchId) }
    var orgId      by remember { mutableStateOf(prefs.organizationId) }
    var deviceCode by remember { mutableStateOf(prefs.deviceCode) }

    var printerIp         by remember { mutableStateOf(prefs.printerIp) }
    var printerPort       by remember { mutableStateOf(prefs.printerPort) }
    var paperWidth        by remember { mutableStateOf(prefs.paperWidth) }
    var autoPrintReceipt  by remember { mutableStateOf(prefs.autoPrintReceipt) }
    var autoPrintKitchen  by remember { mutableStateOf(prefs.autoPrintKitchen) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(VoidBg)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 40.dp),
    ) {
        // ─── Header ───
        item {
            Column {
                Text(
                    "الإعدادات",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = PosColors.Slate900,
                )
                Text(
                    "إدارة الجهاز والاتصالات والطباعة",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF64748B),
                )
            }
        }

        // ─── User Info ───
        item {
            DarkSection(title = "المستخدم", icon = Icons.Outlined.DevicesOther, iconColor = VioletMain) {
                DarkInfoRow("البريد الإلكتروني", prefs.userEmail ?: "-")
                DarkInfoRow("الاسم", prefs.userDisplayName ?: "-")
                DarkInfoRow("الصلاحيات", prefs.userRoles ?: "-")
            }
        }

        // ─── Device Info ───
        item {
            DarkSection(title = "معلومات الجهاز", icon = Icons.Outlined.DevicesOther, iconColor = CyanMain) {
                DarkInfoRow("معرّف الجهاز", prefs.deviceId ?: "غير مسجل")
                DarkInfoRow("كود الجهاز", prefs.deviceCode)
                DarkInfoRow("المنصة", "Android POS")
                DarkInfoRow("الإصدار", "1.0.0")
            }
        }

        // ─── API Configuration ───
        item {
            DarkSection(title = "إعدادات الاتصال", icon = Icons.Outlined.Language, iconColor = CyanMain) {
                if (isEditing) {
                    DarkTextField("رابط الـ API", apiUrl)          { apiUrl = it }
                    DarkTextField("معرّف الفرع", branchId)         { branchId = it }
                    DarkTextField("معرّف المنظمة", orgId)          { orgId = it }
                    DarkTextField("كود الجهاز", deviceCode)        { deviceCode = it }
                } else {
                    DarkInfoRow("رابط الـ API", prefs.apiBaseUrl)
                    DarkInfoRow("معرّف الفرع", prefs.branchId)
                    DarkInfoRow("معرّف المنظمة", prefs.organizationId)
                }

                Spacer(Modifier.height(14.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DarkOutlineButton(
                        modifier = Modifier.weight(1f),
                        label = if (isEditing) "إخفاء" else "تعديل",
                        icon = Icons.Outlined.Edit,
                        onClick = { isEditing = !isEditing },
                    )
                    // Register device button
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Brush.horizontalGradient(listOf(VioletMain, Color(0xFF8B5CF6)))),
                        contentAlignment = Alignment.Center,
                    ) {
                        Button(
                            onClick = { cashierVm.registerDevice(apiUrl, branchId, orgId, deviceCode) },
                            modifier = Modifier.fillMaxSize(),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        ) {
                            Icon(Icons.Outlined.Save, null, Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("تسجيل الجهاز", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }

        // ─── Sync ───
        item {
            DarkSection(title = "المزامنة", icon = Icons.Outlined.CloudSync, iconColor = VioletMain) {
                DarkInfoRow("حالة المزامنة", cashierVm.message)

                Spacer(Modifier.height(14.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    DarkOutlineButton(
                        modifier = Modifier.weight(1f),
                        label = "تحميل القائمة",
                        icon = Icons.Outlined.Refresh,
                        onClick = { cashierVm.loadSnapshot() },
                    )
                    DarkFilledButton(
                        modifier = Modifier.weight(1f),
                        label = "مزامنة الآن",
                        icon = Icons.Outlined.Sync,
                        color = VioletMain,
                        onClick = { cashierVm.syncNow(context) },
                    )
                }
            }
        }

        // ─── Printer Settings ───
        item {
            DarkSection(title = "إعدادات الطباعة", icon = Icons.Outlined.Print, iconColor = AmberMain) {
                if (isEditing) {
                    DarkTextField("عنوان IP الطابعة", printerIp, KeyboardType.Uri) { printerIp = it; prefs.printerIp = it }
                    DarkTextField("المنفذ", printerPort, KeyboardType.Number)      { printerPort = it; prefs.printerPort = it }
                    DarkTextField("عرض الورق (مم)", paperWidth, KeyboardType.Number) { paperWidth = it; prefs.paperWidth = it }
                } else {
                    DarkInfoRow("عنوان IP الطابعة", printerIp)
                    DarkInfoRow("المنفذ", printerPort)
                    DarkInfoRow("عرض الورق", "$paperWidth مم")
                }

                Spacer(Modifier.height(10.dp))

                DarkToggleRow("طباعة فاتورة تلقائية", autoPrintReceipt) {
                    autoPrintReceipt = it; prefs.autoPrintReceipt = it
                }
                DarkToggleRow("طباعة تذكرة مطبخ تلقائية", autoPrintKitchen) {
                    autoPrintKitchen = it; prefs.autoPrintKitchen = it
                }

                Spacer(Modifier.height(14.dp))

                DarkFilledButton(
                    modifier = Modifier.fillMaxWidth(),
                    label = "طباعة تجريبية",
                    icon = Icons.Outlined.Print,
                    color = AmberMain,
                    onClick = { cashierVm.message = "جاري اختبار الطابعة..." },
                )
            }
        }

        // ─── Stats ───
        item {
            DarkSection(title = "الإحصائيات", icon = Icons.Outlined.Info, iconColor = Color(0xFF64748B)) {
                DarkInfoRow("المنتجات المحمّلة", "${cashierVm.products.size}")
                DarkInfoRow("عناصر السلة", "${cashierVm.cartItemCount}")
            }
        }

        // ─── Logout ───
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, DangerMain.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                    .background(DangerMain.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center,
            ) {
                Button(
                    onClick = { authVm.logout() },
                    modifier = Modifier.fillMaxSize(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                ) {
                    Icon(Icons.Outlined.Logout, null, Modifier.size(18.dp), tint = DangerMain)
                    Spacer(Modifier.width(8.dp))
                    Text("تسجيل الخروج", fontWeight = FontWeight.SemiBold, color = DangerMain)
                }
            }
        }
    }
}

/* ─── Dark Section Card ─── */

@Composable
private fun DarkSection(
    title: String,
    icon: ImageVector,
    iconColor: Color,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Surface1)
            .border(1.dp, GhostBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(iconColor.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, Modifier.size(20.dp), tint = iconColor)
            }
            Spacer(Modifier.width(10.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = PosColors.Slate900)
        }

        Spacer(Modifier.height(14.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(GhostBorder))
        Spacer(Modifier.height(14.dp))

        content()
    }
}

/* ─── Info Row ─── */

@Composable
private fun DarkInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF64748B))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = Color(0xFFE2E8F0))
    }
}

/* ─── Dark Text Field ─── */

@Composable
private fun DarkTextField(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    onValueChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = Color(0xFF64748B)) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        shape = RoundedCornerShape(10.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = GhostBorder,
            focusedBorderColor = VioletMain,
            focusedTextColor = PosColors.Slate900,
            unfocusedTextColor = Color(0xFFCBD5E1),
            cursorColor = VioletMain,
            focusedContainerColor = Surface2,
            unfocusedContainerColor = Surface2,
        ),
    )
}

/* ─── Toggle Row ─── */

@Composable
private fun DarkToggleRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFCBD5E1))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = VioletMain,
                uncheckedThumbColor = Color(0xFF64748B),
                uncheckedTrackColor = Surface2,
                uncheckedBorderColor = GhostBorder,
            ),
        )
    }
}

/* ─── Outline Button ─── */

@Composable
private fun DarkOutlineButton(
    modifier: Modifier = Modifier,
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(10.dp))
            .border(1.dp, GhostBorder, RoundedCornerShape(10.dp))
            .background(Color(0x14FFFFFF)),
        contentAlignment = Alignment.Center,
    ) {
        Button(
            onClick = onClick,
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
        ) {
            Icon(icon, null, Modifier.size(16.dp), tint = Color(0xFFCBD5E1))
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 14.sp, color = Color(0xFFCBD5E1))
        }
    }
}

/* ─── Filled Button ─── */

@Composable
private fun DarkFilledButton(
    modifier: Modifier = Modifier,
    label: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(color.copy(alpha = 0.85f)),
        contentAlignment = Alignment.Center,
    ) {
        Button(
            onClick = onClick,
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
        ) {
            Icon(icon, null, Modifier.size(16.dp), tint = Color.White)
            Spacer(Modifier.width(6.dp))
            Text(label, fontWeight = FontWeight.SemiBold, color = Color.White)
        }
    }
}
