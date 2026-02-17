import { ok } from "@/src/lib/http";

export async function GET() {
  return ok({ service: "api", status: "healthy", at: new Date().toISOString() });
}
