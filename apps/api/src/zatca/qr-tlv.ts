/**
 * ZATCA QR Code TLV (Tag-Length-Value) Generator
 * Generates ZATCA Phase 2 compliant QR codes with digital signature data.
 *
 * TLV Structure per ZATCA spec:
 *   Tag 1: Seller Name (UTF-8)
 *   Tag 2: VAT Number (UTF-8)
 *   Tag 3: Timestamp ISO 8601 (UTF-8)
 *   Tag 4: Total with VAT (UTF-8)
 *   Tag 5: VAT Amount (UTF-8)
 *   Tag 6: Invoice Hash (raw bytes)
 *   Tag 7: ECDSA Signature (raw bytes)
 *   Tag 8: ECDSA Public Key (raw bytes)
 *   Tag 9: Certificate Stamp Issuer (optional, raw bytes)
 */

import { QrTlvTag } from "./types";

/**
 * Encode a single TLV entry.
 * For tags 1-5, value is a UTF-8 string.
 * For tags 6-9, value can be a Buffer or base64 string.
 */
function encodeTlv(tag: number, value: string | Buffer): Buffer {
  const valueBuffer = typeof value === "string" ? Buffer.from(value, "utf-8") : value;
  const length = valueBuffer.length;

  // Tag and length can be multi-byte for large values
  // ZATCA uses simple TLV: 1 byte tag, variable length encoding
  if (length > 255) {
    // Extended length: tag(1) + 0x82(1) + length(2 big-endian) + value
    const buf = Buffer.alloc(1 + 1 + 2 + length);
    buf.writeUInt8(tag, 0);
    buf.writeUInt8(0x82, 1); // two-byte length marker
    buf.writeUInt16BE(length, 2);
    valueBuffer.copy(buf, 4);
    return buf;
  } else if (length > 127) {
    // One-byte extended: tag(1) + 0x81(1) + length(1) + value
    const buf = Buffer.alloc(1 + 1 + 1 + length);
    buf.writeUInt8(tag, 0);
    buf.writeUInt8(0x81, 1);
    buf.writeUInt8(length, 2);
    valueBuffer.copy(buf, 3);
    return buf;
  } else {
    // Simple: tag(1) + length(1) + value
    const buf = Buffer.alloc(1 + 1 + length);
    buf.writeUInt8(tag, 0);
    buf.writeUInt8(length, 1);
    valueBuffer.copy(buf, 2);
    return buf;
  }
}

export interface QrCodeInput {
  /** Seller name (Arabic/English) */
  sellerName: string;
  /** 15-digit VAT registration number */
  vatNumber: string;
  /** Invoice issue timestamp in ISO 8601 format: "2022-09-07T12:21:28Z" */
  timestamp: string;
  /** Invoice total including VAT */
  totalWithVat: string;
  /** VAT amount */
  vatAmount: string;
  /** SHA-256 hash of the invoice (base64) */
  invoiceHash: string;
  /** ECDSA digital signature (base64) */
  digitalSignature: string;
  /** ECDSA public key (DER-encoded, base64) */
  publicKey: string;
  /** Certificate stamp issuer (optional, base64) */
  certificateIssuer?: string;
}

/**
 * Generate a ZATCA Phase 2 compliant QR code TLV-encoded data.
 * Returns a base64 string that should be embedded in the invoice XML QR reference.
 */
export function generateQrTlv(input: QrCodeInput): string {
  const parts: Buffer[] = [];

  // Tags 1-5: UTF-8 string values
  parts.push(encodeTlv(QrTlvTag.SELLER_NAME, input.sellerName));
  parts.push(encodeTlv(QrTlvTag.VAT_NUMBER, input.vatNumber));
  parts.push(encodeTlv(QrTlvTag.TIMESTAMP, input.timestamp));
  parts.push(encodeTlv(QrTlvTag.TOTAL_WITH_VAT, input.totalWithVat));
  parts.push(encodeTlv(QrTlvTag.VAT_AMOUNT, input.vatAmount));

  // Tags 6-9: Raw binary from base64
  parts.push(encodeTlv(QrTlvTag.INVOICE_HASH, Buffer.from(input.invoiceHash, "base64")));
  parts.push(encodeTlv(QrTlvTag.ECDSA_SIGNATURE, Buffer.from(input.digitalSignature, "base64")));
  parts.push(encodeTlv(QrTlvTag.ECDSA_PUBLIC_KEY, Buffer.from(input.publicKey, "base64")));

  if (input.certificateIssuer) {
    parts.push(
      encodeTlv(QrTlvTag.ECDSA_STAMP_ISSUER, Buffer.from(input.certificateIssuer, "base64"))
    );
  }

  const combined = Buffer.concat(parts);
  return combined.toString("base64");
}

/**
 * Decode a TLV-encoded QR code back into its components (for debugging/validation).
 */
export function decodeQrTlv(base64Data: string): Map<number, Buffer> {
  const data = Buffer.from(base64Data, "base64");
  const result = new Map<number, Buffer>();
  let offset = 0;

  while (offset < data.length) {
    const tag = data.readUInt8(offset);
    offset += 1;

    let length: number;
    const firstByte = data.readUInt8(offset);
    offset += 1;

    if (firstByte === 0x82) {
      length = data.readUInt16BE(offset);
      offset += 2;
    } else if (firstByte === 0x81) {
      length = data.readUInt8(offset);
      offset += 1;
    } else {
      length = firstByte;
    }

    const value = data.subarray(offset, offset + length);
    result.set(tag, Buffer.from(value));
    offset += length;
  }

  return result;
}
