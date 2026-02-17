"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { io } from "socket.io-client";

const API = "http://localhost:3001";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001";
const BRANCH_ID = "br_demo";
const TABLE_ID = "tbl_demo_12";

type MenuItem = {
  id: string;
  nameAr: string;
  nameEn?: string;
  basePrice: number;
  imageUrl?: string;
  categoryId: string;
  descriptionAr?: string;
};
type Category = { id: string; nameAr: string; nameEn?: string; sortOrder: number };
type WaiterReason = "ASSISTANCE" | "WATER" | "BILL" | "OTHER";

export default function CustomerMenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState("all");
  const [cart, setCart] = useState<Array<MenuItem & { qty: number }>>([]);
  const [tableToken, setTableToken] = useState("");
  const [note, setNote] = useState("");
  const [waiterReason, setWaiterReason] = useState<WaiterReason>("ASSISTANCE");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("جاهز");
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showWaiter, setShowWaiter] = useState(false);
  const [showTracking, setShowTracking] = useState(false);

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.basePrice * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const filteredMenu = useMemo(() => {
    if (selectedCat === "all") return menu;
    return menu.filter((m) => m.categoryId === selectedCat);
  }, [menu, selectedCat]);

  async function loadTokenAndMenu() {
    setLoadingMenu(true);
    try {
      const tokenRes = await fetch(`${API}/api/customer/table-token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ branchId: BRANCH_ID, tableId: TABLE_ID }),
      }).then((r) => r.json());
      const token = tokenRes.data?.token ?? "";
      setTableToken(token);

      const menuRes = await fetch(
        `${API}/api/customer/menu?branchId=${BRANCH_ID}&tableId=${TABLE_ID}&token=${token}`
      ).then((r) => r.json());

      const cats: Category[] = (menuRes.data?.categories ?? []).map((c: any) => ({
        id: c.id,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        sortOrder: c.sortOrder ?? 0,
      }));
      setCategories(cats);

      const products = (menuRes.data?.products ?? []).map((p: any) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn ?? undefined,
        basePrice: Number(p.basePrice),
        imageUrl: p.imageUrl ?? undefined,
        categoryId: p.categoryId,
        descriptionAr: p.descriptionAr ?? undefined,
      }));
      setMenu(products);
      setStatusMessage(`تم تحميل ${products.length} منتج`);
    } catch (e) {
      setStatusMessage(`فشل تحميل القائمة: ${(e as Error).message}`);
    } finally {
      setLoadingMenu(false);
    }
  }

  useEffect(() => {
    loadTokenAndMenu();
  }, []);

  useEffect(() => {
    if (!trackingOrderId || !tableToken) return;
    const t = setInterval(async () => {
      const res = await fetch(
        `${API}/api/customer/orders/${trackingOrderId}/status?branchId=${BRANCH_ID}&tableId=${TABLE_ID}&token=${tableToken}`
      ).then((r) => r.json());
      setTrackingStatus(res.data?.status ?? "UNKNOWN");
    }, 4000);
    return () => clearInterval(t);
  }, [trackingOrderId, tableToken]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.emit("join-branch", BRANCH_ID);
    if (trackingOrderId) socket.emit("join-order", trackingOrderId);
    const onOrderStatus = (evt: { payload?: { orderId?: string; status?: string } }) => {
      if (evt?.payload?.orderId === trackingOrderId && evt.payload.status) {
        setTrackingStatus(evt.payload.status);
      }
    };
    socket.on("ORDER_STATUS_CHANGED", onOrderStatus);
    return () => {
      socket.off("ORDER_STATUS_CHANGED", onOrderStatus);
      socket.disconnect();
    };
  }, [trackingOrderId]);

  const add = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const found = prev.find((x) => x.id === item.id);
      if (found) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((x) => (x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x)).filter((x) => x.qty > 0)
    );
  }, []);

  async function payNow() {
    if (!cart.length) return;
    setStatusMessage("جار إنشاء جلسة الدفع...");
    const response = await fetch(`${API}/api/customer/checkout/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
        token: tableToken,
        provider: "moyasar",
        returnUrl: "http://localhost:3003",
        type: "DINE_IN",
        cart: cart.map((item) => ({
          productId: item.id,
          itemNameAr: item.nameAr,
          qty: item.qty,
          unitPrice: item.basePrice,
        })),
      }),
    });
    const payload = await response.json();
    const url = payload.data?.checkoutUrl ?? "";
    setCheckoutUrl(url);
    setStatusMessage(url ? "تم إنشاء جلسة الدفع بنجاح" : "تعذر إنشاء جلسة الدفع");
  }

  async function callWaiter() {
    const res = await fetch(`${API}/api/customer/waiter-calls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
        reason: waiterReason,
        note,
        token: tableToken,
      }),
    }).then((r) => r.json());
    setStatusMessage(res.ok ? "تم إرسال نداء النادل" : `فشل نداء النادل: ${res.error ?? "UNKNOWN"}`);
    if (res.ok) setShowWaiter(false);
  }

  async function requestBill() {
    const res = await fetch(`${API}/api/customer/request-bill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: BRANCH_ID,
        tableId: TABLE_ID,
        note: "يرجى إحضار الحساب",
        token: tableToken,
      }),
    }).then((r) => r.json());
    setStatusMessage(res.ok ? "تم طلب الحساب" : `فشل طلب الحساب: ${res.error ?? "UNKNOWN"}`);
  }

  const statusLabels: Record<string, string> = {
    DRAFT: "مسودة",
    CONFIRMED: "مؤكد",
    IN_KITCHEN: "في المطبخ",
    READY: "جاهز",
    SERVED: "تم التقديم",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغي",
    REFUNDED: "مسترد",
  };

  return (
    <div className="menu-root">
      {/* ═══ Top Navigation Bar ═══ */}
      <header className="menu-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-icon">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="brand-title">القائمة</h1>
              <p className="brand-sub">طاولة 12</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setShowTracking(true)} title="تتبع الطلب">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="icon-btn" onClick={() => setShowWaiter(true)} title="نداء النادل">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="cart-fab" onClick={() => setShowCart(true)}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Status Toast ═══ */}
      {statusMessage !== "جاهز" && (
        <div className="toast" onClick={() => setStatusMessage("جاهز")}>
          {statusMessage}
        </div>
      )}

      {/* ═══ Hero Banner ═══ */}
      <section className="menu-hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <h2>مرحباً بكم</h2>
          <p>اختر من قائمتنا المميزة واستمتع بتجربة طعام فريدة</p>
        </div>
      </section>

      {/* ═══ Category Tabs ═══ */}
      <nav className="cat-nav">
        <div className="cat-scroll">
          <button
            className={`cat-chip ${selectedCat === "all" ? "active" : ""}`}
            onClick={() => setSelectedCat("all")}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat-chip ${selectedCat === c.id ? "active" : ""}`}
              onClick={() => setSelectedCat(c.id)}
            >
              {c.nameAr}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══ Menu Grid ═══ */}
      <main className="menu-grid-wrap">
        {loadingMenu ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>جار تحميل القائمة...</p>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="empty-state">
            <svg width="56" height="56" fill="none" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".3"/></svg>
            <p>لا توجد منتجات في هذا التصنيف</p>
          </div>
        ) : (
          <div className="menu-grid">
            {filteredMenu.map((item) => (
              <article key={item.id} className="product-card" onClick={() => add(item)}>
                <div className="product-img-wrap">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.nameAr} className="product-img" loading="lazy" />
                  ) : (
                    <div className="product-img-placeholder">
                      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                  <button className="add-btn" onClick={(e) => { e.stopPropagation(); add(item); }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{item.nameAr}</h3>
                  {item.nameEn && <p className="product-name-en">{item.nameEn}</p>}
                  {item.descriptionAr && <p className="product-desc">{item.descriptionAr}</p>}
                  <div className="product-price">{item.basePrice.toFixed(2)} <span>ر.س</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Floating Cart Summary ═══ */}
      {cartCount > 0 && !showCart && (
        <div className="cart-float" onClick={() => setShowCart(true)}>
          <div className="cart-float-info">
            <span className="cart-float-count">{cartCount} عنصر</span>
            <span className="cart-float-total">{total.toFixed(2)} ر.س</span>
          </div>
          <span className="cart-float-label">عرض السلة</span>
        </div>
      )}

      {/* ═══ Cart Drawer ═══ */}
      {showCart && (
        <div className="drawer-overlay" onClick={() => setShowCart(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>سلة المشتريات</h2>
              <button className="drawer-close" onClick={() => setShowCart(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".35"/></svg>
                  <p>السلة فارغة</p>
                </div>
              ) : (
                <ul className="cart-list">
                  {cart.map((item) => (
                    <li key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-name">{item.nameAr}</span>
                        <span className="cart-item-price">{(item.basePrice * item.qty).toFixed(2)} ر.س</span>
                      </div>
                      <div className="cart-qty-controls">
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                        <span className="qty-val">{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cart.length > 0 && (
              <div className="drawer-footer">
                <div className="cart-total-row">
                  <span>الإجمالي</span>
                  <strong>{total.toFixed(2)} ر.س</strong>
                </div>
                <button className="btn-pay" onClick={payNow}>ادفع الآن</button>
                <button className="btn-bill" onClick={requestBill}>طلب الحساب</button>
                {checkoutUrl && (
                  <a href={checkoutUrl} target="_blank" rel="noreferrer" className="btn-checkout-link">
                    فتح صفحة الدفع ←
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Waiter Call Modal ═══ */}
      {showWaiter && (
        <div className="drawer-overlay" onClick={() => setShowWaiter(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>نداء النادل</h2>
              <button className="drawer-close" onClick={() => setShowWaiter(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="form-label">السبب</label>
              <div className="reason-chips">
                {([
                  { v: "ASSISTANCE" as WaiterReason, l: "مساعدة" },
                  { v: "WATER" as WaiterReason, l: "ماء" },
                  { v: "BILL" as WaiterReason, l: "الحساب" },
                  { v: "OTHER" as WaiterReason, l: "أخرى" },
                ]).map((r) => (
                  <button
                    key={r.v}
                    className={`reason-chip ${waiterReason === r.v ? "active" : ""}`}
                    onClick={() => setWaiterReason(r.v)}
                  >
                    {r.l}
                  </button>
                ))}
              </div>
              <label className="form-label" style={{ marginTop: 12 }}>ملاحظة (اختياري)</label>
              <input
                className="form-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="أضف ملاحظة..."
              />
              <button className="btn-pay" style={{ marginTop: 16 }} onClick={callWaiter}>
                إرسال النداء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Order Tracking Modal ═══ */}
      {showTracking && (
        <div className="drawer-overlay" onClick={() => setShowTracking(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>تتبع الطلب</h2>
              <button className="drawer-close" onClick={() => setShowTracking(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                className="form-input"
                value={trackingOrderId}
                onChange={(e) => setTrackingOrderId(e.target.value)}
                placeholder="أدخل رقم الطلب"
              />
              {trackingStatus && (
                <div className="tracking-status">
                  <div className="tracking-dot" />
                  <span>{statusLabels[trackingStatus] || trackingStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
