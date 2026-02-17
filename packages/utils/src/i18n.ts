/**
 * Lightweight i18n module for POS1.
 * Supports Arabic (ar) and English (en).
 *
 * Usage:
 *   import { t, setLocale, getLocale } from "@pos1/utils/i18n";
 *   t("nav.orders") => "الطلبات" (or "Orders" if locale is "en")
 */

export type Locale = "ar" | "en";

let currentLocale: Locale = "ar";

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("pos1_locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("pos1_locale") as Locale | null;
    if (stored === "ar" || stored === "en") {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

const translations: Record<string, Record<Locale, string>> = {
  // ─── Navigation ───
  "nav.dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
  "nav.orders": { ar: "الطلبات", en: "Orders" },
  "nav.products": { ar: "المنتجات", en: "Products" },
  "nav.tables": { ar: "الطاولات", en: "Tables" },
  "nav.branches": { ar: "الفروع", en: "Branches" },
  "nav.users": { ar: "المستخدمين", en: "Users" },
  "nav.pricing": { ar: "التسعير", en: "Pricing" },
  "nav.inventory": { ar: "المخزون", en: "Inventory" },
  "nav.reports": { ar: "التقارير", en: "Reports" },
  "nav.logout": { ar: "تسجيل الخروج", en: "Logout" },

  // ─── Common Actions ───
  "action.save": { ar: "حفظ", en: "Save" },
  "action.cancel": { ar: "إلغاء", en: "Cancel" },
  "action.delete": { ar: "حذف", en: "Delete" },
  "action.edit": { ar: "تعديل", en: "Edit" },
  "action.create": { ar: "إنشاء", en: "Create" },
  "action.search": { ar: "بحث", en: "Search" },
  "action.filter": { ar: "تصفية", en: "Filter" },
  "action.export": { ar: "تصدير", en: "Export" },
  "action.retry": { ar: "إعادة المحاولة", en: "Retry" },
  "action.loading": { ar: "جارٍ التحميل...", en: "Loading..." },

  // ─── Status ───
  "status.active": { ar: "فعّال", en: "Active" },
  "status.inactive": { ar: "معطّل", en: "Inactive" },
  "status.draft": { ar: "مسودة", en: "Draft" },
  "status.confirmed": { ar: "مؤكد", en: "Confirmed" },
  "status.in_kitchen": { ar: "في المطبخ", en: "In Kitchen" },
  "status.ready": { ar: "جاهز", en: "Ready" },
  "status.served": { ar: "تم التقديم", en: "Served" },
  "status.completed": { ar: "مكتمل", en: "Completed" },
  "status.cancelled": { ar: "ملغي", en: "Cancelled" },
  "status.refunded": { ar: "مسترجع", en: "Refunded" },

  // ─── Orders ───
  "orders.title": { ar: "إدارة الطلبات", en: "Order Management" },
  "orders.orderNo": { ar: "رقم الطلب", en: "Order #" },
  "orders.type": { ar: "النوع", en: "Type" },
  "orders.status": { ar: "الحالة", en: "Status" },
  "orders.total": { ar: "الإجمالي", en: "Total" },
  "orders.customer": { ar: "العميل", en: "Customer" },
  "orders.date": { ar: "التاريخ", en: "Date" },
  "orders.empty": { ar: "لا توجد طلبات", en: "No orders found" },

  // ─── Products ───
  "products.title": { ar: "المنتجات والتصنيفات", en: "Products & Categories" },
  "products.name": { ar: "اسم المنتج", en: "Product Name" },
  "products.price": { ar: "السعر", en: "Price" },
  "products.category": { ar: "التصنيف", en: "Category" },
  "products.sku": { ar: "رمز SKU", en: "SKU" },
  "products.new": { ar: "منتج جديد", en: "New Product" },
  "products.empty": { ar: "لا توجد منتجات", en: "No products found" },

  // ─── Tables ───
  "tables.title": { ar: "الطاولات", en: "Tables" },
  "tables.code": { ar: "رمز الطاولة", en: "Table Code" },
  "tables.seats": { ar: "المقاعد", en: "Seats" },
  "tables.area": { ar: "المنطقة", en: "Area" },
  "tables.new": { ar: "طاولة جديدة", en: "New Table" },
  "tables.empty": { ar: "لا توجد طاولات", en: "No tables found" },

  // ─── Reports ───
  "reports.title": { ar: "التقارير", en: "Reports" },
  "reports.totalOrders": { ar: "إجمالي الطلبات", en: "Total Orders" },
  "reports.totalRevenue": { ar: "إجمالي المبيعات", en: "Total Revenue" },
  "reports.avgTicket": { ar: "متوسط الفاتورة", en: "Avg Ticket" },
  "reports.cancelRate": { ar: "نسبة الإلغاء", en: "Cancel Rate" },
  "reports.dailySales": { ar: "المبيعات اليومية", en: "Daily Sales" },
  "reports.topProducts": { ar: "أكثر المنتجات مبيعًا", en: "Top Products" },
  "reports.paymentMethods": { ar: "طرق الدفع", en: "Payment Methods" },
  "reports.orderTypes": { ar: "أنواع الطلبات", en: "Order Types" },

  // ─── Auth ───
  "auth.login": { ar: "تسجيل الدخول", en: "Login" },
  "auth.email": { ar: "البريد الإلكتروني", en: "Email" },
  "auth.password": { ar: "كلمة المرور", en: "Password" },
  "auth.loginBtn": { ar: "دخول", en: "Sign In" },
  "auth.loginError": { ar: "بيانات الدخول غير صحيحة", en: "Invalid credentials" },

  // ─── KDS ───
  "kds.title": { ar: "لوحة المطبخ", en: "Kitchen Display" },
  "kds.new": { ar: "جديد", en: "New" },
  "kds.cooking": { ar: "قيد التحضير", en: "Cooking" },
  "kds.ready": { ar: "جاهز", en: "Ready" },
  "kds.served": { ar: "تم التقديم", en: "Served" },

  // ─── Waiter ───
  "waiter.title": { ar: "واجهة النادل", en: "Waiter Interface" },
  "waiter.readyToServe": { ar: "جاهز للتقديم", en: "Ready to Serve" },
  "waiter.callBox": { ar: "صندوق النداءات", en: "Call Box" },
  "waiter.ack": { ar: "استلام", en: "Acknowledge" },
  "waiter.resolve": { ar: "تم الحل", en: "Resolved" },

  // ─── Errors ───
  "error.unexpected": { ar: "حدث خطأ غير متوقع", en: "An unexpected error occurred" },
  "error.tryAgain": { ar: "يرجى المحاولة مرة أخرى", en: "Please try again" },
  "error.refresh": { ar: "تحديث الصفحة", en: "Refresh Page" },

  // ─── Currency ───
  "currency.sar": { ar: "ر.س", en: "SAR" },
  "currency.point": { ar: "نقطة", en: "pts" },
};

export function t(key: string, locale?: Locale): string {
  const l = locale ?? currentLocale;
  const entry = translations[key];
  if (!entry) return key;
  return entry[l] ?? entry.ar ?? key;
}

/**
 * Register additional translations at runtime (for plugin/module extensibility).
 */
export function registerTranslations(entries: Record<string, Record<Locale, string>>) {
  for (const [key, val] of Object.entries(entries)) {
    translations[key] = val;
  }
}
