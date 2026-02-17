import { NextRequest } from "next/server";
import { verifyAccessToken } from "./jwt";

export interface AuthContext {
  userId: string;
  organizationId: string;
  branchIds: string[];
  roles: string[];
}

const allowInsecureHeaderAuth =
  process.env.ALLOW_INSECURE_HEADER_AUTH === "true" ||
  process.env.NODE_ENV !== "production";

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

  if (!allowInsecureHeaderAuth) {
    throw new Error("UNAUTHORIZED");
  }

  return fromHeaders(req);
}
