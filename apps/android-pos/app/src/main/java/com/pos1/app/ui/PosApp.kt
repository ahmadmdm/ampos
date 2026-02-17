package com.pos1.app.ui

import android.content.Context
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.RoomService
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.TableBar
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.RoomService
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.TableBar
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.pos1.app.PosApplication
import com.pos1.app.ui.screens.CashierScreen
import com.pos1.app.ui.screens.KdsScreen
import com.pos1.app.ui.screens.LoginScreen
import com.pos1.app.ui.screens.OrdersScreen
import com.pos1.app.ui.screens.SettingsScreen
import com.pos1.app.ui.screens.TablesScreen
import com.pos1.app.ui.screens.WaiterScreen
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.AuthViewModel
import com.pos1.app.ui.viewmodel.CashierViewModel
import com.pos1.app.ui.viewmodel.KdsViewModel
import com.pos1.app.ui.viewmodel.OrdersViewModel
import com.pos1.app.ui.viewmodel.TablesViewModel
import com.pos1.app.ui.viewmodel.WaiterViewModel
import kotlinx.coroutines.launch

/* ═══════════════════════════════════════════════════════════════
   Bottom Navigation
   ═══════════════════════════════════════════════════════════════ */

private enum class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector,
) {
    CASHIER("cashier", "نقاط البيع", Icons.Outlined.Storefront, Icons.Filled.Storefront),
    TABLES("tables", "الطاولات", Icons.Outlined.TableBar, Icons.Filled.TableBar),
    ORDERS("orders", "الطلبات", Icons.Outlined.Receipt, Icons.Filled.Receipt),
    KDS("kds", "المطبخ", Icons.Outlined.Restaurant, Icons.Filled.Restaurant),
    WAITER("waiter", "النادل", Icons.Outlined.RoomService, Icons.Filled.RoomService),
    SETTINGS("settings", "الإعدادات", Icons.Outlined.Settings, Icons.Filled.Settings),
}

/* ═══════════════════════════════════════════════════════════════
   Bottom Bar
   ═══════════════════════════════════════════════════════════════ */

@Composable
private fun PosBottomBar(
    navController: NavHostController,
    cartCount: Int = 0,
    waiterCallCount: Int = 0,
) {
    val current = navController.currentBackStackEntryAsState().value?.destination?.route

    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 4.dp,
        modifier = Modifier.shadow(8.dp),
    ) {
        BottomNavItem.entries.forEach { item ->
            val selected = current == item.route
            val badgeCount = when (item) {
                BottomNavItem.CASHIER -> cartCount
                BottomNavItem.WAITER -> waiterCallCount
                else -> 0
            }

            NavigationBarItem(
                selected = selected,
                onClick = {
                    if (current != item.route) {
                        navController.navigate(item.route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = {
                    if (badgeCount > 0) {
                        BadgedBox(badge = {
                            Badge(containerColor = PosColors.Danger) {
                                Text("$badgeCount", color = MaterialTheme.colorScheme.onError, fontSize = 10.sp)
                            }
                        }) {
                            Icon(
                                if (selected) item.selectedIcon else item.icon,
                                contentDescription = item.label,
                            )
                        }
                    } else {
                        Icon(
                            if (selected) item.selectedIcon else item.icon,
                            contentDescription = item.label,
                        )
                    }
                },
                label = {
                    Text(
                        item.label,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = PosColors.Slate400,
                    unselectedTextColor = PosColors.Slate400,
                ),
            )
        }
    }
}

/* ═══════════════════════════════════════════════════════════════
   Status Bar
   ═══════════════════════════════════════════════════════════════ */

@Composable
fun PosStatusBar(
    branchId: String,
    userName: String?,
    isOnline: Boolean = true,
    onLogout: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "POS1",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.width(12.dp))
            Text(
                branchId,
                style = MaterialTheme.typography.bodySmall,
                color = PosColors.Slate500,
            )
            if (!userName.isNullOrBlank()) {
                Spacer(Modifier.width(12.dp))
                Text(
                    "• $userName",
                    style = MaterialTheme.typography.bodySmall,
                    color = PosColors.Slate400,
                )
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(if (isOnline) PosColors.Success else PosColors.Danger)
            )
            Spacer(Modifier.width(6.dp))
            Text(
                if (isOnline) "متصل" else "غير متصل",
                style = MaterialTheme.typography.labelSmall,
                color = if (isOnline) PosColors.Success else PosColors.Danger,
            )
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onLogout, modifier = Modifier.size(32.dp)) {
                Icon(
                    Icons.Default.Logout,
                    contentDescription = "تسجيل الخروج",
                    tint = PosColors.Slate400,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════════
   Entry Point
   ═══════════════════════════════════════════════════════════════ */

@Composable
fun PosApp(applicationContext: Context) {
    val authViewModel: AuthViewModel = viewModel()
    val cashierViewModel: CashierViewModel = viewModel()
    val ordersViewModel: OrdersViewModel = viewModel()
    val tablesViewModel: TablesViewModel = viewModel()
    val kdsViewModel: KdsViewModel = viewModel()
    val waiterViewModel: WaiterViewModel = viewModel()

    val prefs = PosApplication.instance.securePrefs

    if (!authViewModel.isLoggedIn) {
        LoginScreen(authViewModel)
        return
    }

    val snackbarHostState = remember { SnackbarHostState() }
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()

    // Load data on first launch
    LaunchedEffect(Unit) {
        cashierViewModel.loadSnapshot()
    }

    // Show messages via snackbar
    LaunchedEffect(cashierViewModel.message) {
        if (cashierViewModel.message.isNotBlank()) {
            scope.launch { snackbarHostState.showSnackbar(cashierViewModel.message) }
        }
    }
    LaunchedEffect(ordersViewModel.message) {
        ordersViewModel.message?.let {
            scope.launch { snackbarHostState.showSnackbar(it) }
            ordersViewModel.message = null
        }
    }
    LaunchedEffect(tablesViewModel.message) {
        tablesViewModel.message?.let {
            scope.launch { snackbarHostState.showSnackbar(it) }
            tablesViewModel.message = null
        }
    }
    LaunchedEffect(waiterViewModel.message) {
        waiterViewModel.message?.let {
            scope.launch { snackbarHostState.showSnackbar(it) }
            waiterViewModel.message = null
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = PosColors.Slate800,
                    contentColor = PosColors.Slate50,
                    shape = MaterialTheme.shapes.medium,
                )
            }
        },
        bottomBar = {
            PosBottomBar(
                navController,
                cartCount = cashierViewModel.cartItemCount,
                waiterCallCount = waiterViewModel.waiterCalls.count { it.status == "CREATED" },
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            PosStatusBar(
                branchId = prefs.branchId,
                userName = prefs.userDisplayName,
                onLogout = { authViewModel.logout() },
            )

            NavHost(
                navController = navController,
                startDestination = "cashier",
                modifier = Modifier.fillMaxSize(),
                enterTransition = { fadeIn() },
                exitTransition = { fadeOut() },
            ) {
                composable("cashier") { CashierScreen(cashierViewModel) }
                composable("tables") { TablesScreen(tablesViewModel) }
                composable("orders") { OrdersScreen(ordersViewModel) }
                composable("kds") { KdsScreen(kdsViewModel) }
                composable("waiter") { WaiterScreen(waiterViewModel) }
                composable("settings") {
                    SettingsScreen(cashierViewModel, authViewModel, applicationContext)
                }
            }
        }
    }
}
