"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Order {
  id: string;
  orderNo: string;
  type: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  customerName?: string;
  createdAt: string;
  table?: { code: string };
  branch?: { name: string; code: string };
  items: Array<{ id: string; itemNameAr: string; qty: string; lineTotal: string }>;
  payments: Array<{ method: string; amount: string; status: string }>;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "مسودة", color: "#64748b" },
  CONFIRMED: { label: "مؤكد", color: "#2563eb" },
  IN_KITCHEN: { label: "في المطبخ", color: "#d97706" },
  READY: { label: "جاهز", color: "#16a34a" },
  SERVED: { label: "تم التقديم", color: "#0891b2" },
  COMPLETED: { label: "مكتمل", color: "#059669" },
  CANCELLED: { label: "ملغي", color: "#dc2626" },
  REFUNDED: { label: "مسترجع", color: "#9333ea" },
};

const TYPE_MAP: Record<string, string> = {
  DINE_IN: "داخلي",
  TAKEAWAY: "سفري",
  PICKUP: "استلام",
  DELIVERY_PICKUP: "توصيل",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", branchId: "br_demo" });
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);
    const res = await apiFetch<any>(`/api/orders?${params}`);
    if (res.ok && res.data) {
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { fetchOrders(1); }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    await apiFetch(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    fetchOrders(pagination.page);
    setSelected(null);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>🛒 الطلبات</h1>
        <div className="pill">{pagination.total} طلب</div>
      </div>

      {/* Filters */}
      <div className="panel">
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <input className="field" style={{ flex: 1, minWidth: 180 }} placeholder="بحث بالرقم / الاسم / الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select" style={{ width: 140 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">كل الأنواع</option>
            {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ overflow: "auto" }}>
        {loading ? (
          <div className="empty-state">جارٍ التحميل...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            لا توجد طلبات
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>الطاولة</th>
                <th>الإجمالي</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const st = STATUS_MAP[o.status] ?? { label: o.status, color: "#666" };
                return (
                  <tr key={o.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{o.orderNo}</td>
                    <td>{TYPE_MAP[o.type] || o.type}</td>
                    <td><span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span></td>
                    <td>{o.table?.code || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{Number(o.totalAmount).toFixed(2)} ر.س</td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {new Date(o.createdAt).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => setSelected(o)}>تفاصيل</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-secondary" disabled={pagination.page <= 1} onClick={() => fetchOrders(pagination.page - 1)}>السابق</button>
            <span className="current">{pagination.page} / {pagination.totalPages}</span>
            <button className="btn btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchOrders(pagination.page + 1)}>التالي</button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 94vw)" }}>
            <h2>طلب {selected.orderNo}</h2>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <span className="pill">{TYPE_MAP[selected.type] || selected.type}</span>
              <span className="pill" style={{ color: STATUS_MAP[selected.status]?.color }}>{STATUS_MAP[selected.status]?.label}</span>
              {selected.table && <span className="pill">طاولة {selected.table.code}</span>}
            </div>

            <h3 style={{ fontSize: "0.95rem", margin: "8px 0" }}>الأصناف</h3>
            <table className="data-table" style={{ fontSize: "0.85rem" }}>
              <thead><tr><th>الصنف</th><th>الكمية</th><th>المجموع</th></tr></thead>
              <tbody>
                {selected.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.itemNameAr}</td>
                    <td>{Number(it.qty)}</td>
                    <td>{Number(it.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ margin: "10px 0", display: "grid", gap: 4, fontSize: "0.88rem" }}>
              <div className="row" style={{ justifyContent: "space-between" }}><span>المجموع</span><span>{Number(selected.subtotal).toFixed(2)} ر.س</span></div>
              <div className="row" style={{ justifyContent: "space-between" }}><span>الضريبة</span><span>{Number(selected.taxAmount).toFixed(2)} ر.س</span></div>
              {Number(selected.discountAmount) > 0 && <div className="row" style={{ justifyContent: "space-between" }}><span>الخصم</span><span style={{ color: "var(--danger)" }}>-{Number(selected.discountAmount).toFixed(2)} ر.س</span></div>}
              <div className="row" style={{ justifyContent: "space-between", fontWeight: 700, fontSize: "1rem" }}><span>الإجمالي</span><span>{Number(selected.totalAmount).toFixed(2)} ر.س</span></div>
            </div>

            {selected.payments.length > 0 && (
              <>
                <h3 style={{ fontSize: "0.95rem", margin: "8px 0" }}>المدفوعات</h3>
                {selected.payments.map((p, i) => (
                  <div key={i} className="pill" style={{ marginBottom: 4 }}>{p.method} — {Number(p.amount).toFixed(2)} ر.س ({p.status})</div>
                ))}
              </>
            )}

            <div className="modal-actions" style={{ flexWrap: "wrap" }}>
              {selected.status === "CONFIRMED" && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, "IN_KITCHEN")}>إرسال للمطبخ</button>}
              {selected.status === "IN_KITCHEN" && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, "READY")}>جاهز</button>}
              {selected.status === "READY" && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, "SERVED")}>تم التقديم</button>}
              {selected.status === "SERVED" && <button className="btn btn-primary" onClick={() => updateStatus(selected.id, "COMPLETED")}>مكتمل</button>}
              {!["CANCELLED", "COMPLETED", "REFUNDED"].includes(selected.status) && (
                <button className="btn btn-danger" onClick={() => { if (confirm("هل تريد إلغاء هذا الطلب؟")) updateStatus(selected.id, "CANCELLED"); }}>إلغاء الطلب</button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
