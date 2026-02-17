import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail, ok } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";

/**
 * POST /api/pos/coupons/validate
 * Body: { code, branchId, orderAmount }
 * Returns the coupon detail + computed discount if valid
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req);
    const { code, branchId, orderAmount } = await req.json();

    if (!code || !branchId) return fail("code and branchId are required", 400);

    const coupon = await prisma.coupon.findUnique({
      where: { organizationId_code: { organizationId: ctx.organizationId, code: code.toUpperCase() } },
    });

    if (!coupon || !coupon.isActive) return fail("قسيمة غير صالحة", 404);

    // Check branch scope
    if (coupon.branchId && coupon.branchId !== branchId) {
      return fail("القسيمة غير متاحة لهذا الفرع", 400);
    }

    // Check validity dates
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) return fail("القسيمة لم تبدأ بعد", 400);
    if (coupon.validUntil && now > coupon.validUntil) return fail("القسيمة منتهية الصلاحية", 400);

    // Check usage limit
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      return fail("تم استنفاد عدد الاستخدامات المسموح", 400);
    }

    // Check minimum order amount
    const amount = Number(orderAmount ?? 0);
    if (coupon.minOrderAmount != null && amount < Number(coupon.minOrderAmount)) {
      return fail(`الحد الأدنى للطلب ${coupon.minOrderAmount} ر.س`, 400);
    }

    // Compute discount
    let discount: number;
    if (coupon.type === "PERCENTAGE") {
      discount = (amount * Number(coupon.value)) / 10000; // value is in bps
      if (coupon.maxDiscount != null) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else {
      discount = Number(coupon.value);
    }
    discount = Math.round(discount * 100) / 100;

    return ok({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, msg === "UNAUTHORIZED" ? 401 : 400);
  }
}
