"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Branch = { id: string; code: string; name: string };
type PricingRule = {
  id: string;
  name: string;
  kind: string;
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

const KINDS = [
  { value: "FIXED_DISCOUNT", label: "خصم ثابت (ر.س)", desc: "مبلغ ثابت يُخصم من إجمالي الطلب" },
  { value: "PERCENT_DISCOUNT", label: "خصم نسبي (%)", desc: "نسبة مئوية تُخصم من إجمالي الطلب" },
];

const EMPTY = {
  name: "",
  kind: "FIXED_DISCOUNT",
  value: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

export default function PricingPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch<Branch[]>("/api/admin/branches").then((r) => {
      const list = r.data ?? [];
      setBranches(list);
      if (list.length > 0) setBranchId(list[0].id);
    });
  }, []);

  async function loadRules() {
    if (!branchId) return;
    setLoading(true);
    const res = await apiFetch<PricingRule[]>(`/api/admin/branches/${branchId}/pricing-rules`);
    setRules(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (branchId) loadRules(); }, [branchId]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  }

  function openEdit(r: PricingRule) {
    setEditing(r);
    setForm({
      name: r.name,
      kind: r.kind,
      value: r.value,
      isActive: r.isActive,
      startsAt: r.startsAt ? r.startsAt.slice(0, 16) : "",
      endsAt: r.endsAt ? r.endsAt.slice(0, 16) : "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.value <= 0) {
      setStatus("❌ الاسم والقيمة مطلوبة (القيمة أكبر من 0)");
      return;
    }

    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      value: form.value,
      isActive: form.isActive,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    };

    if (editing) {
      const res = await apiFetch(`/api/admin/branches/${branchId}/pricing-rules/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? `✅ تم تحديث "${form.name}"` : `❌ ${res.error}`);
    } else {
      const res = await apiFetch(`/api/admin/branches/${branchId}/pricing-rules`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? `✅ تمت إضافة "${form.name}"` : `❌ ${res.error}`);
    }
    setShowModal(false);
    loadRules();
  }

  async function handleDelete(r: PricingRule) {
    if (!confirm(`حذف قاعدة "${r.name}"؟`)) return;
    const res = await apiFetch(`/api/admin/branches/${branchId}/pricing-rules/${r.id}`, { method: "DELETE" });
    setStatus(res.ok ? `✅ تم حذف "${r.name}"` : `❌ ${res.error}`);
    loadRules();
  }

  async function toggleActive(r: PricingRule) {
    await apiFetch(`/api/admin/branches/${branchId}/pricing-rules/${r.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    loadRules();
  }

  function formatValue(r: PricingRule) {
    return r.kind === "PERCENT_DISCOUNT" ? `${r.value}%` : `${r.value} ر.س`;
  }

  function kindLabel(kind: string) {
    return KINDS.find((k) => k.value === kind)?.label ?? kind;
  }

  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";

  return (
    <div className="page">
      <div className="page-header">
        <h1>💰 قواعد التسعير</h1>
        <div className="row" style={{ alignItems: "center" }}>
          <select className="select" style={{ width: "auto", minWidth: 160 }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ قاعدة جديدة</button>
        </div>
      </div>

      {/* الشرح */}
      <div className="panel" style={{ background: "rgba(15,118,110,0.06)", borderColor: "rgba(15,118,110,0.18)" }}>
        <h3 style={{ margin: "0 0 8px" }}>كيف تعمل قواعد التسعير؟</h3>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.8 }}>
          <li><strong>خصم ثابت:</strong> يُخصم مبلغ محدد (مثلاً 10 ر.س) من إجمالي كل طلب</li>
          <li><strong>خصم نسبي:</strong> يُخصم نسبة مئوية (مثلاً 15%) من إجمالي كل طلب</li>
          <li>يمكنك تحديد <strong>تاريخ بداية ونهاية</strong> لجعل العرض مؤقتاً (مثال: عرض رمضان)</li>
          <li>القواعد <strong>النشطة فقط</strong> تُطبّق — يمكنك تعطيل قاعدة مؤقتاً بدون حذفها</li>
          <li>إذا وُجدت أكثر من قاعدة نشطة، تُجمع الخصومات حتى حد أقصى = إجمالي الطلب</li>
        </ul>
      </div>

      {status && <div className="status">{status}</div>}

      <div className="panel">
        {loading ? (
          <div className="pill">جار التحميل...</div>
        ) : rules.length === 0 ? (
          <div className="pill">لا توجد قواعد تسعير — أنشئ قاعدة جديدة</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>القيمة</th>
                <th>الحالة</th>
                <th>تاريخ البداية</th>
                <th>تاريخ النهاية</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} style={{ opacity: r.isActive ? 1 : 0.5 }}>
                  <td><strong>{r.name}</strong></td>
                  <td>{kindLabel(r.kind)}</td>
                  <td><span className="role-chip">{formatValue(r)}</span></td>
                  <td>
                    <span
                      className={r.isActive ? "status-active" : "status-suspended"}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleActive(r)}
                      title="انقر للتغيير"
                    >
                      {r.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td>{r.startsAt ? new Date(r.startsAt).toLocaleDateString("ar-SA") : "—"}</td>
                  <td>{r.endsAt ? new Date(r.endsAt).toLocaleDateString("ar-SA") : "—"}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="icon-btn" onClick={() => openEdit(r)} title="تعديل">✏️</button>
                      <button className="icon-btn danger" onClick={() => handleDelete(r)} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* مثال توضيحي */}
      <div className="panel">
        <h3 style={{ margin: "0 0 8px" }}>📋 مثال عملي</h3>
        <div style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 6px" }}>لإنشاء <strong>عرض "ساعة سعيدة"</strong> بخصم 10% على المشروبات يومياً من 3-5 مساءً:</p>
          <ol style={{ margin: 0, paddingInlineStart: 20 }}>
            <li>أنشئ قاعدة باسم "ساعة سعيدة - مشروبات"</li>
            <li>اختر النوع: <strong>خصم نسبي</strong></li>
            <li>القيمة: <strong>10</strong></li>
            <li>حدد تاريخ بداية ونهاية الفترة المطلوبة</li>
            <li>اترك الحالة <strong>"نشط"</strong></li>
          </ol>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `تعديل: ${editing.name}` : "إنشاء قاعدة تسعير جديدة"}</h2>
            <form className="stack" onSubmit={handleSubmit}>
              <label>اسم القاعدة</label>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عرض رمضان" required />

              <label>نوع الخصم</label>
              <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <p style={{ margin: "0", fontSize: "0.8rem", color: "var(--muted)" }}>
                {KINDS.find((k) => k.value === form.kind)?.desc}
              </p>

              <label>{form.kind === "PERCENT_DISCOUNT" ? "النسبة (%)" : "المبلغ (ر.س)"}</label>
              <input className="field" type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} required />

              <div className="row">
                <div style={{ flex: 1 }}>
                  <label>تاريخ البداية (اختياري)</label>
                  <input className="field" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>تاريخ النهاية (اختياري)</label>
                  <input className="field" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>اتركها فارغة لجعل القاعدة دائمة</p>

              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} style={{ accentColor: "var(--brand-500)" }} />
                نشطة (تُطبّق على الطلبات الجديدة)
              </label>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editing ? "حفظ التعديلات" : "إنشاء القاعدة"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
