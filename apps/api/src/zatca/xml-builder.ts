/**
 * ZATCA UBL 2.1 XML Builder
 * Generates ZATCA-compliant XML invoices per Saudi Arabia e-invoicing specifications.
 * Supports: Standard (B2B), Simplified (B2C), Credit Notes, Debit Notes
 */

import type { ZatcaInvoiceData, ZatcaInvoiceLine, ZatcaTaxSubtotal, ZatcaAllowanceCharge } from "./types";

// ─── XML Namespaces ───

const NS = {
  invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
  sig: "urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2",
  sac: "urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2",
  sbc: "urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2",
  ds: "http://www.w3.org/2000/09/xmldsig#",
  xades: "http://uri.etsi.org/01903/v1.3.2#",
};

// ─── Helpers ───

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function amt(n: number): string {
  return n.toFixed(2);
}

function amt6(n: number): string {
  return n.toFixed(6);
}

// ─── UBL Extensions (signature placeholder) ───

function buildUBLExtensions(): string {
  return `<ext:UBLExtensions>
    <ext:UBLExtension>
        <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
        <ext:ExtensionContent>
            <sig:UBLDocumentSignatures xmlns:sig="${NS.sig}" xmlns:sac="${NS.sac}" xmlns:sbc="${NS.sbc}">
                <sac:SignatureInformation>
                    <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
                    <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
                </sac:SignatureInformation>
            </sig:UBLDocumentSignatures>
        </ext:ExtensionContent>
    </ext:UBLExtension>
</ext:UBLExtensions>`;
}

// ─── Additional Document References ───

function buildDocumentReferences(data: ZatcaInvoiceData, qrBase64?: string): string {
  let xml = "";

  // ICV (Invoice Counter Value)
  xml += `
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>${data.icv}</cbc:UUID>
    </cac:AdditionalDocumentReference>`;

  // PIH (Previous Invoice Hash)
  xml += `
    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${data.pih}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>`;

  // QR Code (added after signing for simplified invoices)
  if (qrBase64) {
    xml += `
    <cac:AdditionalDocumentReference>
        <cbc:ID>QR</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrBase64}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>`;
  }

  return xml;
}

// ─── Signature Reference ───

function buildSignatureReference(): string {
  return `<cac:Signature>
      <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
      <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
</cac:Signature>`;
}

// ─── Supplier Party ───

function buildSupplierParty(supplier: ZatcaInvoiceData["supplier"]): string {
  return `<cac:AccountingSupplierParty>
        <cac:Party>
            ${supplier.crn ? `<cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${esc(supplier.crn)}</cbc:ID>
            </cac:PartyIdentification>` : ""}
            <cac:PostalAddress>
                <cbc:StreetName>${esc(supplier.address.streetName)}</cbc:StreetName>
                <cbc:BuildingNumber>${esc(supplier.address.buildingNumber)}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${esc(supplier.address.citySubdivision)}</cbc:CitySubdivisionName>
                <cbc:CityName>${esc(supplier.address.cityName)}</cbc:CityName>
                <cbc:PostalZone>${esc(supplier.address.postalZone)}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${esc(supplier.address.countryCode)}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${esc(supplier.vatNumber)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${esc(supplier.registrationName)}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>`;
}

// ─── Customer Party ───

function buildCustomerParty(customer?: ZatcaInvoiceData["customer"]): string {
  if (!customer) return "";

  return `<cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PostalAddress>
                <cbc:StreetName>${esc(customer.address.streetName)}</cbc:StreetName>
                <cbc:BuildingNumber>${esc(customer.address.buildingNumber)}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${esc(customer.address.citySubdivision)}</cbc:CitySubdivisionName>
                <cbc:CityName>${esc(customer.address.cityName)}</cbc:CityName>
                <cbc:PostalZone>${esc(customer.address.postalZone)}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${esc(customer.address.countryCode)}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${esc(customer.vatNumber)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${esc(customer.registrationName)}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>`;
}

// ─── Delivery ───

function buildDelivery(deliveryDate?: string): string {
  if (!deliveryDate) return "";
  return `<cac:Delivery>
        <cbc:ActualDeliveryDate>${deliveryDate}</cbc:ActualDeliveryDate>
    </cac:Delivery>`;
}

// ─── Payment Means ───

function buildPaymentMeans(code: string): string {
  return `<cac:PaymentMeans>
        <cbc:PaymentMeansCode>${code}</cbc:PaymentMeansCode>
    </cac:PaymentMeans>`;
}

// ─── Document-Level Allowance/Charge ───

function buildAllowanceCharges(charges: ZatcaAllowanceCharge[]): string {
  return charges.map((c) => `<cac:AllowanceCharge>
        <cbc:ChargeIndicator>${c.chargeIndicator}</cbc:ChargeIndicator>
        <cbc:AllowanceChargeReason>${esc(c.reason)}</cbc:AllowanceChargeReason>
        <cbc:Amount currencyID="SAR">${amt(c.amount)}</cbc:Amount>
        <cac:TaxCategory>
            <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">${c.taxCategory}</cbc:ID>
            <cbc:Percent>${c.taxPercent}</cbc:Percent>
            <cac:TaxScheme>
                <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>
            </cac:TaxScheme>
        </cac:TaxCategory>
    </cac:AllowanceCharge>`).join("\n");
}

// ─── Tax Totals ───

function buildTaxTotals(data: ZatcaInvoiceData): string {
  // First TaxTotal: just the total tax amount
  let xml = `<cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${amt(data.totalTaxAmount)}</cbc:TaxAmount>
    </cac:TaxTotal>`;

  // Second TaxTotal: with subtotals breakdown
  xml += `
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${amt(data.totalTaxAmount)}</cbc:TaxAmount>`;

  for (const sub of data.taxSubtotals) {
    xml += buildTaxSubtotal(sub);
  }

  xml += `
    </cac:TaxTotal>`;

  return xml;
}

function buildTaxSubtotal(sub: ZatcaTaxSubtotal): string {
  let xml = `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${amt(sub.taxableAmount)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${amt(sub.taxAmount)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">${sub.taxCategory}</cbc:ID>
                <cbc:Percent>${amt(sub.taxPercent)}</cbc:Percent>`;

  if (sub.exemptionReasonCode) {
    xml += `
                <cbc:TaxExemptionReasonCode>${esc(sub.exemptionReasonCode)}</cbc:TaxExemptionReasonCode>`;
  }
  if (sub.exemptionReason) {
    xml += `
                <cbc:TaxExemptionReason>${esc(sub.exemptionReason)}</cbc:TaxExemptionReason>`;
  }

  xml += `
                <cac:TaxScheme>
                    <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>`;

  return xml;
}

// ─── Legal Monetary Total ───

function buildLegalMonetaryTotal(data: ZatcaInvoiceData): string {
  return `<cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${amt(data.lineExtensionAmount)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${amt(data.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${amt(data.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="SAR">${amt(data.allowanceTotalAmount)}</cbc:AllowanceTotalAmount>
        <cbc:PrepaidAmount currencyID="SAR">${amt(data.prepaidAmount)}</cbc:PrepaidAmount>
        <cbc:PayableAmount currencyID="SAR">${amt(data.payableAmount)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>`;
}

// ─── Invoice Lines ───

function buildInvoiceLine(line: ZatcaInvoiceLine): string {
  return `<cac:InvoiceLine>
        <cbc:ID>${esc(line.id)}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${esc(line.unitCode)}">${amt6(line.quantity)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${amt(line.lineExtensionAmount)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${amt(line.taxAmount)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${amt(line.roundingAmount)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${esc(line.name)}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>${line.taxCategory}</cbc:ID>
                <cbc:Percent>${amt(line.taxPercent)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${amt(line.unitPrice)}</cbc:PriceAmount>
            <cac:AllowanceCharge>
                <cbc:ChargeIndicator>true</cbc:ChargeIndicator>
                <cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason>
                <cbc:Amount currencyID="SAR">${amt(line.lineDiscount)}</cbc:Amount>
            </cac:AllowanceCharge>
        </cac:Price>
    </cac:InvoiceLine>`;
}

// ─── Main Builder ───

/**
 * Build a ZATCA-compliant UBL 2.1 XML invoice (unsigned).
 * The UBLExtensions section is a placeholder; signing will inject the actual signature.
 *
 * @param data - The structured invoice data
 * @param qrBase64 - Optional QR code (base64 TLV). Added during signing for simplified invoices.
 * @returns Complete XML string
 */
export function buildZatcaXml(data: ZatcaInvoiceData, qrBase64?: string): string {
  const parts: string[] = [];

  // XML declaration
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);

  // Root element with namespaces
  parts.push(
    `<Invoice xmlns="${NS.invoice}" xmlns:cac="${NS.cac}" xmlns:cbc="${NS.cbc}" xmlns:ext="${NS.ext}">`
  );

  // UBL Extensions (signature placeholder)
  parts.push(buildUBLExtensions());

  // Profile ID
  parts.push(`    <cbc:ProfileID>${esc(data.profileId)}</cbc:ProfileID>`);

  // Invoice ID
  parts.push(`    <cbc:ID>${esc(data.id)}</cbc:ID>`);

  // UUID
  parts.push(`    <cbc:UUID>${esc(data.uuid)}</cbc:UUID>`);

  // Issue Date & Time
  parts.push(`    <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>`);
  parts.push(`    <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>`);

  // Invoice Type Code
  parts.push(
    `    <cbc:InvoiceTypeCode name="${data.invoiceSubType}">${data.invoiceTypeCode}</cbc:InvoiceTypeCode>`
  );

  // Note (optional)
  if (data.note) {
    parts.push(`    <cbc:Note languageID="ar">${esc(data.note)}</cbc:Note>`);
  }

  // Currency
  parts.push(`    <cbc:DocumentCurrencyCode>${data.documentCurrencyCode}</cbc:DocumentCurrencyCode>`);
  parts.push(`    <cbc:TaxCurrencyCode>${data.taxCurrencyCode}</cbc:TaxCurrencyCode>`);

  // Billing Reference (for credit/debit notes)
  if (data.billingReferenceId) {
    parts.push(`    <cac:BillingReference>
        <cac:InvoiceDocumentReference>
            <cbc:ID>${esc(data.billingReferenceId)}</cbc:ID>
        </cac:InvoiceDocumentReference>
    </cac:BillingReference>`);
  }

  // Document References (ICV, PIH, QR)
  parts.push(buildDocumentReferences(data, qrBase64));

  // Signature reference
  parts.push(buildSignatureReference());

  // Supplier Party
  parts.push(buildSupplierParty(data.supplier));

  // Customer Party
  parts.push(buildCustomerParty(data.customer));

  // Delivery (required for standard)
  parts.push(buildDelivery(data.actualDeliveryDate));

  // Payment Means
  parts.push(buildPaymentMeans(data.paymentMeansCode));

  // Allowance/Charges
  if (data.allowanceCharges.length > 0) {
    parts.push(buildAllowanceCharges(data.allowanceCharges));
  }

  // Tax Totals
  parts.push(buildTaxTotals(data));

  // Legal Monetary Total
  parts.push(buildLegalMonetaryTotal(data));

  // Invoice Lines
  for (const line of data.lines) {
    parts.push(buildInvoiceLine(line));
  }

  // Close root
  parts.push(`</Invoice>`);

  return parts.filter(Boolean).join("\n");
}

/**
 * Generate the XML body without UBLExtensions, cac:Signature, and QR reference.
 * This is used for invoice hash computation (the parts that get signed).
 */
export function buildZatcaXmlForHashing(data: ZatcaInvoiceData): string {
  const parts: string[] = [];

  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<Invoice xmlns="${NS.invoice}" xmlns:cac="${NS.cac}" xmlns:cbc="${NS.cbc}" xmlns:ext="${NS.ext}">`
  );

  // NO UBLExtensions
  // Profile ID
  parts.push(`    <cbc:ProfileID>${esc(data.profileId)}</cbc:ProfileID>`);
  parts.push(`    <cbc:ID>${esc(data.id)}</cbc:ID>`);
  parts.push(`    <cbc:UUID>${esc(data.uuid)}</cbc:UUID>`);
  parts.push(`    <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>`);
  parts.push(`    <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>`);
  parts.push(
    `    <cbc:InvoiceTypeCode name="${data.invoiceSubType}">${data.invoiceTypeCode}</cbc:InvoiceTypeCode>`
  );
  if (data.note) {
    parts.push(`    <cbc:Note languageID="ar">${esc(data.note)}</cbc:Note>`);
  }
  parts.push(`    <cbc:DocumentCurrencyCode>${data.documentCurrencyCode}</cbc:DocumentCurrencyCode>`);
  parts.push(`    <cbc:TaxCurrencyCode>${data.taxCurrencyCode}</cbc:TaxCurrencyCode>`);

  if (data.billingReferenceId) {
    parts.push(`    <cac:BillingReference>
        <cac:InvoiceDocumentReference>
            <cbc:ID>${esc(data.billingReferenceId)}</cbc:ID>
        </cac:InvoiceDocumentReference>
    </cac:BillingReference>`);
  }

  // ICV & PIH only (no QR)
  parts.push(`
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>${data.icv}</cbc:UUID>
    </cac:AdditionalDocumentReference>`);
  parts.push(`
    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${data.pih}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>`);

  // NO cac:Signature reference

  // Supplier
  parts.push(buildSupplierParty(data.supplier));
  parts.push(buildCustomerParty(data.customer));
  parts.push(buildDelivery(data.actualDeliveryDate));
  parts.push(buildPaymentMeans(data.paymentMeansCode));
  if (data.allowanceCharges.length > 0) {
    parts.push(buildAllowanceCharges(data.allowanceCharges));
  }
  parts.push(buildTaxTotals(data));
  parts.push(buildLegalMonetaryTotal(data));
  for (const line of data.lines) {
    parts.push(buildInvoiceLine(line));
  }
  parts.push(`</Invoice>`);

  return parts.filter(Boolean).join("\n");
}
