import crypto from "node:crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function b64urlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export type TableTokenPayload = {
  branchId: string;
  tableId: string;
  exp: number;
};

export function signTableToken(payload: TableTokenPayload, secret: string): string {
  const encoded = b64urlEncode(JSON.stringify(payload));
  const sig = hmac(secret, encoded);
  return `${encoded}.${sig}`;
}

export function verifyTableToken(token: string, secret: string): TableTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = hmac(secret, encoded);
  if (expected !== signature) return null;
  const payload = JSON.parse(b64urlDecode(encoded)) as TableTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;
  return payload;
}
