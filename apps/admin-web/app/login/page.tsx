"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message === "INVALID_CREDENTIALS" ? "البريد أو كلمة المرور غير صحيحة" : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="login-logo">POS1</span>
          <span className="login-sub">لوحة الإدارة</span>
        </div>
        <h2>تسجيل الدخول</h2>
        {error && <div className="login-error">{error}</div>}
        <label className="login-label">
          البريد الإلكتروني
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="email@example.com" dir="ltr" />
        </label>
        <label className="login-label">
          كلمة المرور
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" dir="ltr" />
        </label>
        <button className="btn btn-primary login-btn" disabled={loading} type="submit">
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
