import type { Prisma } from "@prisma/client";

export async function ensureDefaultStation(
  tx: Prisma.TransactionClient,
  branchId: string
) {
  const existing = await tx.station.findFirst({
    where: { branchId },
    orderBy: { code: "asc" }
  });
  if (existing) return existing;

  return tx.station.create({
    data: {
      branchId,
      code: "PASS",
      nameAr: "التمرير",
      nameEn: "Pass"
    }
  });
}

export async function createKitchenTicketForOrder(
  tx: Prisma.TransactionClient,
  input: { orderId: string; organizationId: string; branchId: string }
) {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!order) return null;
  const kitchenItems = order.items.filter((item) => item.product.requiresKitchen);
  if (!kitchenItems.length) return null;

  const station = await ensureDefaultStation(tx, input.branchId);
  const ticket = await tx.kitchenTicket.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      orderId: input.orderId,
      status: "NEW",
      items: {
        create: kitchenItems.map((item) => ({
          orderItemId: item.id,
          stationId: station.id,
          status: "NEW"
        }))
      }
    },
    include: { items: true }
  });

  return ticket;
}
