"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";

const NAV = [
  { href: "/", label: "لوحة التحكم", icon: "📊" },
  { href: "/orders", label: "الطلبات", icon: "🛒" },
  { href: "/branches", label: "الفروع", icon: "🏢" },
  { href: "/products", label: "المنتجات", icon: "📋" },
  { href: "/tables", label: "الطاولات", icon: "🪑" },
  { href: "/users", label: "المستخدمون", icon: "👥" },
  { href: "/pricing", label: "التسعير", icon: "💰" },
  { href: "/inventory", label: "المخزون", icon: "📦" },
  { href: "/reports", label: "التقارير", icon: "📈" },
  { href: "/zatca", label: "فاتورة إلكترونية", icon: "🧾" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">POS1</span>
        <span className="sidebar-sub">لوحة الإدارة</span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${active ? " active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">{user.displayName}</div>
          <button className="sidebar-logout" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
      )}
    </aside>
  );
}
