/**
 * ZATCA E-Invoicing Module
 * Saudi Arabia's e-invoicing compliance (فاتورة إلكترونية)
 *
 * This module provides a complete implementation of ZATCA Phase 2 e-invoicing:
 * - UBL 2.1 XML invoice generation
 * - XAdES ECDSA-SHA256 digital signing
 * - TLV QR code generation
 * - SHA-256 invoice hash chain (PIH)
 * - ZATCA API integration (reporting/clearance)
 * - CSR & certificate management
 */

export * from "./types";
export { buildZatcaXml, buildZatcaXmlForHashing } from "./xml-builder";
export { signInvoiceXml, extractCertInfo, extractPublicKeyFromCert } from "./signing";
export { computeInvoiceHash, computePihHash, computeCertificateHash, sha256Base64, sha256Hex, stripXmlForHashing, GENESIS_PIH } from "./hashing";
export { generateQrTlv, decodeQrTlv } from "./qr-tlv";
export { ZatcaApiClient } from "./api-client";
export { generateZatcaInvoice, retryZatcaSubmission, generateCsrProperties } from "./service";
export type { ZatcaInvoiceResult } from "./service";
export type { QrCodeInput } from "./qr-tlv";
export type { SigningInput, SigningOutput } from "./signing";
