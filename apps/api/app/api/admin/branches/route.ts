import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";

/* GET /api/admin/branches — list all branches in the org */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");

    const branches = await prisma.branch.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        _count: {
          select: {
            tables: true,
            products: true,
            devices: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(branches);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : msg === "UNAUTHORIZED" ? 401 : 400);
  }
}

/* POST /api/admin/branches — create a new branch */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    const body = (await req.json()) as {
      code?: string;
      name?: string;
      taxRateBps?: number;
      serviceChargeBps?: number;
      currency?: string;
      timezone?: string;
      isQrOrderingEnabled?: boolean;
      isWaiterCallEnabled?: boolean;
      waiterCallCooldownSec?: number;
      qrTokenSecret?: string;
    };

    if (!body.code || !body.name) {
      return fail("code, name are required", 400);
    }

    const branch = await prisma.branch.create({
      data: {
        organizationId: ctx.organizationId,
        code: body.code,
        name: body.name,
        taxRateBps: body.taxRateBps ?? 1500,
        serviceChargeBps: body.serviceChargeBps ?? 0,
        currency: body.currency ?? "SAR",
        timezone: body.timezone ?? "Asia/Riyadh",
        isQrOrderingEnabled: body.isQrOrderingEnabled ?? false,
        isWaiterCallEnabled: body.isWaiterCallEnabled ?? true,
        waiterCallCooldownSec: body.waiterCallCooldownSec ?? 60,
        qrTokenSecret: body.qrTokenSecret ?? crypto.randomUUID(),
      },
    });

    return ok(branch, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
