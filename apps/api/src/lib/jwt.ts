import jwt from "jsonwebtoken";

export interface JwtClaims {
  sub: string;
  org: string;
  branches: string[];
  roles: string[];
  jti?: string;
  type: "access" | "refresh";
}

const accessSecret = process.env.JWT_ACCESS_SECRET ?? "dev_access_secret";
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret";

export function signAccessToken(input: Omit<JwtClaims, "type">): string {
  return jwt.sign({ ...input, type: "access" }, accessSecret, { expiresIn: "15m" });
}

export function signRefreshToken(input: Omit<JwtClaims, "type">): string {
  return jwt.sign({ ...input, type: "refresh" }, refreshSecret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtClaims {
  return jwt.verify(token, accessSecret) as JwtClaims;
}

export function verifyRefreshToken(token: string): JwtClaims {
  return jwt.verify(token, refreshSecret) as JwtClaims;
}
