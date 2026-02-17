import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";

/**
 * GET /api/pos/loyalty?phone=X — lookup loyalty balance
 * POST /api/pos/loyalty — earn/redeem points
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) return fail("phone is required", 400);

    let account = await prisma.loyaltyAccount.findUnique({
      where: { organizationId_phone: { organizationId: ctx.organizationId, phone } },
    });

    // Auto-create account if not found
    if (!account) {
      account = await prisma.loyaltyAccount.create({
        data: { organizationId: ctx.organizationId, phone },
      });
    }

    return ok(account);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    const { phone, type, points, orderId, description } = await req.json();

    if (!phone || !type || points == null) {
      return fail("phone, type, and points are required", 400);
    }
    if (!["EARN", "REDEEM", "ADJUST"].includes(type)) {
      return fail("type must be EARN, REDEEM, or ADJUST", 400);
    }

    // Get or create account
    let account = await prisma.loyaltyAccount.findUnique({
      where: { organizationId_phone: { organizationId: ctx.organizationId, phone } },
    });
    if (!account) {
      account = await prisma.loyaltyAccount.create({
        data: { organizationId: ctx.organizationId, phone },
      });
    }

    if (type === "REDEEM") {
      // Check program config
      const program = await prisma.loyaltyProgram.findUnique({
        where: { organizationId: ctx.organizationId },
      });
      if (!program || !program.isActive) return fail("برنامج الولاء غير مفعّل", 400);
      if (points > account.balance) return fail("رصيد النقاط غير كافٍ", 400);
      if (points < program.minRedeemPoints) return fail(`الحد الأدنى للاستبدال ${program.minRedeemPoints} نقطة`, 400);
    }

    const delta = type === "REDEEM" ? -Math.abs(points) : Math.abs(points);

    const [updatedAccount, tx] = await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: delta },
          ...(type === "EARN" ? { lifetimeEarned: { increment: Math.abs(points) } } : {}),
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          orderId: orderId || null,
          type,
          points: delta,
          description: description || null,
        },
      }),
    ]);

    return ok({ account: updatedAccount, transaction: tx });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}
