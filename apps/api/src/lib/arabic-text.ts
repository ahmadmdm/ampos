/**
 * Arabic Text Reshaper for PDFKit
 *
 * PDFKit 0.17.x uses fontkit v2 which no longer performs Arabic Unicode shaping
 * (joining letters) automatically. This module pre-processes Arabic strings into
 * Unicode Presentation Forms-B (U+FE70–U+FEFF) so each letter renders in the
 * correct connected form (initial/medial/final/isolated), then reverses the
 * string for left-to-right rendering in PDFKit.
 *
 * Algorithm:
 *  1. Iterate each character in logical (right-to-left reading) order.
 *  2. Determine the correct form based on whether neighbours can "connect".
 *  3. Map to the Presentation Form-B Unicode codepoint.
 *  4. Reverse the reshaped array so PDFKit (LTR renderer) displays it correctly.
 *
 * No external dependencies — pure TypeScript/Node.js.
 */

// ── Arabic Presentation Forms-B map ──────────────────────────────────────────
// Value: [isolated, final, initial, medial]
const FORMS: Record<string, [string, string, string, string]> = {
  "\u0621": ["\uFE80", "\uFE80", "\uFE80", "\uFE80"], // ء
  "\u0622": ["\uFE81", "\uFE82", "\uFE81", "\uFE82"], // آ
  "\u0623": ["\uFE83", "\uFE84", "\uFE83", "\uFE84"], // أ
  "\u0624": ["\uFE85", "\uFE86", "\uFE85", "\uFE86"], // ؤ
  "\u0625": ["\uFE87", "\uFE88", "\uFE87", "\uFE88"], // إ
  "\u0626": ["\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"], // ئ
  "\u0627": ["\uFE8D", "\uFE8E", "\uFE8D", "\uFE8E"], // ا
  "\u0628": ["\uFE8F", "\uFE90", "\uFE91", "\uFE92"], // ب
  "\u0629": ["\uFE93", "\uFE94", "\uFE93", "\uFE94"], // ة
  "\u062A": ["\uFE95", "\uFE96", "\uFE97", "\uFE98"], // ت
  "\u062B": ["\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"], // ث
  "\u062C": ["\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"], // ج
  "\u062D": ["\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"], // ح
  "\u062E": ["\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"], // خ
  "\u062F": ["\uFEA9", "\uFEAA", "\uFEA9", "\uFEAA"], // د
  "\u0630": ["\uFEAB", "\uFEAC", "\uFEAB", "\uFEAC"], // ذ
  "\u0631": ["\uFEAD", "\uFEAE", "\uFEAD", "\uFEAE"], // ر
  "\u0632": ["\uFEAF", "\uFEB0", "\uFEAF", "\uFEB0"], // ز
  "\u0633": ["\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"], // س
  "\u0634": ["\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"], // ش
  "\u0635": ["\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"], // ص
  "\u0636": ["\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"], // ض
  "\u0637": ["\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"], // ط
  "\u0638": ["\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"], // ظ
  "\u0639": ["\uFEC9", "\uFECA", "\uFECB", "\uFECC"], // ع
  "\u063A": ["\uFECD", "\uFECE", "\uFECF", "\uFED0"], // غ
  "\u0641": ["\uFED1", "\uFED2", "\uFED3", "\uFED4"], // ف
  "\u0642": ["\uFED5", "\uFED6", "\uFED7", "\uFED8"], // ق
  "\u0643": ["\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"], // ك
  "\u0644": ["\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"], // ل
  "\u0645": ["\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"], // م
  "\u0646": ["\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"], // ن
  "\u0647": ["\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"], // ه
  "\u0648": ["\uFEED", "\uFEEE", "\uFEED", "\uFEEE"], // و
  "\u0649": ["\uFEEF", "\uFEF0", "\uFEEF", "\uFEF0"], // ى
  "\u064A": ["\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"], // ي
};

// Letters that do NOT extend a connection to the following (left-side) character.
// When these appear, the next letter starts fresh (isolated or initial form).
const DISCONNECTORS = new Set([
  "\u0621", // ء hamza
  "\u0622", "\u0623", "\u0624", "\u0625", "\u0627", // alef variants
  "\u0629", // ة teh marbuta
  "\u062F", // د dal
  "\u0630", // ذ thal
  "\u0631", // ر ra
  "\u0632", // ز zayn
  "\u0648", // و waw
  "\u0649", // ى alef maqsura
]);

/** Returns true if `c` is a recognised Arabic letter (has presentation forms). */
const isArabic = (c: string): boolean => c in FORMS;

/**
 * Whether the character at position i-1 (right neighbour) provides a connection
 * to the current character — i.e., it is Arabic AND not a disconnector.
 */
function hasRightConnection(chars: string[], i: number): boolean {
  if (i <= 0) return false;
  const prev = chars[i - 1];
  return isArabic(prev) && !DISCONNECTORS.has(prev);
}

/**
 * Whether the current character extends a connection to i+1 (left neighbour).
 * The current character must not be a disconnector, and the next must be Arabic.
 */
function hasLeftConnection(chars: string[], i: number): boolean {
  if (i >= chars.length - 1) return false;
  return !DISCONNECTORS.has(chars[i]) && isArabic(chars[i + 1]);
}

/**
 * Reshape and reverse an Arabic string for correct rendering in PDFKit (LTR).
 *
 * Pass the result directly to `doc.text()` with `{ align: "right" }`.
 */
export function reshapeArabic(text: string): string {
  const chars = Array.from(text);
  const out: string[] = new Array(chars.length);

  for (let i = 0; i < chars.length; i++) {
    const c      = chars[i];
    const forms  = FORMS[c];

    if (!forms) {
      // Non-Arabic character (space, digit, Latin) — keep as-is
      out[i] = c;
      continue;
    }

    const right = hasRightConnection(chars, i);
    const left  = hasLeftConnection(chars, i);

    if (right && left)       out[i] = forms[3]; // medial
    else if (right && !left) out[i] = forms[1]; // final
    else if (!right && left) out[i] = forms[2]; // initial
    else                     out[i] = forms[0]; // isolated
  }

  // Reverse for left-to-right rendering in PDFKit
  return out.reverse().join("");
}

/**
 * Returns true when the string contains any Arabic characters.
 * Use this to decide whether to apply reshaping.
 */
export function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFEFF]/.test(text);
}

/**
 * Prepare a string for PDFKit:
 *  - If it contains Arabic → reshape + reverse
 *  - Otherwise → return unchanged
 */
export function prepareText(text: string): string {
  return containsArabic(text) ? reshapeArabic(text) : text;
}
