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
   Ramotion Light Premium Color System
   ═══════════════════════════════════════════════════════════════ */
object PosColors {
    // ── Backgrounds (light) ──────────────────────────────────────
    val Void        = Color(0xFFF4F6FF)   // lavender-tinted page background
    val Surface     = Color(0xFFFFFFFF)   // white card
    val SurfaceHigh = Color(0xFFF8F9FF)   // subtly elevated card
    val SurfaceTop  = Color(0xFFEEF0FF)   // overlay / accent area
    val Ghost       = Color(0x0D000000)   // black @ 5%
    val GhostActive = Color(0x1A000000)   // black @ 10%

    // ── Violet — Primary Accent ──────────────────────────────────
    val Violet300  = Color(0xFFC4B5FD)
    val Violet400  = Color(0xFFA78BFA)
    val Violet500  = Color(0xFF8B5CF6)
    val Violet600  = Color(0xFF7C3AED)
    val Violet700  = Color(0xFF6D28D9)
    val VioletBg   = Color(0xFFEDE9FE)    // light violet tint area
    val VioletGlow = Color(0x2E7C3AED)

    // ── Cyan — Secondary Accent ──────────────────────────────────
    val Cyan400    = Color(0xFF22D3EE)
    val Cyan500    = Color(0xFF06B6D4)

    // ── Amber ────────────────────────────────────────────────────
    val Amber400   = Color(0xFFFBBF24)
    val Amber500   = Color(0xFFF59E0B)
    val AmberText  = Color(0xFFD97706)

    // ── Brand Violet Scale ───────────────────────────────────────
    val Brand50    = Color(0xFFFAF5FF)
    val Brand100   = Color(0xFFF3E8FF)
    val Brand200   = Color(0xFFE9D5FF)
    val Brand300   = Color(0xFFD8B4FE)
    val Brand400   = Color(0xFFA78BFA)
    val Brand500   = Color(0xFF8B5CF6)
    val Brand600   = Color(0xFF7C3AED)    // Primary CTA
    val Brand700   = Color(0xFF6D28D9)
    val Brand800   = Color(0xFF5B21B6)
    val Brand900   = Color(0xFF4C1D95)

    // ── Teal ─────────────────────────────────────────────────────
    val Teal50     = Color(0xFFF0FDFA)
    val Teal100    = Color(0xFFCCFBF1)
    val Teal200    = Color(0xFF99F6E4)
    val Teal400    = Color(0xFF2DD4BF)
    val Teal500    = Color(0xFF14B8A6)
    val Teal600    = Color(0xFF0D9488)
    val Teal700    = Color(0xFF0F766E)
    val Teal800    = Color(0xFF115E59)

    // ── Slate (standard light scale) ─────────────────────────────
    val Slate50    = Color(0xFFF8FAFC)
    val Slate100   = Color(0xFFF1F5F9)
    val Slate200   = Color(0xFFE2E8F0)
    val Slate300   = Color(0xFFCBD5E1)
    val Slate400   = Color(0xFF94A3B8)
    val Slate500   = Color(0xFF64748B)
    val Slate600   = Color(0xFF475569)
    val Slate700   = Color(0xFF334155)
    val Slate800   = Color(0xFF1E293B)
    val Slate900   = Color(0xFF0F172A)    // primary text

    // ── Semantic (light-optimized) ───────────────────────────────
    val Success      = Color(0xFF059669)
    val SuccessLight = Color(0xFFD1FAE5)
    val SuccessBg    = Color(0xFFECFDF5)

    val Warning      = Color(0xFFD97706)
    val WarningLight = Color(0xFFFEF3C7)
    val WarningBg    = Color(0xFFFFFBEB)

    val Danger       = Color(0xFFDC2626)
    val DangerLight  = Color(0xFFFEE2E2)
    val DangerBg     = Color(0xFFFEF2F2)

    val Info         = Color(0xFF2563EB)
    val InfoLight    = Color(0xFFDBEAFE)
    val InfoBg       = Color(0xFFEFF6FF)

    // ── Category palette (light) ─────────────────────────────────
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

/* ═══════════════════════════════════════════════════════════════
   Light Color Scheme (default)
   ═══════════════════════════════════════════════════════════════ */

private val LightColorScheme = lightColorScheme(
    primary              = PosColors.Violet600,
    onPrimary            = Color.White,
    primaryContainer     = PosColors.VioletBg,
    onPrimaryContainer   = PosColors.Brand900,
    secondary            = PosColors.Cyan500,
    onSecondary          = Color.White,
    secondaryContainer   = PosColors.Teal100,
    onSecondaryContainer = PosColors.Teal800,
    tertiary             = PosColors.AmberText,
    onTertiary           = Color.White,
    background           = PosColors.Void,
    onBackground         = PosColors.Slate900,
    surface              = PosColors.Surface,
    onSurface            = PosColors.Slate900,
    surfaceVariant       = PosColors.Slate100,
    onSurfaceVariant     = PosColors.Slate600,
    outline              = PosColors.Slate300,
    outlineVariant       = PosColors.Slate200,
    error                = PosColors.Danger,
    onError              = Color.White,
    errorContainer       = PosColors.DangerLight,
    onErrorContainer     = PosColors.Danger,
)

private val DarkColorScheme = darkColorScheme(
    primary              = PosColors.Violet400,
    onPrimary            = Color.White,
    primaryContainer     = PosColors.Violet700,
    onPrimaryContainer   = PosColors.Violet300,
    secondary            = PosColors.Cyan400,
    onSecondary          = Color.White,
    secondaryContainer   = Color(0xFF042F2D),
    onSecondaryContainer = PosColors.Cyan400,
    tertiary             = PosColors.Amber500,
    onTertiary           = Color.White,
    background           = Color(0xFF070B16),
    onBackground         = PosColors.Slate900,
    surface              = Color(0xFF0C1220),
    onSurface            = PosColors.Slate900,
    surfaceVariant       = Color(0xFF111827),
    onSurfaceVariant     = PosColors.Slate400,
    outline              = Color(0x1AFFFFFF),
    outlineVariant       = Color(0x0DFFFFFF),
    error                = Color(0xFFEF4444),
    onError              = Color.White,
    errorContainer       = Color(0xFF2C0B0B),
    onErrorContainer     = Color(0xFFEF4444),
)

/* ═══════════════════════════════════════════════════════════════
   Typography — Cairo
   ═══════════════════════════════════════════════════════════════ */

val CairoFontFamily = FontFamily(
    Font(R.font.cairo_regular,   FontWeight.Normal),
    Font(R.font.cairo_medium,    FontWeight.Medium),
    Font(R.font.cairo_semibold,  FontWeight.SemiBold),
    Font(R.font.cairo_bold,      FontWeight.Bold),
    Font(R.font.cairo_extrabold, FontWeight.ExtraBold),
    Font(R.font.cairo_light,     FontWeight.Light),
)

val PosTypography = Typography(
    displayLarge   = TextStyle(fontFamily = CairoFontFamily, fontSize = 36.sp, lineHeight = 44.sp, fontWeight = FontWeight.Bold),
    displayMedium  = TextStyle(fontFamily = CairoFontFamily, fontSize = 30.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold),
    displaySmall   = TextStyle(fontFamily = CairoFontFamily, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold),
    headlineLarge  = TextStyle(fontFamily = CairoFontFamily, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium = TextStyle(fontFamily = CairoFontFamily, fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
    headlineSmall  = TextStyle(fontFamily = CairoFontFamily, fontSize = 18.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold),
    titleLarge     = TextStyle(fontFamily = CairoFontFamily, fontSize = 18.sp, lineHeight = 26.sp, fontWeight = FontWeight.Medium),
    titleMedium    = TextStyle(fontFamily = CairoFontFamily, fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium),
    titleSmall     = TextStyle(fontFamily = CairoFontFamily, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    bodyLarge      = TextStyle(fontFamily = CairoFontFamily, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontFamily = CairoFontFamily, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall      = TextStyle(fontFamily = CairoFontFamily, fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge     = TextStyle(fontFamily = CairoFontFamily, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    labelMedium    = TextStyle(fontFamily = CairoFontFamily, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
    labelSmall     = TextStyle(fontFamily = CairoFontFamily, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
)

val PosShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small      = RoundedCornerShape(8.dp),
    medium     = RoundedCornerShape(14.dp),
    large      = RoundedCornerShape(18.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

/* ═══════════════════════════════════════════════════════════════
   Theme Entry — light-first
   ═══════════════════════════════════════════════════════════════ */

@Composable
fun PosTheme(
    darkTheme: Boolean = false,   // light-first
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
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
