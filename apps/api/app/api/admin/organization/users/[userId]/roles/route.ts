import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    const body = (await req.json()) as { roleCodes?: string[] };
    const roleCodes = body.roleCodes ?? [];

    const updated = await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (roleCodes.length) {
        const roles = await tx.role.findMany({ where: { code: { in: roleCodes } } });
        if (roles.length) {
          await tx.userRole.createMany({
            data: roles.map((role) => ({ userId, roleId: role.id }))
          });
        }
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } }
      });
    });

    return ok(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}
