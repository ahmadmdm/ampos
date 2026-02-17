package com.pos1.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import com.pos1.app.R

/* ═══════════════════════════════════════════════════════════════
   Color Tokens — matching the design spec exactly
   ═══════════════════════════════════════════════════════════════ */
object PosColors {
    // Brand Cyan
    val Brand50  = Color(0xFFECFEFF)
    val Brand100 = Color(0xFFCFFAFE)
    val Brand200 = Color(0xFFA5F3FC)
    val Brand300 = Color(0xFF67E8F9)
    val Brand400 = Color(0xFF22D3EE)
    val Brand500 = Color(0xFF0891B2)
    val Brand600 = Color(0xFF0E7490)
    val Brand700 = Color(0xFF155E75)
    val Brand800 = Color(0xFF164E63)
    val Brand900 = Color(0xFF083344)

    // Teal — Primary Action
    val Teal50  = Color(0xFFF0FDFA)
    val Teal100 = Color(0xFFCCFBF1)
    val Teal200 = Color(0xFF99F6E4)
    val Teal400 = Color(0xFF2DD4BF)
    val Teal500 = Color(0xFF14B8A6)
    val Teal600 = Color(0xFF0D9488)
    val Teal700 = Color(0xFF0F766E)
    val Teal800 = Color(0xFF115E59)

    // Neutral Slate
    val Slate50  = Color(0xFFF8FAFC)
    val Slate100 = Color(0xFFF1F5F9)
    val Slate200 = Color(0xFFE2E8F0)
    val Slate300 = Color(0xFFCBD5E1)
    val Slate400 = Color(0xFF94A3B8)
    val Slate500 = Color(0xFF64748B)
    val Slate600 = Color(0xFF475569)
    val Slate700 = Color(0xFF334155)
    val Slate800 = Color(0xFF1E293B)
    val Slate900 = Color(0xFF0F172A)

    // Semantic
    val Success      = Color(0xFF16A34A)
    val SuccessLight = Color(0xFFDCFCE7)
    val SuccessBg    = Color(0xFFF0FDF4)

    val Warning      = Color(0xFFD97706)
    val WarningLight = Color(0xFFFEF3C7)
    val WarningBg    = Color(0xFFFFFBEB)

    val Danger       = Color(0xFFDC2626)
    val DangerLight  = Color(0xFFFEE2E2)
    val DangerBg     = Color(0xFFFEF2F2)

    val Info         = Color(0xFF2563EB)
    val InfoLight    = Color(0xFFDBEAFE)
    val InfoBg       = Color(0xFFEFF6FF)

    // Category palette for product cards
    val CategoryPalette = listOf(
        Teal50,
        Color(0xFFFFFBEB),
        Color(0xFFF0F9FF),
        Color(0xFFFDF2F8),
        Color(0xFFF0FDF4),
        Color(0xFFFFF7ED),
        Color(0xFFEFF6FF),
        Color(0xFFFAF5FF),
    )
    val CategoryAccents = listOf(
        Teal500,
        Color(0xFFF59E0B),
        Color(0xFF0EA5E9),
        Color(0xFFEC4899),
        Color(0xFF22C55E),
        Color(0xFFF97316),
        Color(0xFF3B82F6),
        Color(0xFFA855F7),
    )
}

/* ═══════════════════════════════════════════════════════════════ */

private val LightColorScheme = lightColorScheme(
    primary            = PosColors.Brand600,
    onPrimary          = Color.White,
    primaryContainer   = PosColors.Brand100,
    onPrimaryContainer = PosColors.Brand900,
    secondary          = PosColors.Teal600,
    onSecondary        = Color.White,
    secondaryContainer = PosColors.Teal100,
    onSecondaryContainer = PosColors.Teal800,
    tertiary           = PosColors.Info,
    onTertiary         = Color.White,
    background         = PosColors.Slate50,
    onBackground       = PosColors.Slate900,
    surface            = Color.White,
    onSurface          = PosColors.Slate900,
    surfaceVariant     = PosColors.Slate100,
    onSurfaceVariant   = PosColors.Slate600,
    outline            = PosColors.Slate300,
    outlineVariant     = PosColors.Slate200,
    error              = PosColors.Danger,
    onError            = Color.White,
    errorContainer     = PosColors.DangerLight,
)

private val DarkColorScheme = darkColorScheme(
    primary            = PosColors.Brand400,
    onPrimary          = PosColors.Brand900,
    primaryContainer   = PosColors.Brand700,
    onPrimaryContainer = PosColors.Brand100,
    secondary          = PosColors.Teal400,
    onSecondary        = PosColors.Teal800,
    secondaryContainer = PosColors.Teal700,
    onSecondaryContainer = PosColors.Teal100,
    tertiary           = PosColors.Info,
    background         = Color(0xFF0B1120),
    onBackground       = PosColors.Slate100,
    surface            = Color(0xFF111827),
    onSurface          = PosColors.Slate100,
    surfaceVariant     = PosColors.Slate800,
    onSurfaceVariant   = PosColors.Slate400,
    outline            = PosColors.Slate600,
    outlineVariant     = PosColors.Slate700,
    error              = Color(0xFFEF4444),
    onError            = Color.White,
)

/* ═══════════════════════════════════════════════════════════════ */

val CairoFontFamily = FontFamily(
    Font(R.font.cairo_regular, FontWeight.Normal),
    Font(R.font.cairo_medium, FontWeight.Medium),
    Font(R.font.cairo_semibold, FontWeight.SemiBold),
    Font(R.font.cairo_bold, FontWeight.Bold),
    Font(R.font.cairo_extrabold, FontWeight.ExtraBold),
    Font(R.font.cairo_light, FontWeight.Light),
)

val PosTypography = Typography(
    displayLarge  = TextStyle(fontFamily = CairoFontFamily, fontSize = 36.sp, lineHeight = 44.sp, fontWeight = FontWeight.Bold),
    displayMedium = TextStyle(fontFamily = CairoFontFamily, fontSize = 30.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold),
    displaySmall  = TextStyle(fontFamily = CairoFontFamily, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
    headlineLarge = TextStyle(fontFamily = CairoFontFamily, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium = TextStyle(fontFamily = CairoFontFamily, fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
    headlineSmall = TextStyle(fontFamily = CairoFontFamily, fontSize = 18.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold),
    titleLarge    = TextStyle(fontFamily = CairoFontFamily, fontSize = 18.sp, lineHeight = 26.sp, fontWeight = FontWeight.Medium),
    titleMedium   = TextStyle(fontFamily = CairoFontFamily, fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium),
    titleSmall    = TextStyle(fontFamily = CairoFontFamily, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    bodyLarge     = TextStyle(fontFamily = CairoFontFamily, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium    = TextStyle(fontFamily = CairoFontFamily, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall     = TextStyle(fontFamily = CairoFontFamily, fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge    = TextStyle(fontFamily = CairoFontFamily, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    labelMedium   = TextStyle(fontFamily = CairoFontFamily, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
    labelSmall    = TextStyle(fontFamily = CairoFontFamily, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
)

val PosShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small      = RoundedCornerShape(8.dp),
    medium     = RoundedCornerShape(12.dp),
    large      = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

/* ═══════════════════════════════════════════════════════════════ */

@Composable
fun PosTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    MaterialTheme(
        colorScheme = colorScheme,
        typography  = PosTypography,
        shapes      = PosShapes,
        content     = content,
    )
}
