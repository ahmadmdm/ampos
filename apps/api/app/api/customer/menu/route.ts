import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { assertValidTableToken } from "@/src/lib/table-auth";

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get("branchId");
  const tableId = req.nextUrl.searchParams.get("tableId");
  const token = req.nextUrl.searchParams.get("token");
  if (!branchId) return fail("branchId is required", 400);
  if (tableId) {
    const tokenCheck = await assertValidTableToken(req, { branchId, tableId, token: token ?? undefined });
    if (tokenCheck) return tokenCheck;
  }

  const categories = await prisma.category.findMany({
    where: { branchId },
    orderBy: { sortOrder: "asc" }
  });

  const products = await prisma.product.findMany({
    where: { branchId, isActive: true },
    include: {
      variants: true,
      modifierGroups: {
        include: {
          modifierGroup: {
            include: { options: { where: { isActive: true } }
            }
          }
        }
      }
    }
  });

  return ok({ categories, products });
}
