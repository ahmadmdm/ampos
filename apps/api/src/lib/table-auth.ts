import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { fail } from "./http";
import { verifyTableToken } from "./crypto";

export async function assertValidTableToken(
  req: NextRequest,
  input: { branchId: string; tableId: string; token?: string }
): Promise<null | ReturnType<typeof fail>> {
  if (!input.token) return fail("table token is required", 401);

  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch) return fail("BRANCH_NOT_FOUND", 404);

  const secret = branch.qrTokenSecret ?? process.env.QR_SIGNING_SECRET ?? "dev_qr_secret";
  const payload = verifyTableToken(input.token, secret);
  if (!payload) return fail("INVALID_OR_EXPIRED_TABLE_TOKEN", 401);
  if (payload.branchId !== input.branchId || payload.tableId !== input.tableId) {
    return fail("TABLE_TOKEN_SCOPE_MISMATCH", 401);
  }
  const table = await prisma.table.findUnique({ where: { id: input.tableId } });
  if (!table || table.branchId !== input.branchId || !table.isActive) {
    return fail("TABLE_NOT_FOUND", 404);
  }

  return null;
}
