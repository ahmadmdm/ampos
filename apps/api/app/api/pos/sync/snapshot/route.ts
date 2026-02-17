import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { assertValidDevice } from "@/src/lib/device-auth";

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get("branchId");
    const deviceId = req.headers.get("x-device-id");
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceId || !deviceToken) return fail("x-device-id and x-device-token are required", 401);
    const device = await assertValidDevice(deviceId, deviceToken);

    if (!branchId) return fail("branchId is required", 400);
    if (device.branchId !== branchId) return fail("DEVICE_BRANCH_SCOPE_MISMATCH", 403);

    const [categories, products, tables, settings] = await Promise.all([
      prisma.category.findMany({ where: { branchId, isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({
        where: { branchId, isActive: true },
        include: { variants: true, modifierGroups: { include: { modifierGroup: { include: { options: true } } } } }
      }),
      prisma.table.findMany({ where: { branchId, isActive: true }, orderBy: { code: "asc" } }),
      prisma.branch.findUnique({ where: { id: branchId } })
    ]);

    return ok({
      snapshotAt: new Date().toISOString(),
      categories,
      products,
      tables,
      settings: settings
        ? {
            taxRateBps: settings.taxRateBps,
            serviceChargeBps: settings.serviceChargeBps,
            waiterCallCooldownSec: settings.waiterCallCooldownSec,
            isQrOrderingEnabled: settings.isQrOrderingEnabled,
            isWaiterCallEnabled: settings.isWaiterCallEnabled
          }
        : null
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status =
      msg === "DEVICE_NOT_FOUND" || msg === "INVALID_DEVICE_TOKEN"
        ? 401
        : msg.includes("FORBIDDEN")
        ? 403
        : 400;
    return fail(msg, status);
  }
}
