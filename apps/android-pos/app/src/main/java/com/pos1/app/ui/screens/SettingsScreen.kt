package com.pos1.app.ui.screens

import android.content.Context
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudSync
import androidx.compose.material.icons.outlined.DevicesOther
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pos1.app.PosApplication
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.AuthViewModel
import com.pos1.app.ui.viewmodel.CashierViewModel

/* ═══════════════════════════════════════════════════════════════
   Settings Screen — Device configuration, sync, printer
   ═══════════════════════════════════════════════════════════════ */

@Composable
fun SettingsScreen(
    cashierVm: CashierViewModel,
    authVm: AuthViewModel,
    context: Context,
) {
    val prefs = PosApplication.instance.securePrefs
    var isEditing by remember { mutableStateOf(false) }

    // Editable fields
    var apiUrl by remember { mutableStateOf(prefs.apiBaseUrl) }
    var branchId by remember { mutableStateOf(prefs.branchId) }
    var orgId by remember { mutableStateOf(prefs.organizationId) }
    var deviceCode by remember { mutableStateOf(prefs.deviceCode) }

    // Printer fields (persisted to SecurePrefs)
    var printerIp by remember { mutableStateOf(prefs.printerIp) }
    var printerPort by remember { mutableStateOf(prefs.printerPort) }
    var paperWidth by remember { mutableStateOf(prefs.paperWidth) }
    var autoPrintReceipt by remember { mutableStateOf(prefs.autoPrintReceipt) }
    var autoPrintKitchen by remember { mutableStateOf(prefs.autoPrintKitchen) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(bottom = 32.dp),
    ) {
        // ─── Header ───
        item {
            Text(
                "الإعدادات",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        }

        // ─── User Info ───
        item {
            SettingsSection(
                title = "المستخدم",
                icon = Icons.Outlined.DevicesOther,
                iconColor = PosColors.Brand600,
            ) {
                SettingsInfoRow("البريد الإلكتروني", prefs.userEmail ?: "-")
                SettingsInfoRow("الاسم", prefs.userDisplayName ?: "-")
                SettingsInfoRow("الصلاحيات", prefs.userRoles ?: "-")
            }
        }

        // ─── Device Info ───
        item {
            SettingsSection(
                title = "معلومات الجهاز",
                icon = Icons.Outlined.DevicesOther,
                iconColor = PosColors.Info,
            ) {
                SettingsInfoRow("معرّف الجهاز", prefs.deviceId ?: "غير مسجل")
                SettingsInfoRow("كود الجهاز", prefs.deviceCode)
                SettingsInfoRow("المنصة", "Android POS")
                SettingsInfoRow("الإصدار", "1.0.0")
            }
        }

        // ─── API Configuration ───
        item {
            SettingsSection(
                title = "إعدادات الاتصال",
                icon = Icons.Outlined.Language,
                iconColor = PosColors.Teal600,
            ) {
                if (isEditing) {
                    SettingsTextField("رابط الـ API", apiUrl) { apiUrl = it }
                    SettingsTextField("معرّف الفرع", branchId) { branchId = it }
                    SettingsTextField("معرّف المنظمة", orgId) { orgId = it }
                    SettingsTextField("كود الجهاز", deviceCode) { deviceCode = it }
                } else {
                    SettingsInfoRow("رابط الـ API", prefs.apiBaseUrl)
                    SettingsInfoRow("معرّف الفرع", prefs.branchId)
                    SettingsInfoRow("معرّف المنظمة", prefs.organizationId)
                }

                Spacer(Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { isEditing = !isEditing },
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        Icon(Icons.Outlined.Edit, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(if (isEditing) "إخفاء" else "تعديل")
                    }

                    Button(
                        onClick = {
                            cashierVm.registerDevice(apiUrl, branchId, orgId, deviceCode)
                        },
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                        ),
                    ) {
                        Icon(Icons.Outlined.Save, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("تسجيل الجهاز")
                    }
                }
            }
        }

        // ─── Sync ───
        item {
            SettingsSection(
                title = "المزامنة",
                icon = Icons.Outlined.CloudSync,
                iconColor = PosColors.Brand500,
            ) {
                Text(
                    "حالة المزامنة: ${cashierVm.message}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = PosColors.Slate600,
                )

                Spacer(Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { cashierVm.loadSnapshot() },
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        Icon(Icons.Outlined.Refresh, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("تحميل القائمة")
                    }

                    Button(
                        onClick = { cashierVm.syncNow(context) },
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PosColors.Brand600),
                    ) {
                        Icon(Icons.Outlined.Sync, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("مزامنة الآن")
                    }
                }
            }
        }

        // ─── Print Settings (persisted to SecurePrefs) ───
        item {
            SettingsSection(
                title = "إعدادات الطباعة",
                icon = Icons.Outlined.Print,
                iconColor = PosColors.Warning,
            ) {
                if (isEditing) {
                    SettingsTextField("عنوان IP الطابعة", printerIp) {
                        printerIp = it
                        prefs.printerIp = it
                    }
                    SettingsTextField("المنفذ", printerPort) {
                        printerPort = it
                        prefs.printerPort = it
                    }
                    SettingsTextField("عرض الورق (مم)", paperWidth) {
                        paperWidth = it
                        prefs.paperWidth = it
                    }
                } else {
                    SettingsInfoRow("عنوان IP الطابعة", printerIp)
                    SettingsInfoRow("المنفذ", printerPort)
                    SettingsInfoRow("عرض الورق", "$paperWidth مم")
                }

                Spacer(Modifier.height(8.dp))

                SettingsToggleRow("طباعة فاتورة تلقائية", autoPrintReceipt) {
                    autoPrintReceipt = it
                    prefs.autoPrintReceipt = it
                }
                SettingsToggleRow("طباعة تذكرة مطبخ تلقائية", autoPrintKitchen) {
                    autoPrintKitchen = it
                    prefs.autoPrintKitchen = it
                }

                Spacer(Modifier.height(12.dp))

                Button(
                    onClick = { cashierVm.message = "جاري اختبار الطابعة..." },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PosColors.Warning),
                ) {
                    Icon(Icons.Outlined.Print, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("طباعة تجريبية")
                }
            }
        }

        // ─── Stats ───
        item {
            SettingsSection(
                title = "الإحصائيات",
                icon = Icons.Outlined.Info,
                iconColor = PosColors.Slate500,
            ) {
                SettingsInfoRow("المنتجات المحمّلة", "${cashierVm.products.size}")
                SettingsInfoRow("عناصر السلة", "${cashierVm.cartItemCount}")
            }
        }
    }
}

/* ─── Section Card ─── */

@Composable
private fun SettingsSection(
    title: String,
    icon: ImageVector,
    iconColor: Color,
    content: @Composable () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = iconColor.copy(alpha = 0.1f),
                    modifier = Modifier.size(36.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, null, tint = iconColor, modifier = Modifier.size(20.dp))
                    }
                }
                Spacer(Modifier.width(10.dp))
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }

            Spacer(Modifier.height(14.dp))
            Divider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(Modifier.height(14.dp))

            content()
        }
    }
}

/* ─── Info Row ─── */

@Composable
private fun SettingsInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate500)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = PosColors.Slate800)
    }
}

/* ─── Text Field ─── */

@Composable
private fun SettingsTextField(label: String, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        shape = RoundedCornerShape(10.dp),
        colors = OutlinedTextFieldDefaults.colors(
            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
            focusedBorderColor = MaterialTheme.colorScheme.primary,
        ),
    )
}

/* ─── Toggle Row ─── */

@Composable
private fun SettingsToggleRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = PosColors.Slate600)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = MaterialTheme.colorScheme.onPrimary,
                checkedTrackColor = MaterialTheme.colorScheme.primary,
            ),
        )
    }
}
