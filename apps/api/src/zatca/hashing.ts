/**
 * ZATCA Invoice Hashing
 * Implements SHA-256 hashing for ZATCA e-invoicing:
 * - Invoice hash computation (for signing)
 * - PIH (Previous Invoice Hash) chain management
 *
 * Per ZATCA spec, the invoice hash is computed on the canonicalized XML
 * after removing: UBLExtensions, cac:Signature, and QR AdditionalDocumentReference.
 */

import { createHash } from "crypto";

/** Default PIH for the first invoice in a chain (SHA-256 of zero/genesis) */
export const GENESIS_PIH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

/**
 * Compute the SHA-256 hash of an invoice XML string.
 * Returns the hash as a base64-encoded string.
 *
 * @param xmlForHashing - The XML content with UBLExtensions, Signature and QR removed
 * @returns Base64-encoded SHA-256 hash
 */
export function computeInvoiceHash(xmlForHashing: string): string {
  const hash = createHash("sha256").update(xmlForHashing, "utf-8").digest();
  return hash.toString("base64");
}

/**
 * Compute the hex SHA-256 hash and return as base64
 * (ZATCA PIH format: base64 of the hex digest)
 */
export function computePihHash(xmlForHashing: string): string {
  const hexHash = createHash("sha256").update(xmlForHashing, "utf-8").digest("hex");
  return Buffer.from(hexHash).toString("base64");
}

/**
 * Compute SHA-256 hash of raw bytes and return as base64.
 * Used for certificate hashing in XAdES SignedProperties.
 */
export function sha256Base64(data: Buffer | string): string {
  const input = typeof data === "string" ? Buffer.from(data) : data;
  return createHash("sha256").update(input).digest("base64");
}

/**
 * Compute SHA-256 hash of raw bytes and return as hex.
 */
export function sha256Hex(data: Buffer | string): string {
  const input = typeof data === "string" ? Buffer.from(data) : data;
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Get the SHA-256 hash of a certificate (DER or PEM).
 * For XAdES SignedProperties CertDigest.
 * Returns base64 of the hex hash (ZATCA convention).
 */
export function computeCertificateHash(certBase64: string): string {
  const certDer = Buffer.from(certBase64, "base64");
  const hexHash = createHash("sha256").update(certDer).digest("hex");
  return Buffer.from(hexHash).toString("base64");
}

/**
 * Strips the XML content of elements that should not be hashed per ZATCA spec:
 * - ext:UBLExtensions
 * - cac:Signature
 * - AdditionalDocumentReference with ID='QR'
 *
 * This is a lightweight string-based approach. For production, use a proper XML
 * canonicalization library.
 */
export function stripXmlForHashing(fullXml: string): string {
  let xml = fullXml;

  // Remove UBLExtensions block
  xml = xml.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, "");

  // Remove cac:Signature block
  xml = xml.replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/g, "");

  // Remove QR AdditionalDocumentReference
  xml = xml.replace(
    /<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/g,
    ""
  );

  // Clean up excessive whitespace/empty lines
  xml = xml
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  return xml;
}
