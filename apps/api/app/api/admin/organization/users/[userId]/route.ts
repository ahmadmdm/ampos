import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";
import { hashPassword } from "@/src/lib/password";

/* GET /api/admin/organization/users/[userId] — get user details */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");

    const user = await prisma.user.findUnique({
      where: { id: userId, organizationId: ctx.organizationId },
      include: {
        userRoles: { include: { role: true } },
        branches: { include: { branch: true } },
      },
    });
    if (!user) return fail("USER_NOT_FOUND", 404);
    return ok(user);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

/* PATCH /api/admin/organization/users/[userId] — update user */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    const body = (await req.json()) as {
      displayName?: string;
      email?: string;
      phone?: string;
      password?: string;
      status?: "ACTIVE" | "SUSPENDED";
      branchIds?: string[];
    };

    const user = await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (body.displayName) data.displayName = body.displayName;
      if (body.email) data.email = body.email;
      if (body.phone !== undefined) data.phone = body.phone;
      if (body.status) data.status = body.status;
      if (body.password) data.passwordHash = await hashPassword(body.password);

      const updated = await tx.user.update({
        where: { id: userId, organizationId: ctx.organizationId },
        data,
      });

      if (body.branchIds) {
        await tx.userBranch.deleteMany({ where: { userId } });
        for (const branchId of body.branchIds) {
          await tx.userBranch.create({ data: { userId, branchId } });
        }
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: { include: { role: true } },
          branches: { include: { branch: true } },
        },
      });
    });

    return ok(user);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}

/* DELETE /api/admin/organization/users/[userId] — delete user */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userBranch.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId, organizationId: ctx.organizationId } });
    });

    return ok({ deleted: userId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
