import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { fail } from "@/src/lib/http";
import { getAuthContext } from "@/src/lib/auth";
import { assertPermission } from "@/src/lib/rbac";
import { assertBranchScope } from "@/src/lib/tenant";
import { writeAudit } from "@/src/lib/audit";
import PDFDocument from "pdfkit";
import { generateZatcaInvoice, retryZatcaSubmission, ZatcaStatus } from "@/src/zatca";
import { decodeQrTlv } from "@/src/zatca/qr-tlv";
import { prepareText } from "@/src/lib/arabic-text";

// ── Arabic font paths (Amiri — downloaded by Dockerfile) ──────────────────────
const FONT_DIR    = path.join(process.cwd(), "fonts");
const AMIRI_REG   = path.join(FONT_DIR, "Amiri-Regular.ttf");
const AMIRI_BOLD  = path.join(FONT_DIR, "Amiri-Bold.ttf");

/** Register Amiri once when first needed; falls back gracefully to Helvetica */
let arabicFontsRegistered = false;
function registerArabicFonts(doc: InstanceType<typeof PDFDocument>): boolean {
  if (arabicFontsRegistered) return true;
  if (!fs.existsSync(AMIRI_REG)) return false;
  doc.registerFont("Amiri",     AMIRI_REG);
  doc.registerFont("Amiri-Bold", fs.existsSync(AMIRI_BOLD) ? AMIRI_BOLD : AMIRI_REG);
  arabicFontsRegistered = true;
  return true;
}

function ensurePdfKitDataFiles() {
  const targetDir = path.join(
    process.cwd(),
    ".next/server/app/api/orders/[orderId]/invoice/data"
  );

  const requiredFile = path.join(targetDir, "Helvetica.afm");
  if (fs.existsSync(requiredFile)) {
    return;
  }

  const sourceCandidates = [
    path.join(process.cwd(), "node_modules/pdfkit/js/data"),
    path.join(process.cwd(), "../../node_modules/pdfkit/js/data"),
  ];
  const sourceDir = sourceCandidates.find((candidate) => fs.existsSync(candidate));

  if (!sourceDir) {
    throw new Error("PDFKIT_DATA_DIR_NOT_FOUND");
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir)) {
    fs.copyFileSync(path.join(sourceDir, entry), path.join(targetDir, entry));
  }
}

/** Generate a professional Arabic-ready PDF invoice for an order */
function buildInvoicePdf(order: any, branch: any, zatcaData?: {
  qrCode?: string;
  invoiceHash?: string;
  zatcaUuid?: string;
  zatcaStatus?: string;
  icv?: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ensurePdfKitDataFiles();

    const doc = new PDFDocument({
      size: [226.77, 600], // ~80mm thermal receipt width
      margin: 10,
      bufferPages: true,
    });

    // Register Amiri Arabic font; falls back to Helvetica if not downloaded yet
    const hasArabic  = registerArabicFonts(doc);
    const fontAr     = hasArabic ? "Amiri"      : "Helvetica";
    const fontArBold = hasArabic ? "Amiri-Bold" : "Helvetica-Bold";

    /** Selects the Arabic or bold-Arabic font on the document */
    const useAr = (bold = false) => doc.font(bold ? fontArBold : fontAr);

    /** Reshape + reverse Arabic text for LTR PDFKit rendering */
    const ar = (text: string) => (hasArabic ? prepareText(text) : text);

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const w = 206.77; // usable width

    // ─── Header ──────────────────────────────────────────────────────────────
    useAr(true);
    doc.fontSize(13).text(ar(branch.name || "POS1"), 10, 14, { width: w, align: "right" });
    doc.fontSize(7.5).font("Helvetica")
       .text(`Branch: ${branch.code}`, 10, 32, { width: w, align: "center" });
    doc.moveTo(10, 46).lineTo(w + 10, 46).lineWidth(0.5).stroke();

    // ─── Invoice info ─────────────────────────────────────────────────────────
    let y = 52;
    useAr(true);
    doc.fontSize(10).text(ar("فاتورة ضريبية / TAX INVOICE"), 10, y, { width: w, align: "center" });
    y += 18;

    const dateStr = new Date(order.createdAt).toLocaleString("en-SA", {
      dateStyle: "short",
      timeStyle: "short",
    });

    doc.fontSize(7.5).font("Helvetica");
    doc.text(`Invoice #: ${order.orderNo}`, 10, y); y += 12;
    doc.text(`Date: ${dateStr}`,             10, y); y += 12;
    doc.text(`Type: ${order.type}`,          10, y); y += 12;
    if (order.table) { doc.text(`Table: ${order.table.code}`, 10, y); y += 12; }

    doc.moveTo(10, y + 2).lineTo(w + 10, y + 2).dash(2, { space: 2 }).stroke();
    doc.undash(); y += 8;

    // ─── Items header ─────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(7.5);
    doc.text("Qty",   10,     y, { width: 25, align: "center" });
    doc.text("Price", 35,     y, { width: 45, align: "right"  });
    doc.text("Total", 80,     y, { width: 45, align: "right"  });
    useAr(true);
    doc.fontSize(7.5).text(ar("الصنف"), 125, y, { width: w - 115, align: "right" });
    y += 12;
    doc.moveTo(10, y).lineTo(w + 10, y).lineWidth(0.3).stroke(); y += 4;

    // ─── Items ───────────────────────────────────────────────────────────────
    for (const item of order.items) {
      if (y > 540) { doc.addPage(); y = 10; }

      const qty       = Number(item.qty);
      const price     = Number(item.unitPrice).toFixed(2);
      const lineTotal = Number(item.lineTotal).toFixed(2);

      // Item name — Arabic, right-aligned
      useAr(false);
      doc.fontSize(7.5).text(ar(item.itemNameAr || "—"), 125, y, { width: w - 115, align: "right" });

      // Numbers — Helvetica, left side
      doc.font("Helvetica").fontSize(7.5);
      doc.text(`${qty}`, 10,  y, { width: 25, align: "center" });
      doc.text(price,    35,  y, { width: 45, align: "right"  });
      doc.text(lineTotal, 80, y, { width: 45, align: "right"  });
      y += 13;

      if (item.modifiers?.length) {
        doc.fillColor("#555");
        for (const mod of item.modifiers) {
          if (y > 540) { doc.addPage(); y = 10; }
          const delta    = Number(mod.priceDelta);
          const deltaStr = delta !== 0 ? ` (+${delta.toFixed(2)})` : "";
          useAr(false);
          doc.fontSize(6.5).text(ar(mod.nameAr) + deltaStr, 14, y, { width: w - 24, align: "right" });
          y += 10;
        }
        doc.fillColor("#000");
      }
    }

    // ─── Separator ───────────────────────────────────────────────────────────
    doc.moveTo(10, y + 2).lineTo(w + 10, y + 2).dash(2, { space: 2 }).stroke();
    doc.undash(); y += 8;

    // ─── Totals ───────────────────────────────────────────────────────────────
    const drawTotal = (labelAr: string, val: string, bold = false) => {
      const fs = bold ? 9 : 7.5;
      if (bold) doc.moveTo(10, y - 2).lineTo(w + 10, y - 2).lineWidth(0.5).stroke();
      useAr(bold);
      doc.fontSize(fs).text(ar(labelAr), 10, y, { width: 120, align: "right" });
      doc.font("Helvetica").fontSize(fs).text(val, 130, y, { width: w - 120, align: "right" });
      y += bold ? 15 : 12;
    };

    drawTotal("المجموع الفرعي",       `${Number(order.subtotal).toFixed(2)} SAR`);
    drawTotal("ضريبة القيمة المضافة", `${Number(order.taxAmount).toFixed(2)} SAR`);
    if (Number(order.serviceCharge) > 0)
      drawTotal("رسوم الخدمة",        `${Number(order.serviceCharge).toFixed(2)} SAR`);
    if (Number(order.discountAmount) > 0)
      drawTotal("خصم",                `-${Number(order.discountAmount).toFixed(2)} SAR`);
    drawTotal("الإجمالي",             `${Number(order.totalAmount).toFixed(2)} SAR`, true);

    // ─── Payment ──────────────────────────────────────────────────────────────
    if (order.payments?.length) {
      y += 2; doc.font("Helvetica").fontSize(7);
      for (const p of order.payments) {
        doc.text(`Payment: ${p.method} — ${Number(p.amount).toFixed(2)} SAR (${p.status})`, 10, y, { width: w });
        y += 10;
      }
    }

    // ─── ZATCA Compliance Footer ──────────────────────────────────────────────
    if (zatcaData?.zatcaUuid) {
      y += 4;
      doc.moveTo(10, y).lineTo(w + 10, y).lineWidth(0.3).stroke(); y += 6;
      useAr(true);
      doc.fontSize(7).text(ar("فاتورة إلكترونية متوافقة مع هيئة الزكاة"),
        10, y, { width: w, align: "center" }); y += 10;
      doc.font("Helvetica").fontSize(6);
      doc.text(`UUID:   ${zatcaData.zatcaUuid}`,                          10, y, { width: w }); y += 8;
      if (zatcaData.icv)
        { doc.text(`ICV:    ${zatcaData.icv}`,                            10, y, { width: w }); y += 8; }
      if (zatcaData.invoiceHash)
        { doc.text(`Hash:   ${zatcaData.invoiceHash.substring(0, 32)}…`,  10, y, { width: w }); y += 8; }
      doc.text(`Status: ${zatcaData.zatcaStatus ?? "PENDING"}`,           10, y, { width: w }); y += 8;
      if (zatcaData.qrCode) {
        useAr(false);
        doc.fontSize(6).text(ar("امسح رمز QR للتحقق من الفاتورة"),        10, y, { width: w, align: "right" }); y += 8;
      }
    }

    // ─── Footer ───────────────────────────────────────────────────────────────
    y += 6;
    doc.moveTo(10, y).lineTo(w + 10, y).lineWidth(0.3).stroke(); y += 8;
    useAr(false);
    doc.fontSize(7).text(ar("شكراً لزيارتكم — Thank you for visiting"),
      10, y, { width: w, align: "center" }); y += 10;
    doc.font("Helvetica").fontSize(6)
       .text("Powered by AMPOS | ZATCA Compliant", 10, y, { width: w, align: "center" });

    doc.end();
  });
}

// ─── GET: Retrieve or generate ZATCA-compliant invoice ───
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:read");

    const format = req.nextUrl.searchParams.get("format"); // "xml" | "json" | default "pdf"

    // Check for existing invoice
    const existing = await prisma.invoice.findUnique({ where: { orderId } });
    if (existing) {
      assertBranchScope(ctx, existing.branchId);

      // Return XML if requested
      if (format === "xml" && existing.zatcaXml) {
        return new Response(existing.zatcaXml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml",
            "Content-Disposition": `inline; filename="invoice-${existing.invoiceNo}.xml"`,
          },
        });
      }

      // Return JSON metadata
      if (format === "json") {
        return Response.json({
          id: existing.id,
          invoiceNo: existing.invoiceNo,
          orderId: existing.orderId,
          totalAmount: Number(existing.totalAmount),
          taxAmount: Number(existing.taxAmount),
          zatcaUuid: existing.zatcaUuid,
          zatcaIcv: existing.zatcaIcv,
          zatcaStatus: existing.zatcaStatus,
          zatcaInvoiceType: existing.zatcaInvoiceType,
          zatcaInvoiceSubType: existing.zatcaInvoiceSubType,
          qrCode: existing.zatcaQrCode,
          invoiceHash: existing.zatcaInvoiceHash,
          zatcaResponse: existing.zatcaResponse,
          createdAt: existing.createdAt,
          reportedAt: existing.zatcaReportedAt,
        });
      }

      // Default: return PDF
      return new Response(existing.pdfData, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="invoice-${existing.invoiceNo}.pdf"`,
        },
      });
    }

    // Fetch order with items + modifiers
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { modifiers: true } },
        payments: true,
        table: true,
        branch: true,
      },
    });

    if (!order) return fail("ORDER_NOT_FOUND", 404);
    assertBranchScope(ctx, order.branchId);

    // ─── ZATCA E-Invoicing Generation ───
    let zatcaResult: any = null;
    const zatcaConfig = await prisma.zatcaConfig.findUnique({
      where: { branchId: order.branchId },
    });

    if (zatcaConfig?.isActive) {
      try {
        zatcaResult = await generateZatcaInvoice(order as any);
      } catch (err) {
        console.error("[Invoice] ZATCA generation failed, falling back to basic invoice:", err);
        // Continue with basic PDF-only invoice
      }
    }

    // Generate PDF (with ZATCA data if available)
    const pdfData = await buildInvoicePdf(order, order.branch, zatcaResult ? {
      qrCode: zatcaResult.qrCode,
      invoiceHash: zatcaResult.invoiceHash,
      zatcaUuid: zatcaResult.uuid,
      zatcaStatus: zatcaResult.zatcaStatus,
      icv: zatcaResult.icv,
    } : undefined);

    // Store in DB with ZATCA fields + audit
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: order.organizationId,
          branchId: order.branchId,
          orderId: order.id,
          invoiceNo: order.orderNo,
          totalAmount: order.totalAmount,
          taxAmount: order.taxAmount,
          pdfData,
          // ZATCA fields
          ...(zatcaResult && {
            zatcaUuid: zatcaResult.uuid,
            zatcaIcv: zatcaResult.icv,
            zatcaPih: zatcaResult.nextPih,
            zatcaInvoiceHash: zatcaResult.invoiceHash,
            zatcaXml: zatcaResult.signedXml,
            zatcaQrCode: zatcaResult.qrCode,
            zatcaSignature: zatcaResult.signedXml ? "signed" : null,
            zatcaInvoiceType: "388",
            zatcaInvoiceSubType: "0200000",
            zatcaStatus: zatcaResult.zatcaStatus,
            zatcaResponse: zatcaResult.zatcaResponse ?? undefined,
            zatcaReportedAt:
              zatcaResult.zatcaStatus === ZatcaStatus.REPORTED ||
              zatcaResult.zatcaStatus === ZatcaStatus.CLEARED
                ? new Date()
                : undefined,
          }),
        },
      });

      await writeAudit({
        tx,
        organizationId: order.organizationId,
        branchId: order.branchId,
        userId: ctx.userId,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: inv.id,
        afterJson: {
          invoiceNo: inv.invoiceNo,
          orderId: order.id,
          totalAmount: Number(order.totalAmount),
          zatcaUuid: zatcaResult?.uuid,
          zatcaStatus: zatcaResult?.zatcaStatus,
          zatcaIcv: zatcaResult?.icv,
        } as never,
        requestId: req.headers.get("x-request-id") ?? undefined,
      });

      return inv;
    });

    // Return based on format
    if (format === "xml" && invoice.zatcaXml) {
      return new Response(invoice.zatcaXml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNo}.xml"`,
        },
      });
    }

    if (format === "json") {
      return Response.json({
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        orderId: invoice.orderId,
        totalAmount: Number(invoice.totalAmount),
        taxAmount: Number(invoice.taxAmount),
        zatcaUuid: invoice.zatcaUuid,
        zatcaIcv: invoice.zatcaIcv,
        zatcaStatus: invoice.zatcaStatus,
        qrCode: invoice.zatcaQrCode,
        invoiceHash: invoice.zatcaInvoiceHash,
        createdAt: invoice.createdAt,
      });
    }

    return new Response(pdfData, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNo}.pdf"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}

// ─── DELETE: Regenerate invoice (delete existing so next GET creates fresh) ───
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const existing = await prisma.invoice.findUnique({ where: { orderId } });
    if (!existing) return fail("INVOICE_NOT_FOUND", 404);
    assertBranchScope(ctx, existing.branchId);

    // Prevent deletion of ZATCA-reported/cleared invoices
    if (
      existing.zatcaStatus === "REPORTED" ||
      existing.zatcaStatus === "CLEARED"
    ) {
      return fail("ZATCA_INVOICE_IMMUTABLE: Cannot delete a ZATCA-reported/cleared invoice. Issue a credit note instead.", 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.delete({ where: { orderId } });

      await writeAudit({
        tx,
        organizationId: existing.organizationId,
        branchId: existing.branchId,
        userId: ctx.userId,
        action: "INVOICE_DELETED",
        entityType: "Invoice",
        entityId: existing.id,
        beforeJson: { invoiceNo: existing.invoiceNo, orderId, zatcaUuid: existing.zatcaUuid } as never,
        requestId: req.headers.get("x-request-id") ?? undefined,
      });
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}

// ─── POST: Retry ZATCA submission for a pending invoice ───
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const ctx = getAuthContext(req);
    assertPermission(ctx, "orders:write");

    const existing = await prisma.invoice.findUnique({ where: { orderId } });
    if (!existing) return fail("INVOICE_NOT_FOUND", 404);
    assertBranchScope(ctx, existing.branchId);

    if (!existing.zatcaUuid) {
      return fail("NOT_ZATCA_INVOICE: This invoice was not generated with ZATCA compliance", 400);
    }

    if (
      existing.zatcaStatus === "REPORTED" ||
      existing.zatcaStatus === "CLEARED"
    ) {
      return Response.json({
        message: "Invoice already submitted to ZATCA",
        status: existing.zatcaStatus,
      });
    }

    await retryZatcaSubmission(existing.id);

    const updated = await prisma.invoice.findUnique({ where: { orderId } });

    await writeAudit({
      organizationId: existing.organizationId,
      branchId: existing.branchId,
      userId: ctx.userId,
      action: "ZATCA_RETRY",
      entityType: "Invoice",
      entityId: existing.id,
      afterJson: {
        zatcaStatus: updated?.zatcaStatus,
        zatcaUuid: existing.zatcaUuid,
      } as never,
      requestId: req.headers.get("x-request-id") ?? undefined,
    });

    return Response.json({
      message: "ZATCA submission retried",
      status: updated?.zatcaStatus,
      response: updated?.zatcaResponse,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return fail(msg, 400);
  }
}
