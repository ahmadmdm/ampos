"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Supplier = { id: string; name: string; phone?: string | null; _count?: { inventoryItems: number } };
type StockLevelBranch = { branchId: string; quantity: number; branch: { id: string; name: string; code: string } };
type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  reorderPoint: number | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
  stockLevels: StockLevelBranch[];
};
type Branch = { id: string; code: string; name: string };

const MOVEMENT_TYPES = [
  { value: "IN", label: "إدخال (شراء/استلام)", color: "var(--ok)" },
  { value: "OUT", label: "إخراج (استهلاك)", color: "var(--danger)" },
  { value: "ADJUSTMENT", label: "تعديل يدوي", color: "var(--warn)" },
  { value: "WASTE", label: "هالك/تالف", color: "var(--danger)" },
  { value: "TRANSFER", label: "تحويل بين فروع", color: "var(--brand-500)" },
];

const UNITS = ["كجم", "جرام", "لتر", "مل", "حبة", "علبة", "كرتون", "كيس"];

const EMPTY_ITEM = { sku: "", name: "", unit: "حبة", reorderPoint: "", supplierId: "" };
const EMPTY_MOVEMENT = { inventoryItemId: "", type: "IN" as string, quantity: "", reason: "", branchId: "" };
const EMPTY_SUPPLIER = { name: "", phone: "" };

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM });
  const [movementForm, setMovementForm] = useState({ ...EMPTY_MOVEMENT });
  const [supplierForm, setSupplierForm] = useState({ ...EMPTY_SUPPLIER });

  async function loadAll() {
    setLoading(true);
    const [i, s, b] = await Promise.all([
      apiFetch<InventoryItem[]>("/api/admin/inventory/items"),
      apiFetch<Supplier[]>("/api/admin/suppliers"),
      apiFetch<Branch[]>("/api/admin/branches"),
    ]);
    setItems(i.data ?? []);
    setSuppliers(s.data ?? []);
    setBranches(b.data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // ── Item CRUD ──
  function openCreateItem() {
    setEditingItem(null);
    setItemForm({ ...EMPTY_ITEM });
    setShowItemModal(true);
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      reorderPoint: item.reorderPoint?.toString() ?? "",
      supplierId: item.supplierId ?? "",
    });
    setShowItemModal(true);
  }

  async function handleItemSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itemForm.sku.trim() || !itemForm.name.trim()) { setStatus("❌ الكود والاسم مطلوبان"); return; }

    const payload = {
      sku: itemForm.sku.trim(),
      name: itemForm.name.trim(),
      unit: itemForm.unit,
      reorderPoint: itemForm.reorderPoint ? Number(itemForm.reorderPoint) : null,
      supplierId: itemForm.supplierId || null,
    };

    if (editingItem) {
      const res = await apiFetch(`/api/admin/inventory/items/${editingItem.id}`, {
        method: "PATCH", body: JSON.stringify(payload),
      });
      setStatus(res.ok ? `✅ تم تحديث "${payload.name}"` : `❌ ${res.error}`);
    } else {
      const res = await apiFetch("/api/admin/inventory/items", {
        method: "POST", body: JSON.stringify(payload),
      });
      setStatus(res.ok ? `✅ تمت إضافة "${payload.name}"` : `❌ ${res.error}`);
    }
    setShowItemModal(false);
    loadAll();
  }

  async function deleteItem(item: InventoryItem) {
    if (!confirm(`حذف "${item.name}"؟ سيتم حذف جميع حركات المخزون المرتبطة.`)) return;
    const res = await apiFetch(`/api/admin/inventory/items/${item.id}`, { method: "DELETE" });
    setStatus(res.ok ? `✅ تم حذف "${item.name}"` : `❌ ${res.error}`);
    loadAll();
  }

  // ── Stock Movement ──
  function openMovement(item?: InventoryItem) {
    setMovementForm({
      inventoryItemId: item?.id ?? "",
      type: "IN",
      quantity: "",
      reason: "",
      branchId: branches[0]?.id ?? "",
    });
    setShowMovementModal(true);
  }

  async function handleMovementSubmit(e: FormEvent) {
    e.preventDefault();
    if (!movementForm.inventoryItemId || !movementForm.quantity || !movementForm.branchId) {
      setStatus("❌ الصنف والكمية والفرع مطلوبة");
      return;
    }

    const res = await apiFetch(`/api/admin/branches/${movementForm.branchId}/inventory/movements`, {
      method: "POST",
      body: JSON.stringify({
        inventoryItemId: movementForm.inventoryItemId,
        type: movementForm.type,
        quantity: Number(movementForm.quantity),
        reason: movementForm.reason || undefined,
      }),
    });

    const itemName = items.find((i) => i.id === movementForm.inventoryItemId)?.name ?? "";
    const typeLabel = MOVEMENT_TYPES.find((t) => t.value === movementForm.type)?.label ?? "";
    setStatus(res.ok ? `✅ تم تسجيل حركة ${typeLabel} — ${itemName}: ${movementForm.quantity}` : `❌ ${res.error}`);
    setShowMovementModal(false);
    loadAll();
  }

  // ── Supplier ──
  async function handleSupplierSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;
    const res = await apiFetch("/api/admin/suppliers", {
      method: "POST",
      body: JSON.stringify({ name: supplierForm.name.trim(), phone: supplierForm.phone || undefined }),
    });
    setStatus(res.ok ? `✅ تمت إضافة المورد "${supplierForm.name}"` : `❌ ${res.error}`);
    setShowSupplierModal(false);
    setSupplierForm({ ...EMPTY_SUPPLIER });
    loadAll();
  }

  function totalStock(item: InventoryItem) {
    return item.stockLevels.reduce((sum, s) => sum + Number(s.quantity), 0);
  }

  function isLowStock(item: InventoryItem) {
    if (item.reorderPoint == null) return false;
    return totalStock(item) <= Number(item.reorderPoint);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📦 إدارة المخزون</h1>
        <div className="row" style={{ alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={() => setShowSupplierModal(true)}>+ مورد</button>
          <button className="btn btn-secondary" onClick={() => openMovement()}>+ حركة مخزون</button>
          <button className="btn btn-primary" onClick={openCreateItem}>+ صنف جديد</button>
        </div>
      </div>

      {/* شرح النظام */}
      <div className="panel" style={{ background: "rgba(15,118,110,0.06)", borderColor: "rgba(15,118,110,0.18)" }}>
        <h3 style={{ margin: "0 0 8px" }}>كيف يعمل نظام المخزون؟</h3>
        <ul style={{ margin: 0, paddingInlineStart: 20, color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.8 }}>
          <li><strong>الأصناف:</strong> أنشئ أصناف المخزون (مثال: حبوب قهوة، لحم برجر) مع وحدة القياس ونقطة إعادة الطلب</li>
          <li><strong>حركات المخزون:</strong> سجّل الإدخال (شراء)، الإخراج (استهلاك)، التعديل اليدوي، والهالك</li>
          <li><strong>نقطة إعادة الطلب:</strong> عندما ينزل الرصيد عنها يظهر تنبيه في لوحة التحكم</li>
          <li><strong>الموردون:</strong> اربط كل صنف بمورد لتسهيل المتابعة</li>
          <li><strong>المخزون لكل فرع:</strong> كمية كل صنف تُحسب بشكل مستقل لكل فرع</li>
        </ul>
      </div>

      {status && <div className="status">{status}</div>}

      {/* الموردون */}
      {suppliers.length > 0 && (
        <div className="panel">
          <h3 style={{ margin: "0 0 8px" }}>الموردون</h3>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {suppliers.map((s) => (
              <span key={s.id} className="branch-chip" style={{ fontSize: "0.84rem", padding: "4px 12px" }}>
                {s.name} {s.phone ? `(${s.phone})` : ""} — {s._count?.inventoryItems ?? 0} أصناف
              </span>
            ))}
          </div>
        </div>
      )}

      {/* جدول الأصناف */}
      <div className="panel">
        <h3 style={{ margin: "0 0 8px" }}>الأصناف ({items.length})</h3>
        {loading ? (
          <div className="pill">جار التحميل...</div>
        ) : items.length === 0 ? (
          <div className="pill">لا توجد أصناف — أنشئ صنفاً جديداً</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود (SKU)</th>
                <th>الاسم</th>
                <th>الوحدة</th>
                <th>المورد</th>
                <th>نقطة إعادة الطلب</th>
                <th>الرصيد الإجمالي</th>
                <th>الفروع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={isLowStock(item) ? { background: "rgba(220,38,38,0.06)" } : {}}>
                  <td><strong>{item.sku}</strong></td>
                  <td>
                    {item.name}
                    {isLowStock(item) && <span style={{ color: "var(--danger)", marginInlineStart: 6 }}>⚠️ منخفض</span>}
                  </td>
                  <td>{item.unit}</td>
                  <td>{item.supplier?.name ?? "—"}</td>
                  <td>{item.reorderPoint ?? "—"}</td>
                  <td><strong>{totalStock(item).toFixed(1)}</strong> {item.unit}</td>
                  <td>
                    {item.stockLevels.length === 0 ? "—" : item.stockLevels.map((s) => (
                      <span key={s.branchId} className="branch-chip">
                        {s.branch.name}: {Number(s.quantity).toFixed(1)}
                      </span>
                    ))}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="icon-btn" onClick={() => openMovement(item)} title="حركة مخزون">📥</button>
                      <button className="icon-btn" onClick={() => openEditItem(item)} title="تعديل">✏️</button>
                      <button className="icon-btn danger" onClick={() => deleteItem(item)} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: صنف جديد */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingItem ? `تعديل: ${editingItem.name}` : "إضافة صنف مخزون"}</h2>
            <form className="stack" onSubmit={handleItemSubmit}>
              <label>الكود (SKU)</label>
              <input className="field" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="COFFEE-BEANS" required />

              <label>اسم الصنف</label>
              <input className="field" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="حبوب قهوة" required />

              <div className="row">
                <div style={{ flex: 1 }}>
                  <label>وحدة القياس</label>
                  <select className="select" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>نقطة إعادة الطلب</label>
                  <input className="field" type="number" min="0" step="0.1" value={itemForm.reorderPoint} onChange={(e) => setItemForm({ ...itemForm, reorderPoint: e.target.value })} placeholder="10" />
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>تنبيه عند وصول الكمية لهذا الحد</p>
                </div>
              </div>

              <label>المورد</label>
              <select className="select" value={itemForm.supplierId} onChange={(e) => setItemForm({ ...itemForm, supplierId: e.target.value })}>
                <option value="">بدون مورد</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editingItem ? "حفظ" : "إضافة"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: حركة مخزون */}
      {showMovementModal && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>تسجيل حركة مخزون</h2>
            <form className="stack" onSubmit={handleMovementSubmit}>
              <label>الصنف</label>
              <select className="select" value={movementForm.inventoryItemId} onChange={(e) => setMovementForm({ ...movementForm, inventoryItemId: e.target.value })} required>
                <option value="">اختر صنفاً...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
              </select>

              <label>الفرع</label>
              <select className="select" value={movementForm.branchId} onChange={(e) => setMovementForm({ ...movementForm, branchId: e.target.value })} required>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>

              <label>نوع الحركة</label>
              <select className="select" value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}>
                {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <p style={{ margin: 0, fontSize: "0.8rem", color: MOVEMENT_TYPES.find((t) => t.value === movementForm.type)?.color ?? "var(--muted)" }}>
                {movementForm.type === "IN" && "يزيد الرصيد — استخدم عند استلام بضاعة من المورد"}
                {movementForm.type === "OUT" && "ينقص الرصيد — استخدم عند الاستهلاك اليدوي"}
                {movementForm.type === "ADJUSTMENT" && "يزيد الرصيد — استخدم لتصحيح الكمية بعد الجرد"}
                {movementForm.type === "WASTE" && "ينقص الرصيد — استخدم للأصناف التالفة أو المنتهية"}
                {movementForm.type === "TRANSFER" && "يزيد الرصيد — استخدم عند استلام تحويل من فرع آخر"}
              </p>

              <label>الكمية</label>
              <input className="field" type="number" min="0.001" step="0.001" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} placeholder="25" required />

              <label>السبب / الملاحظات (اختياري)</label>
              <input className="field" value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="استلام شحنة فاتورة #123" />

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">تسجيل الحركة</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMovementModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: مورد جديد */}
      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>إضافة مورد</h2>
            <form className="stack" onSubmit={handleSupplierSubmit}>
              <label>اسم المورد</label>
              <input className="field" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder="شركة التموين الحديثة" required />

              <label>رقم الجوال (اختياري)</label>
              <input className="field" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder="+966512345678" />

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">إضافة</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplierModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
