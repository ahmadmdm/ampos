import "dotenv/config";
import { KitchenTicketStatus, OrderStatus, OrderType, PaymentStatus, PrismaClient, WaiterCallStatus } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const roleCodes = [
  "OWNER",
  "BRANCH_MANAGER",
  "CASHIER",
  "KITCHEN",
  "WAITER_RUNNER",
  "INVENTORY",
  "ACCOUNTANT"
] as const;

const permissionCodes = [
  "catalog:read",
  "catalog:write",
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "kds:read",
  "kds:write",
  "waiter:read",
  "waiter:write",
  "payments:read",
  "reports:read"
] as const;

async function ensureUser(params: {
  organizationId: string;
  branchId: string;
  email: string;
  displayName: string;
  roleCode: (typeof roleCodes)[number];
  passwordHash: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: { displayName: params.displayName, passwordHash: params.passwordHash, organizationId: params.organizationId },
    create: {
      organizationId: params.organizationId,
      email: params.email,
      displayName: params.displayName,
      passwordHash: params.passwordHash
    }
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: user.id, branchId: params.branchId } },
    update: {},
    create: { userId: user.id, branchId: params.branchId }
  });

  const role = await prisma.role.findUniqueOrThrow({ where: { code: params.roleCode } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id }
  });

  return user;
}

async function main() {
  const ownerPasswordHash = await hashPassword("owner123");
  const staffPasswordHash = await hashPassword("demo123");

  const org = await prisma.organization.upsert({
    where: { id: "org_demo" },
    update: { name: "Demo Org" },
    create: { id: "org_demo", name: "Demo Org" }
  });

  const branch = await prisma.branch.upsert({
    where: { id: "br_demo" },
    update: {
      organizationId: org.id,
      code: "demo-main",
      name: "Riyadh Demo Branch",
      qrTokenSecret: "demo_branch_qr_secret",
      taxRateBps: 1500,
      serviceChargeBps: 500,
      waiterCallCooldownSec: 60,
      isQrOrderingEnabled: true,
      isWaiterCallEnabled: true
    },
    create: {
      id: "br_demo",
      organizationId: org.id,
      code: "demo-main",
      name: "Riyadh Demo Branch",
      taxRateBps: 1500,
      serviceChargeBps: 500,
      waiterCallCooldownSec: 60,
      qrTokenSecret: "demo_branch_qr_secret",
      isQrOrderingEnabled: true,
      isWaiterCallEnabled: true
    }
  });

  for (const code of roleCodes) {
    await prisma.role.upsert({
      where: { code },
      update: { name: code },
      create: { code, name: code }
    });
  }

  for (const code of permissionCodes) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: code },
      create: { code, description: code }
    });
  }

  const owner = await ensureUser({
    organizationId: org.id,
    branchId: branch.id,
    email: "owner@demo.local",
    displayName: "Owner Demo",
    roleCode: "OWNER",
    passwordHash: ownerPasswordHash
  });

  const cashier = await ensureUser({
    organizationId: org.id,
    branchId: branch.id,
    email: "cashier@demo.local",
    displayName: "Cashier Demo",
    roleCode: "CASHIER",
    passwordHash: staffPasswordHash
  });

  const kitchen = await ensureUser({
    organizationId: org.id,
    branchId: branch.id,
    email: "kitchen@demo.local",
    displayName: "Kitchen Demo",
    roleCode: "KITCHEN",
    passwordHash: staffPasswordHash
  });

  const waiter = await ensureUser({
    organizationId: org.id,
    branchId: branch.id,
    email: "waiter@demo.local",
    displayName: "Waiter Demo",
    roleCode: "WAITER_RUNNER",
    passwordHash: staffPasswordHash
  });

  await prisma.device.upsert({
    where: { branchId_code: { branchId: branch.id, code: "android_pos_01" } },
    update: { name: "Android POS Tablet", platform: "ANDROID", authTokenHash: "demo_hash" },
    create: {
      branchId: branch.id,
      code: "android_pos_01",
      name: "Android POS Tablet",
      platform: "ANDROID",
      authTokenHash: "demo_hash"
    }
  });

  const categories = [
    { id: "cat_drinks", nameAr: "مشروبات", nameEn: "Drinks", sortOrder: 1 },
    { id: "cat_coffee", nameAr: "قهوة مختصة", nameEn: "Specialty Coffee", sortOrder: 2 },
    { id: "cat_food", nameAr: "وجبات", nameEn: "Meals", sortOrder: 3 },
    { id: "cat_dessert", nameAr: "حلويات", nameEn: "Dessert", sortOrder: 4 }
  ] as const;

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { organizationId: org.id, branchId: branch.id, nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: c.sortOrder, isActive: true },
      create: { id: c.id, organizationId: org.id, branchId: branch.id, nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: c.sortOrder }
    });
  }

  const productsSeed = [
    { sku: "LATTE-001", nameAr: "لاتيه", nameEn: "Latte", price: 18, categoryId: "cat_coffee", requiresKitchen: true },
    { sku: "ESP-001", nameAr: "إسبريسو", nameEn: "Espresso", price: 12, categoryId: "cat_coffee", requiresKitchen: true },
    { sku: "AMER-001", nameAr: "أمريكانو", nameEn: "Americano", price: 13, categoryId: "cat_coffee", requiresKitchen: true },
    { sku: "ICED-001", nameAr: "آيس لاتيه", nameEn: "Iced Latte", price: 20, categoryId: "cat_drinks", requiresKitchen: true },
    { sku: "WATER-001", nameAr: "مياه معدنية", nameEn: "Water", price: 4, categoryId: "cat_drinks", requiresKitchen: false },
    { sku: "BURGER-001", nameAr: "برجر لحم", nameEn: "Beef Burger", price: 42, categoryId: "cat_food", requiresKitchen: true },
    { sku: "PASTA-001", nameAr: "باستا دجاج", nameEn: "Chicken Pasta", price: 38, categoryId: "cat_food", requiresKitchen: true },
    { sku: "SALAD-001", nameAr: "سلطة سيزر", nameEn: "Caesar Salad", price: 26, categoryId: "cat_food", requiresKitchen: true },
    { sku: "FRIES-001", nameAr: "بطاطس", nameEn: "Fries", price: 14, categoryId: "cat_food", requiresKitchen: true },
    { sku: "CHEESE-001", nameAr: "تشيز كيك", nameEn: "Cheesecake", price: 24, categoryId: "cat_dessert", requiresKitchen: true },
    { sku: "BROWNIE-001", nameAr: "براونيز", nameEn: "Brownie", price: 19, categoryId: "cat_dessert", requiresKitchen: true },
    { sku: "ICECREAM-001", nameAr: "آيس كريم", nameEn: "Ice Cream", price: 16, categoryId: "cat_dessert", requiresKitchen: true }
  ] as const;

  const productsBySku: Record<string, string> = {};
  for (const p of productsSeed) {
    const product = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: p.sku } },
      update: {
        branchId: branch.id,
        categoryId: p.categoryId,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        basePrice: p.price,
        requiresKitchen: p.requiresKitchen,
        isActive: true
      },
      create: {
        organizationId: org.id,
        branchId: branch.id,
        categoryId: p.categoryId,
        sku: p.sku,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        basePrice: p.price,
        requiresKitchen: p.requiresKitchen,
        isActive: true
      }
    });
    productsBySku[p.sku] = product.id;
  }

  await prisma.pricingRule.upsert({
    where: { branchId_name: { branchId: branch.id, name: "Happy Hour Drinks" } },
    update: { organizationId: org.id, kind: "PERCENT_DISCOUNT", value: 10, isActive: true },
    create: {
      organizationId: org.id,
      branchId: branch.id,
      name: "Happy Hour Drinks",
      kind: "PERCENT_DISCOUNT",
      value: 10,
      isActive: true
    }
  });

  await prisma.pricingRule.upsert({
    where: { branchId_name: { branchId: branch.id, name: "Dessert Promo" } },
    update: { organizationId: org.id, kind: "FIXED_DISCOUNT", value: 4, isActive: true },
    create: {
      organizationId: org.id,
      branchId: branch.id,
      name: "Dessert Promo",
      kind: "FIXED_DISCOUNT",
      value: 4,
      isActive: true
    }
  });

  const inventoryItems = [
    { sku: "INV-COFFEE", name: "Coffee Beans", unit: "kg", reorderPoint: 8, stock: 3.5 },
    { sku: "INV-MILK", name: "Milk", unit: "L", reorderPoint: 20, stock: 32 },
    { sku: "INV-BURGER", name: "Burger Patty", unit: "pcs", reorderPoint: 25, stock: 14 },
    { sku: "INV-PASTA", name: "Pasta", unit: "kg", reorderPoint: 10, stock: 16 },
    { sku: "INV-CHEESE", name: "Cream Cheese", unit: "kg", reorderPoint: 5, stock: 4.2 }
  ] as const;

  for (const item of inventoryItems) {
    const inv = await prisma.inventoryItem.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: item.sku } },
      update: { name: item.name, unit: item.unit, reorderPoint: item.reorderPoint },
      create: { organizationId: org.id, sku: item.sku, name: item.name, unit: item.unit, reorderPoint: item.reorderPoint }
    });

    await prisma.stockLevel.upsert({
      where: { branchId_inventoryItemId: { branchId: branch.id, inventoryItemId: inv.id } },
      update: { organizationId: org.id, quantity: item.stock },
      create: { organizationId: org.id, branchId: branch.id, inventoryItemId: inv.id, quantity: item.stock }
    });
  }

  const stations = [
    { code: "PASS", nameAr: "التمرير", nameEn: "Pass" },
    { code: "GRILL", nameAr: "الشواية", nameEn: "Grill" },
    { code: "DRINKS", nameAr: "المشروبات", nameEn: "Drinks" },
    { code: "DESSERT", nameAr: "الحلويات", nameEn: "Dessert" }
  ] as const;

  const stationIds: Record<string, string> = {};
  for (const s of stations) {
    const station = await prisma.station.upsert({
      where: { branchId_code: { branchId: branch.id, code: s.code } },
      update: { nameAr: s.nameAr, nameEn: s.nameEn },
      create: { branchId: branch.id, code: s.code, nameAr: s.nameAr, nameEn: s.nameEn }
    });
    stationIds[s.code] = station.id;
  }

  const area = await prisma.tableArea.upsert({
    where: { id: "area_main" },
    update: { branchId: branch.id, nameAr: "الصالة الرئيسية", nameEn: "Main Hall", sortOrder: 1 },
    create: { id: "area_main", branchId: branch.id, nameAr: "الصالة الرئيسية", nameEn: "Main Hall", sortOrder: 1 }
  });

  for (let i = 1; i <= 16; i++) {
    const tableId = i === 12 ? "tbl_demo_12" : `tbl_demo_${String(i).padStart(2, "0")}`;
    await prisma.table.upsert({
      where: { id: tableId },
      update: { branchId: branch.id, tableAreaId: area.id, code: `T${i}`, seats: i <= 8 ? 4 : 6, isActive: true },
      create: { id: tableId, branchId: branch.id, tableAreaId: area.id, code: `T${i}`, seats: i <= 8 ? 4 : 6, isActive: true }
    });
  }

  const now = new Date();

  const orderA = await prisma.order.upsert({
    where: { branchId_orderNo: { branchId: branch.id, orderNo: "A-1001" } },
    update: {
      organizationId: org.id,
      tableId: "tbl_demo_12",
      source: "POS",
      type: OrderType.DINE_IN,
      status: OrderStatus.IN_KITCHEN,
      subtotal: 74,
      taxAmount: 11.1,
      serviceCharge: 3.7,
      discountAmount: 0,
      totalAmount: 88.8,
      createdByUserId: cashier.id
    },
    create: {
      organizationId: org.id,
      branchId: branch.id,
      tableId: "tbl_demo_12",
      orderNo: "A-1001",
      source: "POS",
      type: OrderType.DINE_IN,
      status: OrderStatus.IN_KITCHEN,
      subtotal: 74,
      taxAmount: 11.1,
      serviceCharge: 3.7,
      discountAmount: 0,
      totalAmount: 88.8,
      createdByUserId: cashier.id
    }
  });

  await prisma.kitchenTicketItem.deleteMany({ where: { ticket: { orderId: orderA.id } } });
  await prisma.orderItem.deleteMany({ where: { orderId: orderA.id } });
  const orderAItems = await Promise.all([
    prisma.orderItem.create({
      data: {
        orderId: orderA.id,
        productId: productsBySku["BURGER-001"],
        itemNameAr: "برجر لحم",
        qty: 1,
        unitPrice: 42,
        lineTotal: 42
      }
    }),
    prisma.orderItem.create({
      data: {
        orderId: orderA.id,
        productId: productsBySku["LATTE-001"],
        itemNameAr: "لاتيه",
        qty: 2,
        unitPrice: 16,
        lineTotal: 32
      }
    })
  ]);

  const ticketA = await prisma.kitchenTicket.upsert({
    where: { id: "kt_demo_a1001" },
    update: {
      organizationId: org.id,
      branchId: branch.id,
      orderId: orderA.id,
      status: KitchenTicketStatus.COOKING,
      startedAt: now
    },
    create: {
      id: "kt_demo_a1001",
      organizationId: org.id,
      branchId: branch.id,
      orderId: orderA.id,
      status: KitchenTicketStatus.COOKING,
      startedAt: now
    }
  });

  await prisma.kitchenTicketItem.deleteMany({ where: { ticketId: ticketA.id } });
  await prisma.kitchenTicketItem.createMany({
    data: [
      { ticketId: ticketA.id, orderItemId: orderAItems[0].id, stationId: stationIds.GRILL, status: KitchenTicketStatus.COOKING },
      { ticketId: ticketA.id, orderItemId: orderAItems[1].id, stationId: stationIds.DRINKS, status: KitchenTicketStatus.READY }
    ]
  });

  await prisma.payment.upsert({
    where: { id: "pay_demo_a1001" },
    update: {
      organizationId: org.id,
      branchId: branch.id,
      orderId: orderA.id,
      method: "CARD",
      provider: "moyasar",
      status: PaymentStatus.CONFIRMED,
      amount: 88.8,
      currency: "SAR",
      externalRef: "demo_ext_a1001",
      confirmedAt: now
    },
    create: {
      id: "pay_demo_a1001",
      organizationId: org.id,
      branchId: branch.id,
      orderId: orderA.id,
      method: "CARD",
      provider: "moyasar",
      status: PaymentStatus.CONFIRMED,
      amount: 88.8,
      currency: "SAR",
      externalRef: "demo_ext_a1001",
      confirmedAt: now
    }
  });

  const orderB = await prisma.order.upsert({
    where: { branchId_orderNo: { branchId: branch.id, orderNo: "A-1002" } },
    update: {
      organizationId: org.id,
      tableId: "tbl_demo_03",
      source: "CUSTOMER_QR",
      type: OrderType.DINE_IN,
      status: OrderStatus.READY,
      subtotal: 40,
      taxAmount: 6,
      serviceCharge: 2,
      discountAmount: 4,
      totalAmount: 44,
      createdByUserId: owner.id
    },
    create: {
      organizationId: org.id,
      branchId: branch.id,
      tableId: "tbl_demo_03",
      orderNo: "A-1002",
      source: "CUSTOMER_QR",
      type: OrderType.DINE_IN,
      status: OrderStatus.READY,
      subtotal: 40,
      taxAmount: 6,
      serviceCharge: 2,
      discountAmount: 4,
      totalAmount: 44,
      createdByUserId: owner.id
    }
  });

  await prisma.kitchenTicketItem.deleteMany({ where: { ticket: { orderId: orderB.id } } });
  await prisma.orderItem.deleteMany({ where: { orderId: orderB.id } });
  const orderBItem = await prisma.orderItem.create({
    data: {
      orderId: orderB.id,
      productId: productsBySku["CHEESE-001"],
      itemNameAr: "تشيز كيك",
      qty: 2,
      unitPrice: 20,
      lineTotal: 40
    }
  });

  const ticketB = await prisma.kitchenTicket.upsert({
    where: { id: "kt_demo_a1002" },
    update: {
      organizationId: org.id,
      branchId: branch.id,
      orderId: orderB.id,
      status: KitchenTicketStatus.READY,
      startedAt: new Date(now.getTime() - 20 * 60 * 1000),
      readyAt: new Date(now.getTime() - 3 * 60 * 1000)
    },
    create: {
      id: "kt_demo_a1002",
      organizationId: org.id,
      branchId: branch.id,
      orderId: orderB.id,
      status: KitchenTicketStatus.READY,
      startedAt: new Date(now.getTime() - 20 * 60 * 1000),
      readyAt: new Date(now.getTime() - 3 * 60 * 1000)
    }
  });

  await prisma.kitchenTicketItem.deleteMany({ where: { ticketId: ticketB.id } });
  await prisma.kitchenTicketItem.create({
    data: {
      ticketId: ticketB.id,
      orderItemId: orderBItem.id,
      stationId: stationIds.DESSERT,
      status: KitchenTicketStatus.READY
    }
  });

  await prisma.waiterCall.upsert({
    where: { id: "wc_demo_open" },
    update: {
      organizationId: org.id,
      branchId: branch.id,
      tableId: "tbl_demo_12",
      reason: "WATER",
      note: "ماء بارد لطفا",
      status: WaiterCallStatus.CREATED
    },
    create: {
      id: "wc_demo_open",
      organizationId: org.id,
      branchId: branch.id,
      tableId: "tbl_demo_12",
      reason: "WATER",
      note: "ماء بارد لطفا",
      status: WaiterCallStatus.CREATED
    }
  });

  await prisma.waiterCall.upsert({
    where: { id: "wc_demo_ack" },
    update: {
      organizationId: org.id,
      branchId: branch.id,
      tableId: "tbl_demo_05",
      reason: "ASSISTANCE",
      note: "طلب إضافي",
      status: WaiterCallStatus.ACKNOWLEDGED
    },
    create: {
      id: "wc_demo_ack",
      organizationId: org.id,
      branchId: branch.id,
      tableId: "tbl_demo_05",
      reason: "ASSISTANCE",
      note: "طلب إضافي",
      status: WaiterCallStatus.ACKNOWLEDGED
    }
  });

  await prisma.waiterCallEvent.upsert({
    where: { id: "wce_demo_ack" },
    update: { waiterCallId: "wc_demo_ack", fromStatus: WaiterCallStatus.CREATED, toStatus: WaiterCallStatus.ACKNOWLEDGED, actorUserId: waiter.id },
    create: { id: "wce_demo_ack", waiterCallId: "wc_demo_ack", fromStatus: WaiterCallStatus.CREATED, toStatus: WaiterCallStatus.ACKNOWLEDGED, actorUserId: waiter.id }
  });

  console.log("Seed completed", {
    organizationId: org.id,
    branchId: branch.id,
    ownerEmail: owner.email,
    ownerPassword: "owner123",
    staffPassword: "demo123",
    sampleTableId: "tbl_demo_12",
    sampleOrderNo: "A-1001"
  });

  console.log("Demo users", {
    owner: "owner@demo.local / owner123",
    cashier: "cashier@demo.local / demo123",
    kitchen: "kitchen@demo.local / demo123",
    waiter: "waiter@demo.local / demo123"
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
