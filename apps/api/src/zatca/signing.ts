/**
 * ZATCA XAdES XML Digital Signature
 * Implements ECDSA-SHA256 signing with XAdES enveloped signatures per ZATCA spec.
 *
 * Signing process:
 * 1. Build unsigned XML with UBLExtensions placeholder
 * 2. Compute invoice hash (SHA-256 of XML without UBLExtensions, Signature ref, QR)
 * 3. Build XAdES SignedProperties
 * 4. Compute SignedProperties hash
 * 5. Build ds:SignedInfo with both references
 * 6. Sign with ECDSA-SHA256 using EC secp256k1 private key
 * 7. Inject complete signature into UBLExtensions
 */

import { createSign, createHash, X509Certificate } from "crypto";
import { sha256Base64, computeInvoiceHash, sha256Hex, stripXmlForHashing } from "./hashing";

// ─── Certificate Utilities ───

/**
 * Extract certificate details for XAdES SignedProperties.
 */
export function extractCertInfo(certBase64: string): {
  issuerName: string;
  serialNumber: string;
  certDigest: string;
} {
  try {
    const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;
    const x509 = new X509Certificate(certPem);

    // Get issuer in RFC 2253 format
    const issuerName = x509.issuer;

    // Get serial number as decimal string
    const serialHex = x509.serialNumber;
    const serialNumber = BigInt("0x" + serialHex).toString();

    // Certificate digest: base64 of hex SHA-256
    const certDer = Buffer.from(certBase64, "base64");
    const hexHash = createHash("sha256").update(certDer).digest("hex");
    const certDigest = Buffer.from(hexHash).toString("base64");

    return { issuerName, serialNumber, certDigest };
  } catch {
    // Fallback for environments without X509Certificate
    const certDer = Buffer.from(certBase64, "base64");
    const hexHash = createHash("sha256").update(certDer).digest("hex");
    return {
      issuerName: "CN=ZATCA-SubCA",
      serialNumber: "0",
      certDigest: Buffer.from(hexHash).toString("base64"),
    };
  }
}

/**
 * Extract the EC public key in DER format from a certificate.
 */
export function extractPublicKeyFromCert(certBase64: string): string {
  try {
    const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;
    const x509 = new X509Certificate(certPem);
    const pubKey = x509.publicKey;

    // Export as DER
    const derBuffer = pubKey.export({ type: "spki", format: "der" });
    return Buffer.from(derBuffer).toString("base64");
  } catch {
    return "";
  }
}

// ─── XAdES SignedProperties ───

function buildSignedProperties(
  signingTime: string,
  certDigest: string,
  issuerName: string,
  serialNumber: string
): string {
  return `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="xadesSignedProperties">
                                    <xades:SignedSignatureProperties>
                                        <xades:SigningTime>${signingTime}</xades:SigningTime>
                                        <xades:SigningCertificate>
                                            <xades:Cert>
                                                <xades:CertDigest>
                                                    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                                    <ds:DigestValue>${certDigest}</ds:DigestValue>
                                                </xades:CertDigest>
                                                <xades:IssuerSerial>
                                                    <ds:X509IssuerName>${issuerName}</ds:X509IssuerName>
                                                    <ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>
                                                </xades:IssuerSerial>
                                            </xades:Cert>
                                        </xades:SigningCertificate>
                                    </xades:SignedSignatureProperties>
                                </xades:SignedProperties>`;
}

// ─── ds:SignedInfo ───

function buildSignedInfo(invoiceDigest: string, signedPropsDigest: string): string {
  return `<ds:SignedInfo>
                            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
                            <ds:Reference Id="invoiceSignedData" URI="">
                                <ds:Transforms>
                                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                                        <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
                                    </ds:Transform>
                                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                                        <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
                                    </ds:Transform>
                                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                                        <ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath>
                                    </ds:Transform>
                                    <ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                                </ds:Transforms>
                                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                <ds:DigestValue>${invoiceDigest}</ds:DigestValue>
                            </ds:Reference>
                            <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
                                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                <ds:DigestValue>${signedPropsDigest}</ds:DigestValue>
                            </ds:Reference>
                        </ds:SignedInfo>`;
}

// ─── Complete Signature Block ───

function buildFullSignatureBlock(
  signedInfo: string,
  signatureValue: string,
  certBase64: string,
  signedProperties: string
): string {
  return `<ext:UBLExtensions>
    <ext:UBLExtension>
        <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
        <ext:ExtensionContent>
            <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
                <sac:SignatureInformation>
                    <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
                    <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
                    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
                        ${signedInfo}
                        <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
                        <ds:KeyInfo>
                            <ds:X509Data>
                                <ds:X509Certificate>${certBase64}</ds:X509Certificate>
                            </ds:X509Data>
                        </ds:KeyInfo>
                        <ds:Object>
                            <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
                                ${signedProperties}
                            </xades:QualifyingProperties>
                        </ds:Object>
                    </ds:Signature>
                </sac:SignatureInformation>
            </sig:UBLDocumentSignatures>
        </ext:ExtensionContent>
    </ext:UBLExtension>
</ext:UBLExtensions>`;
}

// ─── Main Signing Function ───

export interface SigningInput {
  /** The unsigned invoice XML (with placeholder UBLExtensions) */
  unsignedXml: string;
  /** Private key in PEM or base64 format */
  privateKeyBase64: string;
  /** Certificate in base64 (DER) format */
  certificateBase64: string;
  /** Signing timestamp in ISO format: "2024-01-14T10:21:40" */
  signingTime: string;
}

export interface SigningOutput {
  /** The fully signed XML with XAdES signature injected */
  signedXml: string;
  /** The invoice hash (base64 SHA-256) */
  invoiceHash: string;
  /** The digital signature value (base64) */
  signatureValue: string;
  /** Public key extracted from certificate (base64 DER) */
  publicKey: string;
}

/**
 * Sign a ZATCA invoice XML with XAdES enveloped signature.
 *
 * Process:
 * 1. Strip UBLExtensions, Signature, QR from XML
 * 2. Compute invoice hash (SHA-256 → base64)
 * 3. Build XAdES SignedProperties with cert info
 * 4. Hash the SignedProperties
 * 5. Build SignedInfo with both digests
 * 6. Sign SignedInfo with ECDSA-SHA256
 * 7. Replace placeholder UBLExtensions with full signature block
 */
export function signInvoiceXml(input: SigningInput): SigningOutput {
  const { unsignedXml, privateKeyBase64, certificateBase64, signingTime } = input;

  // 1. Compute invoice hash
  const strippedXml = stripXmlForHashing(unsignedXml);
  const invoiceHash = computeInvoiceHash(strippedXml);

  // 2. Extract certificate info
  const certInfo = extractCertInfo(certificateBase64);
  const publicKey = extractPublicKeyFromCert(certificateBase64);

  // 3. Build SignedProperties
  const signedProperties = buildSignedProperties(
    signingTime,
    certInfo.certDigest,
    certInfo.issuerName,
    certInfo.serialNumber
  );

  // 4. Hash SignedProperties
  const signedPropsHash = sha256Base64(signedProperties);

  // 5. Build SignedInfo
  const signedInfo = buildSignedInfo(invoiceHash, signedPropsHash);

  // 6. Sign with ECDSA-SHA256
  const privateKeyPem = privateKeyBase64.includes("-----BEGIN")
    ? privateKeyBase64
    : `-----BEGIN EC PRIVATE KEY-----\n${privateKeyBase64}\n-----END EC PRIVATE KEY-----`;

  const signer = createSign("SHA256");
  signer.update(signedInfo);
  signer.end();
  const signatureValue = signer.sign(privateKeyPem, "base64");

  // 7. Build complete signature block
  const fullSignatureBlock = buildFullSignatureBlock(
    signedInfo,
    signatureValue,
    certificateBase64,
    signedProperties
  );

  // 8. Replace placeholder UBLExtensions in the XML
  const signedXml = unsignedXml.replace(
    /<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/,
    fullSignatureBlock
  );

  return {
    signedXml,
    invoiceHash,
    signatureValue,
    publicKey,
  };
}
