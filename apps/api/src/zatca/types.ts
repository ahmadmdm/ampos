/**
 * ZATCA E-Invoicing Types
 * Based on ZATCA SDK v238-R4.0.0 and KSA e-invoicing specifications
 */

// ─── Invoice Types ───

/** ZATCA invoice type codes (UNCL 1001) */
export enum ZatcaInvoiceTypeCode {
  /** Standard tax invoice */
  INVOICE = "388",
  /** Credit note */
  CREDIT_NOTE = "383",
  /** Debit note */
  DEBIT_NOTE = "381",
}

/** ZATCA invoice sub-type (7-digit bitmask) */
export enum ZatcaInvoiceSubType {
  /** Standard B2B invoice — 01XXXXX */
  STANDARD = "0100000",
  /** Simplified B2C invoice — 02XXXXX */
  SIMPLIFIED = "0200000",
  /** Simplified third-party */
  SIMPLIFIED_THIRD_PARTY = "0211010",
  /** Simplified nominal */
  SIMPLIFIED_NOMINAL = "0212010",
  /** Simplified exports */
  SIMPLIFIED_EXPORTS = "0213010",
  /** Simplified summary */
  SIMPLIFIED_SUMMARY = "0214010",
  /** Simplified self-billed */
  SIMPLIFIED_SELF_BILLED = "0215010",
}

/** Tax category codes as per ZATCA */
export enum ZatcaTaxCategory {
  /** Standard rate (15%) */
  STANDARD = "S",
  /** Zero-rated */
  ZERO_RATED = "Z",
  /** Exempt */
  EXEMPT = "E",
  /** Out of scope */
  OUT_OF_SCOPE = "O",
}

/** Payment means codes (UNCL 4461) */
export enum ZatcaPaymentMeansCode {
  CASH = "10",
  CREDIT = "30",
  BANK_ACCOUNT = "42",
  BANK_CARD = "48",
}

/** ZATCA compliance/reporting status */
export enum ZatcaStatus {
  PENDING = "PENDING",
  REPORTED = "REPORTED",
  CLEARED = "CLEARED",
  REJECTED = "REJECTED",
  WARNING = "WARNING",
}

/** ZATCA environment type */
export enum ZatcaEnvironment {
  SANDBOX = "sandbox",
  SIMULATION = "simulation",
  PRODUCTION = "production",
}

// ─── Data Structures ───

export interface ZatcaAddress {
  streetName: string;
  buildingNumber: string;
  citySubdivision: string;
  cityName: string;
  postalZone: string;
  countryCode: string; // ISO 3166-1 alpha-2
}

export interface ZatcaParty {
  registrationName: string;
  vatNumber: string; // 15-digit TIN
  crn?: string; // Commercial Registration Number
  address: ZatcaAddress;
}

export interface ZatcaInvoiceLine {
  id: string; // sequential line number
  name: string;
  quantity: number;
  unitCode: string; // "PCE" for pieces
  unitPrice: number; // price before discount
  lineDiscount: number; // discount amount at line level
  lineExtensionAmount: number; // qty * unitPrice - lineDiscount
  taxCategory: ZatcaTaxCategory;
  taxPercent: number; // e.g. 15.00
  taxAmount: number; // calculated tax for this line
  roundingAmount: number; // lineExtensionAmount + taxAmount
}

export interface ZatcaTaxSubtotal {
  taxableAmount: number;
  taxAmount: number;
  taxCategory: ZatcaTaxCategory;
  taxPercent: number;
  exemptionReasonCode?: string;
  exemptionReason?: string;
}

export interface ZatcaAllowanceCharge {
  chargeIndicator: boolean;
  reason: string;
  amount: number;
  taxCategory: ZatcaTaxCategory;
  taxPercent: number;
}

export interface ZatcaInvoiceData {
  // ─── Header ───
  profileId: string; // "reporting:1.0" or "clearance:1.0"
  id: string; // invoice identifier (e.g. INV-001)
  uuid: string; // unique UUID v4
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:mm:ss
  invoiceTypeCode: ZatcaInvoiceTypeCode;
  invoiceSubType: ZatcaInvoiceSubType;
  documentCurrencyCode: string; // SAR
  taxCurrencyCode: string; // SAR
  note?: string;

  // ─── References ───
  icv: number; // Invoice Counter Value (sequential)
  pih: string; // Previous Invoice Hash (base64)

  // ─── Billing reference (for credit/debit notes) ───
  billingReferenceId?: string;

  // ─── Delivery (required for standard invoices) ───
  actualDeliveryDate?: string; // YYYY-MM-DD

  // ─── Parties ───
  supplier: ZatcaParty;
  customer?: ZatcaParty; // optional for simplified invoices

  // ─── Payment ───
  paymentMeansCode: ZatcaPaymentMeansCode;

  // ─── Allowances/Charges (document level) ───
  allowanceCharges: ZatcaAllowanceCharge[];

  // ─── Tax ───
  taxSubtotals: ZatcaTaxSubtotal[];
  totalTaxAmount: number;

  // ─── Monetary Totals ───
  lineExtensionAmount: number; // sum of line amounts
  taxExclusiveAmount: number; // lineExtensionAmount - allowances + charges
  taxInclusiveAmount: number; // taxExclusiveAmount + totalTaxAmount
  allowanceTotalAmount: number;
  prepaidAmount: number;
  payableAmount: number;

  // ─── Lines ───
  lines: ZatcaInvoiceLine[];
}

// ─── Config ───

export interface ZatcaCsrConfig {
  commonName: string; // e.g. "TST-886431145-399999999900003"
  serialNumber: string; // e.g. "1-TST|2-TST|3-uuid"
  organizationIdentifier: string; // 15-digit VAT number
  organizationUnitName: string; // e.g. "Riyadh Branch"
  organizationName: string; // e.g. "Maximum Speed Tech Supply LTD"
  countryName: string; // "SA"
  invoiceType: string; // "1100" (both standard & simplified)
  locationAddress: string; // e.g. "RRRD2929"
  businessCategory: string; // e.g. "Supply activities"
}

export interface ZatcaConfig {
  id: string;
  organizationId: string;
  branchId: string;
  environment: ZatcaEnvironment;
  vatNumber: string;
  crn: string;
  sellerNameAr: string;
  sellerNameEn: string;
  streetNameAr: string;
  streetNameEn: string;
  buildingNumber: string;
  citySubdivisionAr: string;
  citySubdivisionEn: string;
  cityNameAr: string;
  cityNameEn: string;
  postalZone: string;
  businessCategory: string;
  // Certificates
  csrBase64?: string;
  privateKeyBase64?: string;
  certificateBase64?: string;
  certificateHash?: string;
  // ZATCA API credentials
  zatcaUsername?: string; // binarySecurityToken
  zatcaSecret?: string; // secret from CCSID
  // Counters
  lastIcv: number;
  lastPih: string; // base64 hash of last invoice
  isActive: boolean;
}

export interface ZatcaSigningResult {
  signedXml: string;
  invoiceHash: string; // base64 SHA-256 of canonicalized invoice
  qrCode: string; // base64-encoded TLV QR data
  digitalSignature: string; // base64 ECDSA signature
}

export interface ZatcaApiResponse {
  reportingStatus?: string;
  clearanceStatus?: string;
  validationResults?: {
    status: string;
    infoMessages?: Array<{ type: string; code: string; category: string; message: string; status: string }>;
    warningMessages?: Array<{ type: string; code: string; category: string; message: string; status: string }>;
    errorMessages?: Array<{ type: string; code: string; category: string; message: string; status: string }>;
  };
  clearedInvoice?: string; // base64 XML (for clearance)
}

// ─── TLV Tags for QR Code ───

export enum QrTlvTag {
  SELLER_NAME = 1,
  VAT_NUMBER = 2,
  TIMESTAMP = 3,
  TOTAL_WITH_VAT = 4,
  VAT_AMOUNT = 5,
  INVOICE_HASH = 6,
  ECDSA_SIGNATURE = 7,
  ECDSA_PUBLIC_KEY = 8,
  ECDSA_STAMP_ISSUER = 9,
}
