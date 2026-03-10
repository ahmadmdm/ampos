"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  branchIds: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.clo0.net";

// Attempt a silent token refresh. Returns new accessToken or null.
export async function tryRefreshToken(): Promise<string | null> {
  try {
    const stored = localStorage.getItem("pos1_auth");
    if (!stored) return null;
    const { refreshToken } = JSON.parse(stored);
    if (!refreshToken) return null;
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (!json.ok) {
      localStorage.removeItem("pos1_auth");
      return null;
    }
    const { accessToken: newAccess, refreshToken: newRefresh } = json.data;
    const parsed = JSON.parse(stored);
    localStorage.setItem("pos1_auth", JSON.stringify({ ...parsed, accessToken: newAccess, refreshToken: newRefresh }));
    return newAccess;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  });

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pos1_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ user: parsed.user, accessToken: parsed.accessToken, loading: false });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "LOGIN_FAILED");
    const { accessToken, refreshToken, user } = json.data;
    const authData = { user, accessToken, refreshToken };
    localStorage.setItem("pos1_auth", JSON.stringify(authData));
    setState({ user, accessToken, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pos1_auth");
    setState({ user: null, accessToken: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem("pos1_auth");
    if (stored) return JSON.parse(stored).accessToken;
  } catch {}
  return null;
}
