import SwiftUI

// MARK: – Ramotion Light Premium Design System
struct PosColors {
    // ── Backgrounds (light) ──────────────────────────────────────
    static let Void        = Color(hex: "F4F6FF")   // lavender-tinted page background
    static let Surface     = Color(hex: "FFFFFF")   // white card
    static let SurfaceHigh = Color(hex: "F8F9FF")   // subtly elevated card
    static let SurfaceTop  = Color(hex: "EEF0FF")   // overlay / accent area
    static let Ghost       = Color.black.opacity(0.05)
    static let GhostActive = Color.black.opacity(0.10)

    // ── Violet – Primary Accent ──────────────────────────────────
    static let Violet300  = Color(hex: "C4B5FD")
    static let Violet400  = Color(hex: "A78BFA")
    static let Violet500  = Color(hex: "8B5CF6")
    static let Violet600  = Color(hex: "7C3AED")
    static let Violet700  = Color(hex: "6D28D9")
    static let VioletBg   = Color(hex: "EDE9FE")    // light violet tint area
    static let VioletGlow = Color(hex: "7C3AED").opacity(0.18)

    // ── Cyan – Secondary Accent ──────────────────────────────────
    static let Cyan400    = Color(hex: "22D3EE")
    static let Cyan500    = Color(hex: "06B6D4")
    static let CyanGlow   = Color(hex: "06B6D4").opacity(0.12)

    // ── Amber ────────────────────────────────────────────────────
    static let Amber400   = Color(hex: "FBBF24")
    static let Amber500   = Color(hex: "F59E0B")
    static let AmberText  = Color(hex: "D97706")    // deeper amber for light backgrounds

    // ── Brand Violet Scale ───────────────────────────────────────
    static let Brand50    = Color(hex: "FAF5FF")
    static let Brand100   = Color(hex: "F3E8FF")
    static let Brand200   = Color(hex: "E9D5FF")
    static let Brand300   = Color(hex: "D8B4FE")
    static let Brand400   = Color(hex: "A78BFA")
    static let Brand500   = Color(hex: "8B5CF6")
    static let Brand600   = Color(hex: "7C3AED")    // Primary CTA
    static let Brand700   = Color(hex: "6D28D9")
    static let Brand800   = Color(hex: "5B21B6")
    static let Brand900   = Color(hex: "4C1D95")

    // ── Teal ─────────────────────────────────────────────────────
    static let Teal50     = Color(hex: "F0FDFA")
    static let Teal100    = Color(hex: "CCFBF1")
    static let Teal200    = Color(hex: "99F6E4")
    static let Teal400    = Color(hex: "2DD4BF")
    static let Teal500    = Color(hex: "14B8A6")
    static let Teal600    = Color(hex: "0D9488")
    static let Teal700    = Color(hex: "0F766E")
    static let Teal800    = Color(hex: "115E59")

    // ── Slate (standard light scale) ─────────────────────────────
    static let Slate50    = Color(hex: "F8FAFC")
    static let Slate100   = Color(hex: "F1F5F9")
    static let Slate200   = Color(hex: "E2E8F0")
    static let Slate300   = Color(hex: "CBD5E1")
    static let Slate400   = Color(hex: "94A3B8")
    static let Slate500   = Color(hex: "64748B")
    static let Slate600   = Color(hex: "475569")
    static let Slate700   = Color(hex: "334155")
    static let Slate800   = Color(hex: "1E293B")
    static let Slate900   = Color(hex: "0F172A")    // primary text

    // ── Semantic (light-optimized) ───────────────────────────────
    static let Success      = Color(hex: "059669")
    static let SuccessLight = Color(hex: "D1FAE5")
    static let SuccessBg    = Color(hex: "ECFDF5")

    static let Warning      = Color(hex: "D97706")
    static let WarningLight = Color(hex: "FEF3C7")
    static let WarningBg    = Color(hex: "FFFBEB")

    static let Danger       = Color(hex: "DC2626")
    static let DangerLight  = Color(hex: "FEE2E2")
    static let DangerBg     = Color(hex: "FEF2F2")

    static let Info         = Color(hex: "2563EB")
    static let InfoLight    = Color(hex: "DBEAFE")
    static let InfoBg       = Color(hex: "EFF6FF")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
