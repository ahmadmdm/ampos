import SwiftUI

struct PosColors {
    // Brand Cyan
    static let Brand50  = Color(hex: "ECFEFF")
    static let Brand100 = Color(hex: "CFFAFE")
    static let Brand200 = Color(hex: "A5F3FC")
    static let Brand300 = Color(hex: "67E8F9")
    static let Brand400 = Color(hex: "22D3EE")
    static let Brand500 = Color(hex: "0891B2")
    static let Brand600 = Color(hex: "0E7490")
    static let Brand700 = Color(hex: "155E75")
    static let Brand800 = Color(hex: "164E63")
    static let Brand900 = Color(hex: "083344")

    // Teal — Primary Action
    static let Teal50  = Color(hex: "F0FDFA")
    static let Teal100 = Color(hex: "CCFBF1")
    static let Teal200 = Color(hex: "99F6E4")
    static let Teal400 = Color(hex: "2DD4BF")
    static let Teal500 = Color(hex: "14B8A6")
    static let Teal600 = Color(hex: "0D9488")
    static let Teal700 = Color(hex: "0F766E")
    static let Teal800 = Color(hex: "115E59")

    // Neutral Slate
    static let Slate50  = Color(hex: "F8FAFC")
    static let Slate100 = Color(hex: "F1F5F9")
    static let Slate200 = Color(hex: "E2E8F0")
    static let Slate300 = Color(hex: "CBD5E1")
    static let Slate400 = Color(hex: "94A3B8")
    static let Slate500 = Color(hex: "64748B")
    static let Slate600 = Color(hex: "475569")
    static let Slate700 = Color(hex: "334155")
    static let Slate800 = Color(hex: "1E293B")
    static let Slate900 = Color(hex: "0F172A")

    // Semantic
    static let Success      = Color(hex: "16A34A")
    static let SuccessLight = Color(hex: "DCFCE7")
    static let SuccessBg    = Color(hex: "F0FDF4")

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
