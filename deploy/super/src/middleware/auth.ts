/**
 * Super-admin JWT authentication middleware.
 *
 * Tokens are issued by POST /auth/login and must be passed as:
 *   Authorization: Bearer <token>
 *
 * Uses a SEPARATE JWT secret from the main API so a compromised main-API
 * secret does not grant super-admin access.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SUPER_JWT_SECRET = process.env.SUPER_JWT_SECRET ?? "change_this_secret";

export interface SuperAdminToken {
  sub: "super_admin";
  iat: number;
  exp: number;
}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SUPER_JWT_SECRET) as SuperAdminToken;
    if (payload.sub !== "super_admin") throw new Error("INVALID_SUB");
    next();
  } catch {
    res.status(401).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
  }
}

/** Sign a short-lived super-admin token (8 hours) */
export function signSuperAdminToken(): string {
  return jwt.sign({ sub: "super_admin" }, SUPER_JWT_SECRET, {
    expiresIn: "8h",
  });
}
