"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Branch = {
  id: string;
  code: string;
  name: string;
  currency: string;
  timezone: string;
  taxRateBps: number;
  serviceChargeBps: number;
  isQrOrderingEnabled: boolean;
  isWaiterCallEnabled: boolean;
  waiterCallCooldownSec: number;
  _count?: { tables: number; products: number; devices: number; orders: number };
};

const EMPTY: Omit<Branch, "id" | "_count"> = {
  code: "",
  name: "",
  currency: "SAR",
  timezone: "Asia/Riyadh",
  taxRateBps: 1500,
  serviceChargeBps: 0,
  isQrOrderingEnabled: false,
  isWaiterCallEnabled: false,
  waiterCallCooldownSec: 60,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    const res = await apiFetch<Branch[]>("/api/admin/branches");
    setBranches(res.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setForm({
      code: b.code,
      name: b.name,
      currency: b.currency,
      timezone: b.timezone,
      taxRateBps: b.taxRateBps,
      serviceChargeBps: b.serviceChargeBps,
      isQrOrderingEnabled: b.isQrOrderingEnabled,
      isWaiterCallEnabled: b.isWaiterCallEnabled,
      waiterCallCooldownSec: b.waiterCallCooldownSec,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;

    if (editing) {
      const res = await apiFetch(`/api/admin/branches/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? `تم تحديث الفرع "${form.name}"` : `خطأ: ${res.error}`);
    } else {
      const res = await apiFetch("/api/admin/branches", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? `تم إنشاء الفرع "${form.name}"` : `خطأ: ${res.error}`);
    }

    setShowModal(false);
    load();
  }

  async function handleDelete(b: Branch) {
    if (!confirm(`حذف الفرع "${b.name}"؟ لا يمكن التراجع`)) return;
    const res = await apiFetch(`/api/admin/branches/${b.id}`, { method: "DELETE" });
    setStatus(res.ok ? `تم حذف الفرع "${b.name}"` : `خطأ: ${res.error}`);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏢 إدارة الفروع</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ فرع جديد</button>
      </div>

      {status && <div className="status">{status}</div>}

      <div className="panel">
        {loading ? (
          <div className="pill">جار التحميل...</div>
        ) : branches.length === 0 ? (
          <div className="pill">لا توجد فروع — أنشئ فرعاً جديداً</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الاسم</th>
                <th>العملة</th>
                <th>الضريبة</th>
                <th>الخدمة</th>
                <th>الطاولات</th>
                <th>المنتجات</th>
                <th>الأجهزة</th>
                <th>الطلبات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.code}</strong></td>
                  <td>{b.name}</td>
                  <td>{b.currency}</td>
                  <td>{(b.taxRateBps / 100).toFixed(1)}%</td>
                  <td>{(b.serviceChargeBps / 100).toFixed(1)}%</td>
                  <td>{b._count?.tables ?? 0}</td>
                  <td>{b._count?.products ?? 0}</td>
                  <td>{b._count?.devices ?? 0}</td>
                  <td>{b._count?.orders ?? 0}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="icon-btn" onClick={() => openEdit(b)} title="تعديل">✏️</button>
                      <button className="icon-btn danger" onClick={() => handleDelete(b)} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `تعديل الفرع: ${editing.name}` : "إنشاء فرع جديد"}</h2>
            <form className="stack" onSubmit={handleSubmit}>
              <label>كود الفرع</label>
              <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="br_riyadh" required />

              <label>اسم الفرع</label>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="فرع الرياض" required />

              <div className="row">
                <div style={{ flex: 1 }}>
                  <label>العملة</label>
                  <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option value="SAR">ر.س (SAR)</option>
                    <option value="AED">د.إ (AED)</option>
                    <option value="KWD">د.ك (KWD)</option>
                    <option value="BHD">د.ب (BHD)</option>
                    <option value="QAR">ر.ق (QAR)</option>
                    <option value="OMR">ر.ع (OMR)</option>
                    <option value="EGP">ج.م (EGP)</option>
                    <option value="USD">$ (USD)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>المنطقة الزمنية</label>
                  <select className="select" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                    <option value="Asia/Riyadh">الرياض</option>
                    <option value="Asia/Dubai">دبي</option>
                    <option value="Asia/Kuwait">الكويت</option>
                    <option value="Asia/Bahrain">البحرين</option>
                    <option value="Asia/Qatar">قطر</option>
                    <option value="Asia/Muscat">مسقط</option>
                    <option value="Africa/Cairo">القاهرة</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div style={{ flex: 1 }}>
                  <label>نسبة الضريبة (نقاط أساس)</label>
                  <input className="field" type="number" value={form.taxRateBps} onChange={(e) => setForm({ ...form, taxRateBps: Number(e.target.value) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>نسبة الخدمة (نقاط أساس)</label>
                  <input className="field" type="number" value={form.serviceChargeBps} onChange={(e) => setForm({ ...form, serviceChargeBps: Number(e.target.value) })} />
                </div>
              </div>

              <label>مدة تبريد نداء النادل (ثانية)</label>
              <input className="field" type="number" value={form.waiterCallCooldownSec} onChange={(e) => setForm({ ...form, waiterCallCooldownSec: Number(e.target.value) })} />

              <div className="checkbox-group">
                <label>
                  <input type="checkbox" checked={form.isQrOrderingEnabled} onChange={(e) => setForm({ ...form, isQrOrderingEnabled: e.target.checked })} />
                  طلب عبر QR
                </label>
                <label>
                  <input type="checkbox" checked={form.isWaiterCallEnabled} onChange={(e) => setForm({ ...form, isWaiterCallEnabled: e.target.checked })} />
                  نداء النادل
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editing ? "حفظ التعديلات" : "إنشاء الفرع"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
