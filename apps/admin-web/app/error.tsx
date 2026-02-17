"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
      <h2 style={{ margin: "0 0 8px", color: "#991B1B", fontSize: "1.2rem" }}>حدث خطأ غير متوقع</h2>
      <p style={{ color: "#6B7280", fontSize: "0.9rem", marginBottom: 20 }}>{error.message || "يرجى المحاولة مرة أخرى"}</p>
      <button
        onClick={reset}
        style={{ padding: "10px 24px", borderRadius: 8, background: "#0E7490", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
