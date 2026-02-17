"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface TableArea { id: string; nameAr: string; nameEn?: string; sortOrder: number }
interface TableItem { id: string; code: string; seats: number; isActive: boolean; tableAreaId?: string; area?: TableArea }

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editing, setEditing] = useState<TableItem | null>(null);
  const [form, setForm] = useState({ code: "", seats: "2", tableAreaId: "", isActive: true });
  const [areaForm, setAreaForm] = useState({ nameAr: "" });
  const [filterArea, setFilterArea] = useState("");

  const BRANCH = "br_demo";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<any>(`/api/admin/branches/${BRANCH}/tables`);
    if (res.ok && res.data) {
      setTables(res.data.tables);
      setAreas(res.data.areas);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ code: "", seats: "2", tableAreaId: "", isActive: true });
    setShowModal(true);
  }
  function openEdit(t: TableItem) {
    setEditing(t);
    setForm({ code: t.code, seats: String(t.seats), tableAreaId: t.tableAreaId || "", isActive: t.isActive });
    setShowModal(true);
  }

  async function saveTable() {
    const data = { code: form.code, seats: Number(form.seats), tableAreaId: form.tableAreaId || undefined, isActive: form.isActive };
    if (editing) {
      await apiFetch(`/api/admin/branches/${BRANCH}/tables/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) });
    } else {
      await apiFetch(`/api/admin/branches/${BRANCH}/tables`, { method: "POST", body: JSON.stringify(data) });
    }
    setShowModal(false);
    fetchData();
  }

  async function deleteTable(id: string) {
    if (!confirm("هل تريد حذف هذه الطاولة؟")) return;
    await apiFetch(`/api/admin/branches/${BRANCH}/tables/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function createArea() {
    if (!areaForm.nameAr) return;
    await apiFetch(`/api/admin/branches/${BRANCH}/table-areas`, { method: "POST", body: JSON.stringify(areaForm) });
    setShowAreaModal(false);
    setAreaForm({ nameAr: "" });
    fetchData();
  }

  const filtered = filterArea ? tables.filter((t) => t.tableAreaId === filterArea) : tables;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🪑 الطاولات</h1>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => setShowAreaModal(true)}>+ منطقة</button>
          <button className="btn btn-primary" onClick={openCreate}>+ طاولة جديدة</button>
        </div>
      </div>

      {/* Area filter */}
      <div className="tab-bar">
        <button className={`tab-btn${!filterArea ? " active" : ""}`} onClick={() => setFilterArea("")}>الكل ({tables.length})</button>
        {areas.map((a) => {
          const count = tables.filter((t) => t.tableAreaId === a.id).length;
          return <button key={a.id} className={`tab-btn${filterArea === a.id ? " active" : ""}`} onClick={() => setFilterArea(a.id)}>{a.nameAr} ({count})</button>;
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="empty-state">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🪑</div>لا توجد طاولات</div>
      ) : (
        <div className="grid-auto">
          {filtered.map((t) => (
            <div key={t.id} className="kpi" style={{ cursor: "pointer", border: t.isActive ? undefined : "1px dashed var(--danger)" }} onClick={() => openEdit(t)}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>{t.code}</span>
                <span style={{ color: t.isActive ? "var(--ok)" : "var(--danger)", fontSize: "0.8rem" }}>{t.isActive ? "فعّال" : "معطّل"}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
                {t.seats} مقاعد {t.area ? `• ${t.area.nameAr}` : ""}
              </div>
              <div className="actions-cell" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                <button className="icon-btn" onClick={() => openEdit(t)}>✏️</button>
                <button className="icon-btn danger" onClick={() => deleteTable(t.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `تعديل ${editing.code}` : "طاولة جديدة"}</h2>
            <div className="stack">
              <input className="field" placeholder="رمز الطاولة (مثل T1)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <input className="field" type="number" min="1" placeholder="عدد المقاعد" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
              <select className="select" value={form.tableAreaId} onChange={(e) => setForm({ ...form, tableAreaId: e.target.value })}>
                <option value="">بدون منطقة</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nameAr}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                فعّال
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveTable}>حفظ</button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Area modal */}
      {showAreaModal && (
        <div className="modal-overlay" onClick={() => setShowAreaModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>منطقة جديدة</h2>
            <input className="field" placeholder="اسم المنطقة (مثل الصالة الداخلية)" value={areaForm.nameAr} onChange={(e) => setAreaForm({ nameAr: e.target.value })} />
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={createArea}>إنشاء</button>
              <button className="btn btn-secondary" onClick={() => setShowAreaModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
