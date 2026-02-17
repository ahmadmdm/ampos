import { getStoredToken } from "./auth-context";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token) return { authorization: `Bearer ${token}` };
  // Fallback for dev — will only work with ALLOW_INSECURE_HEADER_AUTH=true
  return {
    "x-roles": "OWNER",
    "x-org-id": "org_demo",
    "x-branch-id": "br_demo",
    "x-user-id": "owner_demo",
  };
}

export async function apiFetch<T = unknown>(
  path: string,
  opts?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "content-type": "application/json", ...getAuthHeaders(), ...opts?.headers },
  });
  return res.json();
}
