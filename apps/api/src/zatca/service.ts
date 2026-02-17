/**
 * ZATCA E-Invoicing Service Orchestrator
 * Ties together all ZATCA components into a unified service.
 *
 * Flow for generating a compliant invoice:
 * 1. Load ZATCA config for the branch
 * 2. Increment ICV counter atomically
 * 3. Build invoice data from Order
 * 4. Generate unsigned UBL 2.1 XML
 * 5. Sign XML with XAdES (ECDSA-SHA256)
 * 6. Generate QR code (TLV encoded)
 * 7. Inject QR into signed XML
 * 8. Report/Clear with ZATCA API
 * 9. Update invoice & PIH in DB
 */

import { randomUUID } from "crypto";
import { prisma } from "@/src/lib/prisma";
import { buildZatcaXml, buildZatcaXmlForHashing } from "./xml-builder";
import { signInvoiceXml, extractPublicKeyFromCert } from "./signing";
import { computeInvoiceHash, GENESIS_PIH } from "./hashing";
import { generateQrTlv } from "./qr-tlv";
import { ZatcaApiClient } from "./api-client";
import {
  ZatcaInvoiceTypeCode,
  ZatcaInvoiceSubType,
  ZatcaTaxCategory,
  ZatcaPaymentMeansCode,
  ZatcaEnvironment,
  ZatcaStatus,
  type ZatcaInvoiceData,
  type ZatcaInvoiceLine,
  type ZatcaTaxSubtotal,
  type ZatcaAllowanceCharge,
  type ZatcaConfig,
} from "./types";

// ─── Order type from Prisma (simplified) ───

interface OrderWithRelations {
  id: string;
  organizationId: string;
  branchId: string;
  orderNo: string;
  type: string;
  status: string;
  subtotal: any; // Decimal
  taxAmount: any;
  serviceCharge: any;
  discountAmount: any;
  totalAmount: any;
  note?: string | null;
  createdAt: Date;
  items: Array<{
    id: string;
    itemNameAr: string;
    qty: any;
    unitPrice: any;
    lineTotal: any;
    modifiers: Array<{
      nameAr: string;
      priceDelta: any;
    }>;
  }>;
  payments: Array<{
    method: string;
    amount: any;
    status: string;
  }>;
  branch: {
    id: string;
    code: string;
    name: string;
    taxRateBps: number;
    currency: string;
  };
  table?: { code: string } | null;
}

// ─── Helpers ───

function toNum(val: any): number {
  return typeof val === "number" ? val : Number(val);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date): string {
  return d.toISOString().slice(11, 19);
}

function mapPaymentMethod(method: string): ZatcaPaymentMeansCode {
  switch (method.toUpperCase()) {
    case "CASH":
      return ZatcaPaymentMeansCode.CASH;
    case "CARD":
    case "CREDIT_CARD":
    case "DEBIT_CARD":
      return ZatcaPaymentMeansCode.BANK_CARD;
    case "BANK_TRANSFER":
      return ZatcaPaymentMeansCode.BANK_ACCOUNT;
    default:
      return ZatcaPaymentMeansCode.CASH;
  }
}

// ─── Load Branch ZATCA Config ───

async function loadZatcaConfig(branchId: string): Promise<any | null> {
  return prisma.zatcaConfig.findUnique({
    where: { branchId },
  });
}

// ─── Build Invoice Data from Order ───

function buildInvoiceDataFromOrder(
  order: OrderWithRelations,
  config: any,
  icv: number,
  pih: string,
  uuid: string
): ZatcaInvoiceData {
  const taxRatePercent = config.branch?.taxRateBps
    ? config.branch.taxRateBps / 100
    : 15;

  // Determine invoice type
  const isSimplified = true; // POS systems typically issue simplified (B2C) invoices
  const profileId = isSimplified ? "reporting:1.0" : "reporting:1.0";
  const invoiceSubType = isSimplified
    ? ZatcaInvoiceSubType.SIMPLIFIED
    : ZatcaInvoiceSubType.STANDARD;

  // Build supplier party from config
  const supplier = {
    registrationName: `${config.sellerNameAr}${config.sellerNameEn ? ` | ${config.sellerNameEn}` : ""}`,
    vatNumber: config.vatNumber,
    crn: config.crn,
    address: {
      streetName: `${config.streetNameAr}${config.streetNameEn ? ` | ${config.streetNameEn}` : ""}`,
      buildingNumber: config.buildingNumber,
      citySubdivision: `${config.citySubdivisionAr}${config.citySubdivisionEn ? ` | ${config.citySubdivisionEn}` : ""}`,
      cityName: `${config.cityNameAr}${config.cityNameEn ? ` | ${config.cityNameEn}` : ""}`,
      postalZone: config.postalZone,
      countryCode: "SA",
    },
  };

  // Build invoice lines
  const lines: ZatcaInvoiceLine[] = order.items.map((item, idx) => {
    const qty = toNum(item.qty);
    const unitPrice = toNum(item.unitPrice);
    const lineTotal = toNum(item.lineTotal);

    // Add modifier prices to unit price for ZATCA
    const modifierTotal =
      item.modifiers?.reduce((sum, m) => sum + toNum(m.priceDelta), 0) ?? 0;
    const effectiveUnitPrice = unitPrice + modifierTotal / qty;

    const lineExtensionAmount = lineTotal;
    const lineTaxAmount = +(lineExtensionAmount * (taxRatePercent / 100)).toFixed(2);
    const roundingAmount = +(lineExtensionAmount + lineTaxAmount).toFixed(2);

    return {
      id: String(idx + 1),
      name: item.itemNameAr,
      quantity: qty,
      unitCode: "PCE",
      unitPrice: +effectiveUnitPrice.toFixed(2),
      lineDiscount: 0,
      lineExtensionAmount: +lineExtensionAmount.toFixed(2),
      taxCategory: ZatcaTaxCategory.STANDARD,
      taxPercent: taxRatePercent,
      taxAmount: lineTaxAmount,
      roundingAmount,
    };
  });

  // Compute totals
  const lineExtensionAmount = lines.reduce(
    (sum, l) => sum + l.lineExtensionAmount,
    0
  );
  const totalTaxAmount = toNum(order.taxAmount);
  const discountAmount = toNum(order.discountAmount);
  const taxExclusiveAmount = lineExtensionAmount - discountAmount;
  const taxInclusiveAmount = +(taxExclusiveAmount + totalTaxAmount).toFixed(2);
  const payableAmount = toNum(order.totalAmount);

  // Tax subtotals
  const taxSubtotals: ZatcaTaxSubtotal[] = [
    {
      taxableAmount: +taxExclusiveAmount.toFixed(2),
      taxAmount: +totalTaxAmount.toFixed(2),
      taxCategory: ZatcaTaxCategory.STANDARD,
      taxPercent: taxRatePercent,
    },
  ];

  // Allowance/charges (document-level discount)
  const allowanceCharges: ZatcaAllowanceCharge[] = [];
  if (discountAmount > 0) {
    allowanceCharges.push({
      chargeIndicator: false,
      reason: "discount",
      amount: discountAmount,
      taxCategory: ZatcaTaxCategory.STANDARD,
      taxPercent: taxRatePercent,
    });
  }

  // Determine payment means from order payments
  const primaryPayment = order.payments?.[0];
  const paymentMeansCode = primaryPayment
    ? mapPaymentMethod(primaryPayment.method)
    : ZatcaPaymentMeansCode.CASH;

  return {
    profileId,
    id: order.orderNo,
    uuid,
    issueDate: formatDate(order.createdAt),
    issueTime: formatTime(order.createdAt),
    invoiceTypeCode: ZatcaInvoiceTypeCode.INVOICE,
    invoiceSubType,
    documentCurrencyCode: "SAR",
    taxCurrencyCode: "SAR",
    note: order.note || undefined,
    icv,
    pih,
    supplier,
    paymentMeansCode,
    allowanceCharges,
    taxSubtotals,
    totalTaxAmount: +totalTaxAmount.toFixed(2),
    lineExtensionAmount: +lineExtensionAmount.toFixed(2),
    taxExclusiveAmount: +taxExclusiveAmount.toFixed(2),
    taxInclusiveAmount,
    allowanceTotalAmount: +discountAmount.toFixed(2),
    prepaidAmount: 0,
    payableAmount: +payableAmount.toFixed(2),
    lines,
  };
}

// ─── Main Service ───

export interface ZatcaInvoiceResult {
  /** Signed XML content */
  signedXml: string;
  /** Invoice hash (base64) */
  invoiceHash: string;
  /** QR code data (base64 TLV) */
  qrCode: string;
  /** UUIDv4 for this invoice */
  uuid: string;
  /** ICV counter value */
  icv: number;
  /** PIH for next invoice */
  nextPih: string;
  /** ZATCA API response (if submitted) */
  zatcaResponse?: any;
  /** Status after ZATCA submission */
  zatcaStatus: ZatcaStatus;
}

/**
 * Generate a complete ZATCA-compliant e-invoice for an order.
 * Handles the full lifecycle: XML generation → signing → QR → API submission.
 */
export async function generateZatcaInvoice(
  order: OrderWithRelations,
  options?: {
    skipApiSubmission?: boolean;
    invoiceTypeCode?: ZatcaInvoiceTypeCode;
    billingReferenceId?: string;
  }
): Promise<ZatcaInvoiceResult> {
  // 1. Load ZATCA config
  const config = await loadZatcaConfig(order.branchId);
  if (!config || !config.isActive) {
    throw new Error("ZATCA_NOT_CONFIGURED: Branch not configured for e-invoicing");
  }

  // 2. Atomically increment ICV and get current PIH
  const updatedConfig = await prisma.zatcaConfig.update({
    where: { branchId: order.branchId },
    data: { lastIcv: { increment: 1 } },
  });

  const icv = updatedConfig.lastIcv;
  const pih = updatedConfig.lastPih;
  const uuid = randomUUID();

  // 3. Determine which certificate & key to use
  const isProduction = config.environment === ZatcaEnvironment.PRODUCTION;
  const certBase64 = isProduction
    ? config.productionCertBase64
    : config.complianceCertBase64;
  const privateKey = config.privateKeyPem;
  const username = isProduction
    ? config.productionUsername
    : config.complianceUsername;
  const secret = isProduction
    ? config.productionSecret
    : config.complianceSecret;

  if (!certBase64 || !privateKey) {
    throw new Error("ZATCA_NO_CERTIFICATE: No certificate or private key configured");
  }

  // 4. Build invoice data
  const invoiceData = buildInvoiceDataFromOrder(order, config, icv, pih, uuid);

  // Override type for credit/debit notes
  if (options?.invoiceTypeCode) {
    invoiceData.invoiceTypeCode = options.invoiceTypeCode;
  }
  if (options?.billingReferenceId) {
    invoiceData.billingReferenceId = options.billingReferenceId;
  }

  // 5. Generate unsigned XML (without QR)
  const unsignedXml = buildZatcaXml(invoiceData);

  // 6. Sign the XML
  const signingTime = new Date().toISOString().slice(0, 19);
  const signingResult = signInvoiceXml({
    unsignedXml,
    privateKeyBase64: privateKey,
    certificateBase64: certBase64,
    signingTime,
  });

  // 7. Generate QR code
  const publicKey = extractPublicKeyFromCert(certBase64);
  const qrCode = generateQrTlv({
    sellerName: `${config.sellerNameAr}${config.sellerNameEn ? ` | ${config.sellerNameEn}` : ""}`,
    vatNumber: config.vatNumber,
    timestamp: `${invoiceData.issueDate}T${invoiceData.issueTime}`,
    totalWithVat: invoiceData.taxInclusiveAmount.toFixed(2),
    vatAmount: invoiceData.totalTaxAmount.toFixed(2),
    invoiceHash: signingResult.invoiceHash,
    digitalSignature: signingResult.signatureValue,
    publicKey,
  });

  // 8. Rebuild the XML with the QR code injected
  const finalXml = injectQrIntoSignedXml(signingResult.signedXml, qrCode);

  // 9. Compute the PIH for the next invoice (hash of this invoice)
  const xmlForHash = buildZatcaXmlForHashing(invoiceData);
  const nextPih = computeInvoiceHash(xmlForHash);

  // 10. Submit to ZATCA API (if configured and not skipped)
  let zatcaResponse: any = null;
  let zatcaStatus = ZatcaStatus.PENDING;

  if (!options?.skipApiSubmission && username && secret) {
    try {
      const apiClient = new ZatcaApiClient(
        config.environment as ZatcaEnvironment
      );
      const signedXmlBase64 = Buffer.from(finalXml, "utf-8").toString("base64");

      const isSimplified = invoiceData.invoiceSubType.startsWith("02");

      if (isSimplified) {
        // Simplified → Report
        zatcaResponse = await apiClient.reportInvoice(
          username,
          secret,
          signedXmlBase64,
          signingResult.invoiceHash,
          uuid
        );
        zatcaStatus =
          zatcaResponse.reportingStatus === "REPORTED"
            ? ZatcaStatus.REPORTED
            : zatcaResponse.reportingStatus === "NOT_REPORTED"
              ? ZatcaStatus.REJECTED
              : ZatcaStatus.WARNING;
      } else {
        // Standard → Clear
        zatcaResponse = await apiClient.clearInvoice(
          username,
          secret,
          signedXmlBase64,
          signingResult.invoiceHash,
          uuid
        );
        zatcaStatus =
          zatcaResponse.clearanceStatus === "CLEARED"
            ? ZatcaStatus.CLEARED
            : zatcaResponse.clearanceStatus === "NOT_CLEARED"
              ? ZatcaStatus.REJECTED
              : ZatcaStatus.WARNING;
      }
    } catch (error) {
      console.error("[ZATCA] API submission failed:", error);
      zatcaStatus = ZatcaStatus.PENDING; // Will retry
      zatcaResponse = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // 11. Update PIH for next invoice
  await prisma.zatcaConfig.update({
    where: { branchId: order.branchId },
    data: { lastPih: nextPih },
  });

  return {
    signedXml: finalXml,
    invoiceHash: signingResult.invoiceHash,
    qrCode,
    uuid,
    icv,
    nextPih,
    zatcaResponse,
    zatcaStatus,
  };
}

/**
 * Inject QR code base64 data into the signed XML.
 * Replaces or adds the QR AdditionalDocumentReference.
 */
function injectQrIntoSignedXml(signedXml: string, qrBase64: string): string {
  const qrBlock = `<cac:AdditionalDocumentReference>
        <cbc:ID>QR</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrBase64}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
</cac:AdditionalDocumentReference>`;

  // Check if QR reference already exists
  if (signedXml.includes("<cbc:ID>QR</cbc:ID>")) {
    return signedXml.replace(
      /<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/,
      qrBlock
    );
  }

  // Insert before cac:Signature
  return signedXml.replace(
    /<cac:Signature>/,
    `${qrBlock}<cac:Signature>`
  );
}

/**
 * Retry submitting a pending ZATCA invoice.
 * Used for invoices that failed API submission.
 */
export async function retryZatcaSubmission(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice || !invoice.zatcaXml || !invoice.zatcaUuid) {
    throw new Error("Invoice not found or not ZATCA-enabled");
  }

  if (
    invoice.zatcaStatus === ZatcaStatus.REPORTED ||
    invoice.zatcaStatus === ZatcaStatus.CLEARED
  ) {
    return; // Already submitted successfully
  }

  const config = await loadZatcaConfig(invoice.branchId);
  if (!config) throw new Error("ZATCA config not found for branch");

  const isProduction = config.environment === ZatcaEnvironment.PRODUCTION;
  const username = isProduction
    ? config.productionUsername
    : config.complianceUsername;
  const secret = isProduction
    ? config.productionSecret
    : config.complianceSecret;

  if (!username || !secret) {
    throw new Error("No ZATCA credentials configured");
  }

  const apiClient = new ZatcaApiClient(config.environment as ZatcaEnvironment);
  const signedXmlBase64 = Buffer.from(invoice.zatcaXml, "utf-8").toString(
    "base64"
  );

  const isSimplified = invoice.zatcaInvoiceSubType?.startsWith("02") ?? true;

  let response: any;
  let status: ZatcaStatus;

  if (isSimplified) {
    response = await apiClient.reportInvoice(
      username,
      secret,
      signedXmlBase64,
      invoice.zatcaInvoiceHash!,
      invoice.zatcaUuid
    );
    status =
      response.reportingStatus === "REPORTED"
        ? ZatcaStatus.REPORTED
        : ZatcaStatus.REJECTED;
  } else {
    response = await apiClient.clearInvoice(
      username,
      secret,
      signedXmlBase64,
      invoice.zatcaInvoiceHash!,
      invoice.zatcaUuid
    );
    status =
      response.clearanceStatus === "CLEARED"
        ? ZatcaStatus.CLEARED
        : ZatcaStatus.REJECTED;
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      zatcaStatus: status,
      zatcaResponse: response as any,
      zatcaReportedAt: new Date(),
    },
  });
}

/**
 * Generate CSR configuration properties for ZATCA SDK.
 */
export function generateCsrProperties(config: any): string {
  const lines = [
    `csr.common.name=${config.csrCommonName || `TST-${config.crn}-${config.vatNumber}`}`,
    `csr.serial.number=${config.csrSerialNumber || `1-TST|2-TST|3-${randomUUID()}`}`,
    `csr.organization.identifier=${config.vatNumber}`,
    `csr.organization.unit.name=${config.sellerNameAr}`,
    `csr.organization.name=${config.sellerNameEn || config.sellerNameAr}`,
    `csr.country.name=SA`,
    `csr.invoice.type=${config.csrInvoiceType || "1100"}`,
    `csr.location.address=${config.postalZone}`,
    `csr.industry.business.category=${config.businessCategory || "Supply activities"}`,
  ];
  return lines.join("\n");
}
