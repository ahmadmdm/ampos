"use client";

import { useState, useEffect, useCallback } from "react";
import { API, apiFetch } from "../lib/api";

interface DailySale { date: string; orders: number; revenue: number; avgTicket: number }
interface TopProduct { nameAr: string; qty: number; revenue: number }
interface PaymentMethod { method: string; count: number; total: number }
interface OrderType { type: string; count: number }
interface Summary { totalOrders: number; totalRevenue: number; avgTicket: number; cancelRate: number }

const BRANCH = "br_demo";

const typeLabels: Record<string, string> = { DINE_IN: "داخلي", TAKEAWAY: "سفري", PICKUP: "استلام", DELIVERY_PICKUP: "توصيل" };
const methodLabels: Record<string, string> = { CASH: "نقدي", CARD: "بطاقة", APPLE_PAY: "Apple Pay", MADA: "مدى", ONLINE: "إلكتروني" };

export default function ReportsPage() {
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalOrders: 0, totalRevenue: 0, avgTicket: 0, cancelRate: 0 });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<any>(`/api/admin/reports?branchId=${BRANCH}&range=${range}`);
    if (res.ok && res.data) {
      setDailySales(res.data.dailySales ?? []);
      setTopProducts(res.data.topProducts ?? []);
      setPaymentMethods(res.data.paymentMethods ?? []);
      setOrderTypes(res.data.orderTypes ?? []);
      setSummary(res.data.summary ?? { totalOrders: 0, totalRevenue: 0, avgTicket: 0, cancelRate: 0 });
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const maxRevenue = Math.max(...dailySales.map((d) => d.revenue), 1);
  const maxProductRev = Math.max(...topProducts.map((p) => p.revenue), 1);

  function exportCSV() {
    window.open(`${API}/api/admin/reports/export?branchId=${BRANCH}&range=${range}&format=csv`, "_blank");
  }
  function exportJSON() {
    window.open(`${API}/api/admin/reports/export?branchId=${BRANCH}&range=${range}&format=json`, "_blank");
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📊 التقارير</h1>
        <div className="row" style={{ gap: 8 }}>
          {["today", "7d", "30d", "90d"].map((r) => (
            <button key={r} className={`btn ${range === r ? "btn-primary" : "btn-secondary"}`} onClick={() => setRange(r)}>
              {r === "today" ? "اليوم" : r === "7d" ? "7 أيام" : r === "30d" ? "30 يوم" : "90 يوم"}
            </button>
          ))}
          <span style={{ width: 1, height: 24, background: "#D1D5DB", margin: "0 4px" }} />
          <button className="btn btn-secondary" onClick={exportCSV}>📥 تصدير CSV</button>
          <button className="btn btn-secondary" onClick={exportJSON}>📥 JSON</button>
        </div>
      </div>

      {loading ? <div className="empty-state">جارٍ التحميل...</div> : (
        <>
          {/* Summary KPIs */}
          <div className="grid-auto">
            <div className="kpi">
              <div className="kpi-label">إجمالي الطلبات</div>
              <div className="kpi-value">{summary.totalOrders}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">إجمالي المبيعات</div>
              <div className="kpi-value">{summary.totalRevenue.toFixed(2)} <small>ر.س</small></div>
            </div>
            <div className="kpi">
              <div className="kpi-label">متوسط الفاتورة</div>
              <div className="kpi-value">{summary.avgTicket.toFixed(2)} <small>ر.س</small></div>
            </div>
            <div className="kpi">
              <div className="kpi-label">نسبة الإلغاء</div>
              <div className="kpi-value" style={{ color: summary.cancelRate > 5 ? "var(--danger)" : "var(--ok)" }}>{summary.cancelRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* Daily Sales Chart */}
          <div className="kpi" style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 16px" }}>المبيعات اليومية</h3>
            {dailySales.length === 0 ? <p style={{ color: "var(--muted)" }}>لا توجد بيانات</p> : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 180, padding: "0 4px" }}>
                {dailySales.map((d) => (
                  <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{d.revenue.toFixed(0)}</span>
                    <div style={{ width: "100%", maxWidth: 40, background: "var(--brand)", borderRadius: "4px 4px 0 0", height: `${(d.revenue / maxRevenue) * 140}px`, minHeight: 4, transition: "height 0.3s" }} />
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 44 }}>{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            {/* Top Products */}
            <div className="kpi">
              <h3 style={{ margin: "0 0 12px" }}>أكثر المنتجات مبيعًا</h3>
              {topProducts.length === 0 ? <p style={{ color: "var(--muted)" }}>لا توجد بيانات</p> : (
                <div className="stack" style={{ gap: 8 }}>
                  {topProducts.map((p, i) => (
                    <div key={i}>
                      <div className="row" style={{ justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                        <span><strong>{i + 1}.</strong> {p.nameAr}</span>
                        <span style={{ fontFamily: "monospace" }}>{p.revenue.toFixed(2)} ({p.qty}×)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB" }}>
                        <div style={{ height: "100%", width: `${(p.revenue / maxProductRev) * 100}%`, background: "var(--brand)", borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Methods + Order Types */}
            <div>
              <div className="kpi" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 12px" }}>طرق الدفع</h3>
                {paymentMethods.length === 0 ? <p style={{ color: "var(--muted)" }}>لا توجد بيانات</p> : (
                  <div className="stack" style={{ gap: 6 }}>
                    {paymentMethods.map((m) => (
                      <div key={m.method} className="row" style={{ justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>{methodLabels[m.method] ?? m.method}</span>
                        <span style={{ fontFamily: "monospace" }}>{m.total.toFixed(2)} ({m.count})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="kpi">
                <h3 style={{ margin: "0 0 12px" }}>أنواع الطلبات</h3>
                {orderTypes.length === 0 ? <p style={{ color: "var(--muted)" }}>لا توجد بيانات</p> : (
                  <div className="stack" style={{ gap: 6 }}>
                    {orderTypes.map((t) => (
                      <div key={t.type} className="row" style={{ justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>{typeLabels[t.type] ?? t.type}</span>
                        <span className="badge">{t.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
