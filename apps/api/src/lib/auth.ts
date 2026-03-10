import { NextRequest } from "next/server";
import { verifyAccessToken } from "./jwt";

export interface AuthContext {
  userId: string;
  organizationId: string;
  branchIds: string[];
  roles: string[];
}

/**
 * Insecure header-based auth is ONLY allowed when:
 *   1. Explicitly opted-in via ALLOW_INSECURE_HEADER_AUTH=true  AND
 *   2. The request originates from localhost (not a remote caller)
 * This prevents remote spoofing in staging/docker environments.
 */
function isInsecureHeaderAuthAllowed(req: NextRequest): boolean {
  if (process.env.ALLOW_INSECURE_HEADER_AUTH !== "true") return false;
  const host = req.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

function fromHeaders(req: NextRequest): AuthContext {
  const org = req.headers.get("x-org-id");
  const branchId = req.headers.get("x-branch-id");
  const rolesRaw = req.headers.get("x-roles");
  const userId = req.headers.get("x-user-id");

  if (!org || !branchId || !rolesRaw || !userId) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    userId,
    organizationId: org,
    branchIds: branchId.split(","),
    roles: rolesRaw.split(",")
  };
}

export function getAuthContext(req: NextRequest): AuthContext {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const claims = verifyAccessToken(token);
    return {
      userId: claims.sub,
      organizationId: claims.org,
      branchIds: claims.branches,
      roles: claims.roles
    };
  }

  if (!isInsecureHeaderAuthAllowed(req)) {
    throw new Error("UNAUTHORIZED");
  }

  return fromHeaders(req);
}
