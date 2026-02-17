import crypto from "node:crypto";
import { ok } from "@/src/lib/http";

export async function GET() {
  const token = crypto.randomBytes(24).toString("hex");
  const response = ok({ csrfToken: token });
  response.cookies.set("csrf_token", token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
