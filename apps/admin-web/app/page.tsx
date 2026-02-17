"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "./lib/api";

type Branch = { id: string; code: string; name: string };
type Category = { id: string; nameAr: string; sortOrder: number; isActive: boolean };
type Product = { id: string; nameAr: string; basePrice: number; isActive: boolean; categoryId: string };
type PricingRule = { id: string; name: string; kind: string; value: number; isActive: boolean };
type Settings = {
  taxRateBps: number;
  serviceChargeBps: number;
  waiterCallCooldownSec: number;
  isQrOrderingEnabled: boolean;
  isWaiterCallEnabled: boolean;
  timezone: string;
  currency: string;
};
type Metric = {
  ordersCount: number;
  grossSales: number;
  waiterPending: number;
  kdsSlaBreaches: number;
};

export default function AdminDashboardPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [metrics, setMetrics] = useState<Metric | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [lowStock, setLowStock] = useState<Array<{ id: string; quantity: number; inventoryItem: { name: string } }>>([]);
  const [status, setStatus] = useState("جاهز للتشغيل");

  const [newCategory, setNewCategory] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("0");
  const [newProductCategoryId, setNewProductCategoryId] = useState("");

  useEffect(() => {
    apiFetch<Branch[]>("/api/admin/branches").then((r) => {
      const list = r.data ?? [];
      setBranches(list);
      if (list.length > 0) setBranchId(list[0].id);
    });
  }, []);

  async function fetchAll() {
    if (!branchId) return;
    try {
      const [m, s, c, p, r, ls] = await Promise.all([
        apiFetch<Metric>(`/api/metrics/summary?branchId=${branchId}`),
        apiFetch<Settings>(`/api/admin/branches/${branchId}/settings`),
        apiFetch<Category[]>(`/api/admin/branches/${branchId}/categories`),
        apiFetch<Product[]>(`/api/admin/branches/${branchId}/products`),
        apiFetch<PricingRule[]>(`/api/admin/branches/${branchId}/pricing-rules`),
        apiFetch<Array<{ id: string; quantity: number; inventoryItem: { name: string } }>>(`/api/admin/branches/${branchId}/inventory/low-stock`),
      ]);
      setMetrics(m.data ?? null);
      setSettings(s.data ?? null);
      setCategories(c.data ?? []);
      setProducts(p.data ?? []);
      setRules(r.data ?? []);
      setLowStock(ls.data ?? []);
      if (!newProductCategoryId && (c.data as Category[] | undefined)?.[0]?.id) setNewProductCategoryId(c.data![0].id);
      setStatus("تم تحديث بيانات لوحة الإدارة");
    } catch (e) {
      setStatus(`فشل التحديث: ${(e as Error).message}`);
    }
  }

  useEffect(() => {
    if (branchId) fetchAll();
  }, [branchId]);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive).length, [products]);

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await apiFetch(`/api/admin/branches/${branchId}/categories`, {
      method: "POST",
      body: JSON.stringify({ nameAr: newCategory.trim() }),
    });
    setNewCategory("");
    setStatus("تمت إضافة تصنيف جديد");
    fetchAll();
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    if (!newProductName.trim() || !newProductCategoryId) return;
    await apiFetch(`/api/admin/branches/${branchId}/products`, {
      method: "POST",
      body: JSON.stringify({ categoryId: newProductCategoryId, nameAr: newProductName.trim(), basePrice: Number(newProductPrice) }),
    });
    setNewProductName("");
    setNewProductPrice("0");
    setStatus("تمت إضافة منتج جديد");
    fetchAll();
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const res = await apiFetch(`/api/admin/branches/${branchId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
    setStatus(res.ok ? "تم حفظ إعدادات الفرع" : `فشل الحفظ: ${res.error ?? "UNKNOWN"}`);
    fetchAll();
  }

  const branchName = branches.find((b) => b.id === branchId)?.name ?? branchId;

  return (
    <div className="page">
      <section className="hero">
        <div className="brand-row">
          <div>
            <h1>لوحة إدارة POS1</h1>
            <p>إدارة التشغيل اليومي للفرع: مبيعات، كتالوج، تسعير، ومخزون</p>
          </div>
          <select className="select" style={{ width: "auto", minWidth: 160 }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
        </div>
        <div className="status" style={{ marginTop: 12 }}>{status}</div>
      </section>

      <section className="grid-auto">
        <article className="kpi"><div className="label">الطلبات خلال 24 ساعة</div><div className="value">{metrics?.ordersCount ?? 0}</div></article>
        <article className="kpi"><div className="label">إجمالي المبيعات</div><div className="value">{metrics?.grossSales ?? 0} ر.س</div></article>
        <article className="kpi"><div className="label">نداءات نادل مفتوحة</div><div className="value">{metrics?.waiterPending ?? 0}</div></article>
        <article className="kpi"><div className="label">تجاوز SLA للمطبخ</div><div className="value">{metrics?.kdsSlaBreaches ?? 0}</div></article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h3>⚙️ إعدادات الفرع</h3>
          {!settings ? <div className="pill">جار التحميل...</div> : (
            <form className="stack" onSubmit={saveSettings}>
              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>نسبة ضريبة القيمة المضافة</label>
                <div className="row" style={{ alignItems: "center", gap: 8 }}>
                  <input className="field" type="number" style={{ flex: 1 }} value={settings.taxRateBps} onChange={(e) => setSettings({ ...settings, taxRateBps: Number(e.target.value) })} />
                  <span className="pill" style={{ whiteSpace: "nowrap" }}>{(settings.taxRateBps / 100).toFixed(1)}%</span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>بنقاط الأساس — 1500 = 15% ضريبة</p>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>رسوم الخدمة</label>
                <div className="row" style={{ alignItems: "center", gap: 8 }}>
                  <input className="field" type="number" style={{ flex: 1 }} value={settings.serviceChargeBps} onChange={(e) => setSettings({ ...settings, serviceChargeBps: Number(e.target.value) })} />
                  <span className="pill" style={{ whiteSpace: "nowrap" }}>{(settings.serviceChargeBps / 100).toFixed(1)}%</span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>تُضاف على الإجمالي الفرعي — 500 = 5% خدمة — 0 لإلغائها</p>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>مهلة تبريد نداء النادل (ثانية)</label>
                <input className="field" type="number" value={settings.waiterCallCooldownSec} onChange={(e) => setSettings({ ...settings, waiterCallCooldownSec: Number(e.target.value) })} />
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>يمنع الزبون من إرسال نداء آخر قبل انتهاء هذه المدة</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--brand-500)" }} checked={settings.isQrOrderingEnabled} onChange={(e) => setSettings({ ...settings, isQrOrderingEnabled: e.target.checked })} />
                  <span><strong>الطلب عبر QR</strong> — يسمح للزبائن بمسح رمز QR على الطاولة وإرسال طلباتهم مباشرة</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--brand-500)" }} checked={settings.isWaiterCallEnabled} onChange={(e) => setSettings({ ...settings, isWaiterCallEnabled: e.target.checked })} />
                  <span><strong>نداء النادل</strong> — يسمح للزبائن بطلب نادل من شاشة QR وتظهر على شاشة النادل</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary">💾 حفظ الإعدادات</button>
            </form>
          )}
        </article>

        <article className="panel" style={{ background: "rgba(15,118,110,0.04)" }}>
          <h3>📖 كيف تعمل الإعدادات؟</h3>
          <div style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.9 }}>
            <p style={{ margin: "0 0 8px" }}><strong>حساب إجمالي الطلب:</strong></p>
            <div style={{ background: "var(--surface-solid)", borderRadius: 10, padding: "10px 14px", fontFamily: "monospace", fontSize: "0.82rem", marginBottom: 8 }}>
              الإجمالي = المجموع الفرعي + الضريبة + الخدمة − الخصومات
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 2 }}>
              <li><strong>الضريبة:</strong> تُحسب على المجموع الفرعي (سعر المنتجات). مثال: طلب 100 ر.س × 15% = 15 ر.س ضريبة</li>
              <li><strong>الخدمة:</strong> تُضاف بنفس الآلية. مثال: 100 ر.س × 5% = 5 ر.س خدمة</li>
              <li><strong>نقاط الأساس:</strong> 100 نقطة = 1%. اكتب 1500 لتعني 15%</li>
              <li><strong>QR:</strong> عند التفعيل، تُولّد روابط QR لكل طاولة. الزبون يمسح الرمز ويطلب من جواله</li>
              <li><strong>النداء:</strong> الزبون يضغط زر "أطلب نادل" من نفس شاشة QR</li>
            </ul>
          </div>
        </article>

        <article className="panel">
          <h3>إضافة تصنيف</h3>
          <form className="stack" onSubmit={createCategory}>
            <input className="field" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="اسم التصنيف" />
            <button type="submit" className="btn btn-primary">إضافة تصنيف</button>
          </form>
          <ul className="list" style={{ marginTop: 10 }}>{categories.map((c) => <li key={c.id}>{c.nameAr}</li>)}</ul>
        </article>

        <article className="panel">
          <h3>إضافة منتج</h3>
          <form className="stack" onSubmit={createProduct}>
            <input className="field" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="اسم المنتج" />
            <input className="field" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} type="number" placeholder="السعر" />
            <select className="select" value={newProductCategoryId} onChange={(e) => setNewProductCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
            <button type="submit" className="btn btn-primary">حفظ المنتج</button>
          </form>
          <p className="pill" style={{ marginTop: 10 }}>عدد المنتجات النشطة: {activeProducts}</p>
        </article>

        <article className="panel">
          <h3>💰 قواعد التسعير</h3>
          {rules.length === 0 ? (
            <span className="pill">لا توجد قواعد — أنشئ أول قاعدة</span>
          ) : (
            <ul className="list">{rules.map((r) => (
              <li key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{r.name}</span>
                <span className="role-chip">{r.kind === "PERCENT_DISCOUNT" ? `${r.value}%` : `${r.value} ر.س`}</span>
              </li>
            ))}</ul>
          )}
          <a href="/pricing" className="btn btn-secondary" style={{ marginTop: 10, display: "inline-block", textDecoration: "none" }}>إدارة التسعير ←</a>
        </article>

        <article className="panel">
          <h3>📦 تنبيهات المخزون المنخفض</h3>
          {lowStock.length === 0 ? <span className="pill">لا توجد تنبيهات ✅</span> : (
            <ul className="list">{lowStock.map((r) => (
              <li key={r.id} style={{ color: "var(--danger)" }}>⚠️ {r.inventoryItem.name}: {r.quantity}</li>
            ))}</ul>
          )}
          <a href="/inventory" className="btn btn-secondary" style={{ marginTop: 10, display: "inline-block", textDecoration: "none" }}>إدارة المخزون ←</a>
        </article>
      </section>
    </div>
  );
}
