package com.pos1.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos1.app.ui.theme.PosColors
import com.pos1.app.ui.viewmodel.AuthViewModel

/* ═══════════════════════════════════════════════════════════════
   Login Screen – Ramotion Dark Premium
   ═══════════════════════════════════════════════════════════════ */

@Composable
fun LoginScreen(viewModel: AuthViewModel) {
    var showPassword by remember { mutableStateOf(false) }

    Row(modifier = Modifier.fillMaxSize()) {

        // ── Brand Panel ──────────────────────────────────────────
        Box(
            modifier = Modifier
                .weight(0.45f)
                .fillMaxHeight()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color(0xFF16094A),
                            Color(0xFF0A0520),
                            Color(0xFF060410),
                        ),
                        radius = 1400f,
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            // Ambient violet glow
            Box(
                modifier = Modifier
                    .offset(x = (-40).dp, y = (-120).dp)
                    .size(340.dp)
                    .blur(90.dp)
                    .background(PosColors.Violet600.copy(alpha = 0.20f), CircleShape)
            )
            // Ambient cyan glow
            Box(
                modifier = Modifier
                    .offset(x = 60.dp, y = 140.dp)
                    .size(260.dp)
                    .blur(70.dp)
                    .background(PosColors.Cyan500.copy(alpha = 0.12f), CircleShape)
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(28.dp),
                modifier = Modifier.padding(horizontal = 40.dp),
            ) {
                // Logo card
                Box {
                    // Glow halo
                    Box(
                        modifier = Modifier
                            .size(130.dp)
                            .blur(28.dp)
                            .background(PosColors.Violet600.copy(alpha = 0.25f), CircleShape)
                            .align(Alignment.Center)
                    )
                    Surface(
                        shape = RoundedCornerShape(28.dp),
                        color = Color.Transparent,
                        modifier = Modifier.size(96.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.linearGradient(
                                        listOf(PosColors.Violet600, Color(0xFF4C1D95))
                                    )
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Default.Storefront,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(46.dp),
                            )
                        }
                    }
                }

                // Title block
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "POS1",
                        style = MaterialTheme.typography.displayMedium.copy(
                            brush = Brush.linearGradient(listOf(Color.White, PosColors.Violet300))
                        ),
                        fontWeight = FontWeight.Black,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "نظام نقاط البيع المتكامل",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White.copy(alpha = 0.45f),
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(20.dp))
                    // Feature pills
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FeaturePill("فواتير ZATCA",   PosColors.Cyan500)
                        FeaturePill("شاشة KDS",       PosColors.Success)
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FeaturePill("إدارة الطاولات", PosColors.Amber500)
                        FeaturePill("تقارير لحظية",   PosColors.Violet400)
                    }
                }
            }
        }

        // ── Login Form Panel ─────────────────────────────────────
        Box(
            modifier = Modifier
                .weight(0.55f)
                .fillMaxHeight()
                .background(PosColors.Void),
            contentAlignment = Alignment.Center,
        ) {
            // Top-right glow
            Box(
                modifier = Modifier
                    .offset(x = 80.dp, y = (-100).dp)
                    .size(280.dp)
                    .blur(70.dp)
                    .background(PosColors.Violet600.copy(alpha = 0.07f), CircleShape)
                    .align(Alignment.TopEnd)
            )

            Column(
                modifier = Modifier.fillMaxHeight(),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(Modifier.height(1.dp))

                // ── Glass card ──
                Surface(
                    modifier = Modifier
                        .widthIn(max = 460.dp)
                        .padding(horizontal = 32.dp)
                        .border(1.dp, Color.Black.copy(alpha = 0.07f), RoundedCornerShape(28.dp)),
                    shape = RoundedCornerShape(28.dp),
                    color = PosColors.Surface,
                    shadowElevation = 32.dp,
                ) {
                    Column(
                        modifier = Modifier.padding(40.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(24.dp),
                    ) {
                        // Greeting
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "مرحباً بك 👋",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "سجّل دخولك للمتابعة",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.White.copy(alpha = 0.4f),
                            )
                        }

                        // Fields
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            // Email
                            DarkOutlinedTextField(
                                value      = viewModel.email,
                                onValueChange = { viewModel.email = it },
                                label      = "البريد الإلكتروني",
                                leadingIcon = { Icon(Icons.Default.Person, null, tint = PosColors.Slate400, modifier = Modifier.size(20.dp)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                            )

                            // Password
                            DarkOutlinedTextField(
                                value       = viewModel.password,
                                onValueChange = { viewModel.password = it },
                                label       = "كلمة المرور",
                                leadingIcon = { Icon(Icons.Default.Lock, null, tint = PosColors.Slate400, modifier = Modifier.size(20.dp)) },
                                trailingIcon = {
                                    IconButton(onClick = { showPassword = !showPassword }) {
                                        Icon(
                                            if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            null,
                                            tint = PosColors.Slate400,
                                            modifier = Modifier.size(20.dp),
                                        )
                                    }
                                },
                                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                keyboardOptions  = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                                keyboardActions  = KeyboardActions(onDone = { viewModel.login() }),
                            )

                            // Error
                            AnimatedVisibility(
                                visible = viewModel.errorMessage != null,
                                enter   = fadeIn() + slideInVertically(),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(PosColors.Danger.copy(alpha = 0.1f))
                                        .border(1.dp, PosColors.Danger.copy(alpha = 0.2f), RoundedCornerShape(10.dp))
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        viewModel.errorMessage ?: "",
                                        style     = MaterialTheme.typography.bodySmall,
                                        color     = PosColors.Danger,
                                        textAlign = TextAlign.Center,
                                        modifier  = Modifier.fillMaxWidth(),
                                    )
                                }
                            }

                            // CTA Button
                            Button(
                                onClick  = { viewModel.login() },
                                enabled  = !viewModel.isLoading,
                                modifier = Modifier.fillMaxWidth().height(54.dp),
                                shape    = RoundedCornerShape(14.dp),
                                colors   = ButtonDefaults.buttonColors(
                                    containerColor         = Color.Transparent,
                                    disabledContainerColor = Color.Transparent,
                                ),
                                contentPadding = PaddingValues(0.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            if (!viewModel.isLoading)
                                                Brush.horizontalGradient(listOf(PosColors.Violet600, Color(0xFF5B21B6)))
                                            else
                                                Brush.horizontalGradient(listOf(PosColors.Slate300, PosColors.Slate300)),
                                            RoundedCornerShape(14.dp),
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (viewModel.isLoading) {
                                        CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                                    } else {
                                        Text("تسجيل الدخول", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                        }
                    }
                }

                // Version
                Text(
                    "v1.0.0",
                    style = MaterialTheme.typography.labelSmall,
                    color = PosColors.Slate400,
                    modifier = Modifier.padding(bottom = 24.dp),
                )
            }
        }
    }
}

/* ── Feature pill ── */
@Composable
private fun FeaturePill(text: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.1f),
        modifier = Modifier.border(1.dp, color.copy(alpha = 0.22f), RoundedCornerShape(20.dp)),
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            style     = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color      = color,
        )
    }
}

/* ── Dark outlined text field ── */
@Composable
private fun DarkOutlinedTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    OutlinedTextField(
        value             = value,
        onValueChange     = onValueChange,
        label             = { Text(label) },
        leadingIcon       = leadingIcon,
        trailingIcon      = trailingIcon,
        singleLine        = true,
        visualTransformation = visualTransformation,
        keyboardOptions   = keyboardOptions,
        keyboardActions   = keyboardActions,
        shape             = RoundedCornerShape(12.dp),
        colors            = OutlinedTextFieldDefaults.colors(
            focusedBorderColor     = PosColors.Violet600,
            unfocusedBorderColor   = Color.Black.copy(alpha = 0.08f),
            focusedLabelColor      = PosColors.Violet600,
            unfocusedLabelColor    = PosColors.Slate500,
            cursorColor            = PosColors.Violet600,
            focusedTextColor       = PosColors.Slate900,
            unfocusedTextColor     = PosColors.Slate900,
            focusedContainerColor  = Color.Black.copy(alpha = 0.03f),
            unfocusedContainerColor = Color.Black.copy(alpha = 0.02f),
        ),
        modifier          = Modifier.fillMaxWidth(),
    )
}
