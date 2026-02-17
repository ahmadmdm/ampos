import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { ok, fail } from "@/src/lib/http";
import { hashPassword } from "@/src/lib/password";

export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:read");

    const users = await prisma.user.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        userRoles: { include: { role: true } },
        branches: { include: { branch: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return ok(users);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg.includes("FORBIDDEN") ? 403 : 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    assertPermission(ctx, "catalog:write");

    const body = (await req.json()) as {
      email?: string;
      displayName?: string;
      password?: string;
      phone?: string;
      branchId?: string;
      roleCode?: string;
    };

    if (!body.email || !body.displayName || !body.password) {
      return fail("email, displayName, password are required", 400);
    }
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: ctx.organizationId,
          email: body.email!,
          displayName: body.displayName!,
          passwordHash,
          phone: body.phone
        }
      });

      if (body.branchId) {
        await tx.userBranch.create({
          data: { userId: created.id, branchId: body.branchId }
        });
      }

      if (body.roleCode) {
        const role = await tx.role.findUnique({ where: { code: body.roleCode } });
        if (role) {
          await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
        }
      }

      return created;
    });

    return ok(user, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
