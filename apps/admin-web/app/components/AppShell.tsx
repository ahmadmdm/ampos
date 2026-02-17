"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { Sidebar } from "./Sidebar";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <span className="login-logo">POS1</span>
          <p style={{ color: "var(--muted)", marginTop: 12 }}>جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  // If not logged in and not on login page, show login
  if (!user && pathname !== "/login") {
    // Dynamic import to avoid SSR issues
    const LoginPage = require("../login/page").default;
    return <LoginPage />;
  }

  // Login page when already logged in — redirect to dashboard
  if (user && pathname === "/login") {
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }

  // Login page (no shell)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Authenticated layout
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
