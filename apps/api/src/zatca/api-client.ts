/**
 * ZATCA API Client
 * HTTP client for communicating with ZATCA Fatoora Portal APIs.
 *
 * Supports:
 * - Compliance CSID (Certificate Signing ID) issuance
 * - Production CSID issuance
 * - Invoice Reporting (simplified B2C invoices)
 * - Invoice Clearance (standard B2B invoices)
 *
 * API Base URLs:
 * - Sandbox:    https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal
 * - Simulation: https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation
 * - Production: https://gw-fatoora.zatca.gov.sa/e-invoicing/core
 */

import { ZatcaEnvironment, type ZatcaApiResponse } from "./types";

// ─── API Base URLs ───

const API_BASE_URLS: Record<ZatcaEnvironment, string> = {
  [ZatcaEnvironment.SANDBOX]:
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  [ZatcaEnvironment.SIMULATION]:
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  [ZatcaEnvironment.PRODUCTION]:
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

// ─── API Endpoints ───

const ENDPOINTS = {
  COMPLIANCE_CSID: "/compliance",
  PRODUCTION_CSID: "/production/csids",
  COMPLIANCE_CHECK: "/compliance/invoices",
  REPORTING: "/invoices/reporting/single",
  CLEARANCE: "/invoices/clearance/single",
};

// ─── Client ───

export class ZatcaApiClient {
  private baseUrl: string;
  private environment: ZatcaEnvironment;

  constructor(environment: ZatcaEnvironment) {
    this.environment = environment;
    this.baseUrl = API_BASE_URLS[environment];
  }

  /**
   * Step 1: Request a Compliance CSID (CCSID).
   * Sends the CSR to ZATCA and receives back a compliance certificate + credentials.
   */
  async requestComplianceCsid(
    csrBase64: string,
    otp: string
  ): Promise<{
    binarySecurityToken: string;
    secret: string;
    requestID: string;
    dispositionMessage: string;
  }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.COMPLIANCE_CSID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        OTP: otp,
        "Accept-Version": "V2",
        "Accept-Language": "en",
      },
      body: JSON.stringify({ csr: csrBase64 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ZATCA Compliance CSID request failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Step 2: Submit compliance invoices for validation.
   * Must submit at least one of each invoice type that will be issued.
   */
  async submitComplianceInvoice(
    username: string,
    secret: string,
    signedXmlBase64: string,
    invoiceHash: string,
    uuid: string
  ): Promise<ZatcaApiResponse> {
    const auth = Buffer.from(`${username}:${secret}`).toString("base64");

    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.COMPLIANCE_CHECK}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`,
          "Accept-Version": "V2",
          "Accept-Language": "en",
        },
        body: JSON.stringify({
          invoiceHash,
          uuid,
          invoice: signedXmlBase64,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ZATCA Compliance check failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Step 3: Request a Production CSID (PCSID).
   * Uses the compliance certificate credentials.
   */
  async requestProductionCsid(
    username: string,
    secret: string,
    complianceRequestId: string
  ): Promise<{
    binarySecurityToken: string;
    secret: string;
    requestID: string;
    dispositionMessage: string;
  }> {
    const auth = Buffer.from(`${username}:${secret}`).toString("base64");

    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.PRODUCTION_CSID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`,
          "Accept-Version": "V2",
          "Accept-Language": "en",
        },
        body: JSON.stringify({ compliance_request_id: complianceRequestId }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ZATCA Production CSID request failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Report a simplified (B2C) invoice to ZATCA.
   * Simplified invoices are reported after issuance.
   */
  async reportInvoice(
    username: string,
    secret: string,
    signedXmlBase64: string,
    invoiceHash: string,
    uuid: string
  ): Promise<ZatcaApiResponse> {
    const auth = Buffer.from(`${username}:${secret}`).toString("base64");

    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.REPORTING}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`,
          "Accept-Version": "V2",
          "Accept-Language": "en",
          "Clearance-Status": "0",
        },
        body: JSON.stringify({
          invoiceHash,
          uuid,
          invoice: signedXmlBase64,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ZATCA Reporting failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Clear a standard (B2B) invoice with ZATCA.
   * Standard invoices must be cleared (approved) before issuance.
   */
  async clearInvoice(
    username: string,
    secret: string,
    signedXmlBase64: string,
    invoiceHash: string,
    uuid: string
  ): Promise<ZatcaApiResponse> {
    const auth = Buffer.from(`${username}:${secret}`).toString("base64");

    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.CLEARANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`,
          "Accept-Version": "V2",
          "Accept-Language": "en",
          "Clearance-Status": "1",
        },
        body: JSON.stringify({
          invoiceHash,
          uuid,
          invoice: signedXmlBase64,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ZATCA Clearance failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }
}
