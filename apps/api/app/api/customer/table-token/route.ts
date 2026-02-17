import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { signTableToken } from "@/src/lib/crypto";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    branchId?: string;
    tableId?: string;
    expiresInSec?: number;
  };

  if (!body.branchId || !body.tableId) return fail("branchId and tableId are required", 400);

  const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
  if (!branch) return fail("BRANCH_NOT_FOUND", 404);
  if (!branch.isQrOrderingEnabled) return fail("QR_ORDERING_DISABLED", 403);
  const table = await prisma.table.findUnique({ where: { id: body.tableId } });
  if (!table || table.branchId !== body.branchId || !table.isActive) return fail("TABLE_NOT_FOUND", 404);

  const exp = Math.floor(Date.now() / 1000) + (body.expiresInSec ?? 60 * 60 * 6);
  const secret = branch.qrTokenSecret ?? process.env.QR_SIGNING_SECRET ?? "dev_qr_secret";
  const token = signTableToken(
    {
      branchId: body.branchId,
      tableId: body.tableId,
      exp
    },
    secret
  );

  return ok({ token, exp });
}
