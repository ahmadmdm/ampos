import { getStoredToken, tryRefreshToken } from "./auth-context";

export const API = process.env.NEXT_PUBLIC_API_URL || "https://api.clo0.net";

function getAuthHeaders(token?: string | null): Record<string, string> {
  const t = token ?? getStoredToken();
  if (t) return { authorization: `Bearer ${t}` };
  return {};
}

export async function apiFetch<T = unknown>(
  path: string,
  opts?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const doFetch = (token?: string | null) =>
    fetch(`${API}${path}`, {
      ...opts,
      headers: { "content-type": "application/json", ...getAuthHeaders(token), ...opts?.headers },
    });

  let res = await doFetch();

  // On 401, attempt silent token refresh once
  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      // Refresh failed — redirect to login
      if (typeof window !== "undefined") window.location.href = "/login";
      return { ok: false, error: "SESSION_EXPIRED" };
    }
  }

  return res.json();
}
