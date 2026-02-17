"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface Category { id: string; nameAr: string; nameEn?: string; sortOrder: number; isActive: boolean }
interface Variant { id: string; nameAr: string; nameEn?: string; priceDelta: number; isDefault: boolean }
interface ModifierGroup { id: string; nameAr: string; nameEn?: string; minSelect: number; maxSelect: number; isRequired: boolean; options: ModOption[] }
interface ModOption { id: string; nameAr: string; priceDelta: number; isActive: boolean }
interface Product { id: string; sku?: string; nameAr: string; nameEn?: string; descriptionAr?: string; descriptionEn?: string; basePrice: number; imageUrl?: string; isActive: boolean; requiresKitchen: boolean; categoryId: string; category?: Category; variants: Variant[] }

const BRANCH = "br_demo";

export default function ProductsPage() {
  const [tab, setTab] = useState<"products" | "categories" | "modifiers">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modGroups, setModGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // product form
  const [showProduct, setShowProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [pf, setPf] = useState({ nameAr: "", nameEn: "", basePrice: "", sku: "", categoryId: "", requiresKitchen: true, descriptionAr: "" });

  // category form
  const [showCat, setShowCat] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [cf, setCf] = useState({ nameAr: "", nameEn: "", sortOrder: "0" });

  // modifier group form
  const [showMod, setShowMod] = useState(false);
  const [editMod, setEditMod] = useState<ModifierGroup | null>(null);
  const [mf, setMf] = useState({ nameAr: "", nameEn: "", minSelect: "0", maxSelect: "1", isRequired: false, options: [{ nameAr: "", priceDelta: "0" }] as { nameAr: string; priceDelta: string }[] });

  // filters
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes, mRes] = await Promise.all([
      apiFetch<Product[]>(`/api/admin/branches/${BRANCH}/products`),
      apiFetch<Category[]>(`/api/admin/branches/${BRANCH}/categories`),
      apiFetch<ModifierGroup[]>(`/api/admin/branches/${BRANCH}/modifier-groups`),
    ]);
    if (pRes.ok && pRes.data) setProducts(pRes.data);
    if (cRes.ok && cRes.data) setCategories(cRes.data);
    if (mRes.ok && mRes.data) setModGroups(mRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ---------- PRODUCT LOGIC ---------- */
  function openCreateProduct() {
    setEditProduct(null);
    setPf({ nameAr: "", nameEn: "", basePrice: "", sku: "", categoryId: categories[0]?.id || "", requiresKitchen: true, descriptionAr: "" });
    setShowProduct(true);
  }
  function openEditProduct(p: Product) {
    setEditProduct(p);
    setPf({ nameAr: p.nameAr, nameEn: p.nameEn || "", basePrice: String(p.basePrice), sku: p.sku || "", categoryId: p.categoryId, requiresKitchen: p.requiresKitchen, descriptionAr: p.descriptionAr || "" });
    setShowProduct(true);
  }
  async function saveProduct() {
    const data: any = { nameAr: pf.nameAr, nameEn: pf.nameEn || undefined, basePrice: Number(pf.basePrice), sku: pf.sku || undefined, categoryId: pf.categoryId, requiresKitchen: pf.requiresKitchen, descriptionAr: pf.descriptionAr || undefined };
    if (editProduct) {
      await apiFetch(`/api/admin/branches/${BRANCH}/products/${editProduct.id}`, { method: "PATCH", body: JSON.stringify(data) });
    } else {
      await apiFetch(`/api/admin/branches/${BRANCH}/products`, { method: "POST", body: JSON.stringify(data) });
    }
    setShowProduct(false);
    fetchAll();
  }
  async function deleteProduct(id: string) {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
    await apiFetch(`/api/admin/branches/${BRANCH}/products/${id}`, { method: "DELETE" });
    fetchAll();
  }
  async function toggleProduct(p: Product) {
    await apiFetch(`/api/admin/branches/${BRANCH}/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !p.isActive }) });
    fetchAll();
  }

  /* ---------- CATEGORY LOGIC ---------- */
  function openCreateCat() { setEditCat(null); setCf({ nameAr: "", nameEn: "", sortOrder: "0" }); setShowCat(true); }
  function openEditCat(c: Category) { setEditCat(c); setCf({ nameAr: c.nameAr, nameEn: c.nameEn || "", sortOrder: String(c.sortOrder) }); setShowCat(true); }
  async function saveCat() {
    const data = { nameAr: cf.nameAr, nameEn: cf.nameEn || undefined, sortOrder: Number(cf.sortOrder) };
    if (editCat) {
      await apiFetch(`/api/admin/branches/${BRANCH}/categories/${editCat.id}`, { method: "PATCH", body: JSON.stringify(data) });
    } else {
      await apiFetch(`/api/admin/branches/${BRANCH}/categories`, { method: "POST", body: JSON.stringify(data) });
    }
    setShowCat(false);
    fetchAll();
  }
  async function deleteCat(id: string) {
    if (!confirm("هل تريد حذف هذا التصنيف؟")) return;
    await apiFetch(`/api/admin/branches/${BRANCH}/categories/${id}`, { method: "DELETE" });
    fetchAll();
  }

  /* ---------- MODIFIER GROUP LOGIC ---------- */
  function openCreateMod() { setEditMod(null); setMf({ nameAr: "", nameEn: "", minSelect: "0", maxSelect: "1", isRequired: false, options: [{ nameAr: "", priceDelta: "0" }] }); setShowMod(true); }
  function openEditMod(m: ModifierGroup) {
    setEditMod(m);
    setMf({
      nameAr: m.nameAr, nameEn: m.nameEn || "", minSelect: String(m.minSelect), maxSelect: String(m.maxSelect), isRequired: m.isRequired,
      options: m.options.map((o) => ({ nameAr: o.nameAr, priceDelta: String(o.priceDelta) })),
    });
    setShowMod(true);
  }
  async function saveMod() {
    const data = { nameAr: mf.nameAr, nameEn: mf.nameEn || undefined, minSelect: Number(mf.minSelect), maxSelect: Number(mf.maxSelect), isRequired: mf.isRequired, options: mf.options.filter((o) => o.nameAr).map((o) => ({ nameAr: o.nameAr, priceDelta: Number(o.priceDelta) })) };
    if (editMod) {
      await apiFetch(`/api/admin/branches/${BRANCH}/modifier-groups/${editMod.id}`, { method: "PATCH", body: JSON.stringify(data) });
    } else {
      await apiFetch(`/api/admin/branches/${BRANCH}/modifier-groups`, { method: "POST", body: JSON.stringify(data) });
    }
    setShowMod(false);
    fetchAll();
  }
  async function deleteMod(id: string) {
    if (!confirm("هل تريد حذف مجموعة التعديلات؟")) return;
    await apiFetch(`/api/admin/branches/${BRANCH}/modifier-groups/${id}`, { method: "DELETE" });
    fetchAll();
  }

  /* ---------- FILTER ---------- */
  let filteredProducts = products;
  if (filterCat) filteredProducts = filteredProducts.filter((p) => p.categoryId === filterCat);
  if (!showInactive) filteredProducts = filteredProducts.filter((p) => p.isActive);
  if (search) {
    const q = search.toLowerCase();
    filteredProducts = filteredProducts.filter((p) => p.nameAr.includes(q) || p.nameEn?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📦 المنتجات والتصنيفات</h1>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn${tab === "products" ? " active" : ""}`} onClick={() => setTab("products")}>المنتجات ({products.length})</button>
        <button className={`tab-btn${tab === "categories" ? " active" : ""}`} onClick={() => setTab("categories")}>التصنيفات ({categories.length})</button>
        <button className={`tab-btn${tab === "modifiers" ? " active" : ""}`} onClick={() => setTab("modifiers")}>مجموعات التعديلات ({modGroups.length})</button>
      </div>

      {loading ? <div className="empty-state">جارٍ التحميل...</div> : tab === "products" ? (
        /* -------- PRODUCTS TAB -------- */
        <>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <input className="search-bar" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
              <select className="select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ width: 160 }}>
                <option value="">كل التصنيفات</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                إظهار المعطّل
              </label>
            </div>
            <button className="btn btn-primary" onClick={openCreateProduct}>+ منتج جديد</button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📦</div>لا توجد منتجات</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>المنتج</th><th>SKU</th><th>السعر</th><th>التصنيف</th><th>المطبخ</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                    <td><strong>{p.nameAr}</strong>{p.nameEn ? <span className="badge">{p.nameEn}</span> : null}{p.variants.length > 0 ? <span className="badge">{p.variants.length} أحجام</span> : null}</td>
                    <td style={{ fontFamily: "monospace" }}>{p.sku || "—"}</td>
                    <td>{Number(p.basePrice).toFixed(2)} ر.س</td>
                    <td>{categories.find((c) => c.id === p.categoryId)?.nameAr || "—"}</td>
                    <td>{p.requiresKitchen ? "✅" : "❌"}</td>
                    <td><span className={`status-badge ${p.isActive ? "active" : "cancelled"}`}>{p.isActive ? "فعّال" : "معطّل"}</span></td>
                    <td className="actions-cell">
                      <button className="icon-btn" onClick={() => toggleProduct(p)}>{p.isActive ? "⏸" : "▶"}</button>
                      <button className="icon-btn" onClick={() => openEditProduct(p)}>✏️</button>
                      <button className="icon-btn danger" onClick={() => deleteProduct(p.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : tab === "categories" ? (
        /* -------- CATEGORIES TAB -------- */
        <>
          <div className="row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={openCreateCat}>+ تصنيف جديد</button>
          </div>
          {categories.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📂</div>لا توجد تصنيفات</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>الاسم</th><th>الاسم EN</th><th>الترتيب</th><th>المنتجات</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ opacity: c.isActive ? 1 : 0.5 }}>
                    <td><strong>{c.nameAr}</strong></td>
                    <td>{c.nameEn || "—"}</td>
                    <td>{c.sortOrder}</td>
                    <td>{products.filter((p) => p.categoryId === c.id).length}</td>
                    <td><span className={`status-badge ${c.isActive ? "active" : "cancelled"}`}>{c.isActive ? "فعّال" : "معطّل"}</span></td>
                    <td className="actions-cell">
                      <button className="icon-btn" onClick={() => openEditCat(c)}>✏️</button>
                      <button className="icon-btn danger" onClick={() => deleteCat(c.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        /* -------- MODIFIER GROUPS TAB -------- */
        <>
          <div className="row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={openCreateMod}>+ مجموعة تعديلات</button>
          </div>
          {modGroups.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔧</div>لا توجد مجموعات تعديلات</div>
          ) : (
            <div className="grid-auto">
              {modGroups.map((m) => (
                <div key={m.id} className="kpi" style={{ cursor: "pointer" }} onClick={() => openEditMod(m)}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{m.nameAr}</strong>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{m.isRequired ? "مطلوب" : "اختياري"}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
                    {m.minSelect}-{m.maxSelect} اختيار • {m.options.length} خيارات
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {m.options.map((o) => (
                      <span key={o.id} className="badge">{o.nameAr} {Number(o.priceDelta) > 0 ? `+${o.priceDelta}` : ""}</span>
                    ))}
                  </div>
                  <div className="actions-cell" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => openEditMod(m)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => deleteMod(m.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- PRODUCT MODAL ---------- */}
      {showProduct && (
        <div className="modal-overlay" onClick={() => setShowProduct(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2>{editProduct ? `تعديل ${editProduct.nameAr}` : "منتج جديد"}</h2>
            <div className="stack">
              <input className="field" placeholder="الاسم بالعربية *" value={pf.nameAr} onChange={(e) => setPf({ ...pf, nameAr: e.target.value })} />
              <input className="field" placeholder="الاسم بالإنجليزية" value={pf.nameEn} onChange={(e) => setPf({ ...pf, nameEn: e.target.value })} />
              <div className="row" style={{ gap: 8 }}>
                <input className="field" type="number" step="0.01" placeholder="السعر الأساسي *" value={pf.basePrice} onChange={(e) => setPf({ ...pf, basePrice: e.target.value })} style={{ flex: 1 }} />
                <input className="field" placeholder="SKU" value={pf.sku} onChange={(e) => setPf({ ...pf, sku: e.target.value })} style={{ flex: 1 }} />
              </div>
              <select className="select" value={pf.categoryId} onChange={(e) => setPf({ ...pf, categoryId: e.target.value })}>
                <option value="">اختر التصنيف</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
              <textarea className="field" placeholder="الوصف (اختياري)" rows={2} value={pf.descriptionAr} onChange={(e) => setPf({ ...pf, descriptionAr: e.target.value })} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                <input type="checkbox" checked={pf.requiresKitchen} onChange={(e) => setPf({ ...pf, requiresKitchen: e.target.checked })} />
                يحتاج مطبخ
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveProduct}>حفظ</button>
              <button className="btn btn-secondary" onClick={() => setShowProduct(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- CATEGORY MODAL ---------- */}
      {showCat && (
        <div className="modal-overlay" onClick={() => setShowCat(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editCat ? `تعديل ${editCat.nameAr}` : "تصنيف جديد"}</h2>
            <div className="stack">
              <input className="field" placeholder="الاسم بالعربية *" value={cf.nameAr} onChange={(e) => setCf({ ...cf, nameAr: e.target.value })} />
              <input className="field" placeholder="الاسم بالإنجليزية" value={cf.nameEn} onChange={(e) => setCf({ ...cf, nameEn: e.target.value })} />
              <input className="field" type="number" placeholder="الترتيب" value={cf.sortOrder} onChange={(e) => setCf({ ...cf, sortOrder: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveCat}>حفظ</button>
              <button className="btn btn-secondary" onClick={() => setShowCat(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- MODIFIER GROUP MODAL ---------- */}
      {showMod && (
        <div className="modal-overlay" onClick={() => setShowMod(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2>{editMod ? `تعديل ${editMod.nameAr}` : "مجموعة تعديلات جديدة"}</h2>
            <div className="stack">
              <input className="field" placeholder="الاسم بالعربية *" value={mf.nameAr} onChange={(e) => setMf({ ...mf, nameAr: e.target.value })} />
              <input className="field" placeholder="الاسم بالإنجليزية" value={mf.nameEn} onChange={(e) => setMf({ ...mf, nameEn: e.target.value })} />
              <div className="row" style={{ gap: 8 }}>
                <input className="field" type="number" placeholder="الحد الأدنى" value={mf.minSelect} onChange={(e) => setMf({ ...mf, minSelect: e.target.value })} style={{ flex: 1 }} />
                <input className="field" type="number" placeholder="الحد الأقصى" value={mf.maxSelect} onChange={(e) => setMf({ ...mf, maxSelect: e.target.value })} style={{ flex: 1 }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                <input type="checkbox" checked={mf.isRequired} onChange={(e) => setMf({ ...mf, isRequired: e.target.checked })} />
                مطلوب
              </label>
              <h4 style={{ margin: "8px 0 4px" }}>الخيارات</h4>
              {mf.options.map((opt, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <input className="field" placeholder="اسم الخيار" value={opt.nameAr} onChange={(e) => { const o = [...mf.options]; o[i] = { ...o[i], nameAr: e.target.value }; setMf({ ...mf, options: o }); }} style={{ flex: 2 }} />
                  <input className="field" type="number" step="0.01" placeholder="فرق السعر" value={opt.priceDelta} onChange={(e) => { const o = [...mf.options]; o[i] = { ...o[i], priceDelta: e.target.value }; setMf({ ...mf, options: o }); }} style={{ flex: 1 }} />
                  <button className="icon-btn danger" onClick={() => { const o = mf.options.filter((_, j) => j !== i); setMf({ ...mf, options: o }); }}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary" onClick={() => setMf({ ...mf, options: [...mf.options, { nameAr: "", priceDelta: "0" }] })}>+ خيار</button>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveMod}>حفظ</button>
              <button className="btn btn-secondary" onClick={() => setShowMod(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
