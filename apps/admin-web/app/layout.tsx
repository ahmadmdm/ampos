import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "./lib/auth-context";
import { AppShell } from "./components/AppShell";

export const metadata = { title: "POS1 — لوحة الإدارة" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
