"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Branch = {
  id: string;
  code: string;
  name: string;
};

type ZatcaConfig = {
  id: string;
  branchId: string;
  environment: string;
  isActive: boolean;
  vatNumber: string;
  crn: string;
  sellerNameAr: string;
  sellerNameEn?: string;
  streetNameAr: string;
  streetNameEn?: string;
  buildingNumber: string;
  citySubdivisionAr: string;
  citySubdivisionEn?: string;
  cityNameAr: string;
  cityNameEn?: string;
  postalZone: string;
  businessCategory: string;
  csrInvoiceType: string;
  lastIcv: number;
  isConfigured?: boolean;
  complianceCertBase64?: string;
  productionCertBase64?: string;
  privateKeyPem?: string;
};

const EMPTY_CONFIG = {
  environment: "sandbox",
  vatNumber: "",
  crn: "",
  sellerNameAr: "",
  sellerNameEn: "",
  streetNameAr: "",
  streetNameEn: "",
  buildingNumber: "",
  citySubdivisionAr: "",
  citySubdivisionEn: "",
  cityNameAr: "",
  cityNameEn: "",
  postalZone: "",
  businessCategory: "Supply activities",
  csrInvoiceType: "1100",
};

export default function ZatcaPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [config, setConfig] = useState<ZatcaConfig | null>(null);
  const [form, setForm] = useState(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"config" | "onboarding" | "status">("config");

  // Onboarding state
  const [privateKey, setPrivateKey] = useState("");
  const [csrData, setCsrData] = useState("");
  const [otp, setOtp] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [csrProperties, setCsrProperties] = useState("");

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) loadConfig(selectedBranch);
  }, [selectedBranch]);

  async function loadBranches() {
    setLoading(true);
    const res = await apiFetch<Branch[]>("/api/admin/branches");
    setBranches(res.data ?? []);
    if (res.data?.length) setSelectedBranch(res.data[0].id);
    setLoading(false);
  }

  async function loadConfig(branchId: string) {
    const res = await apiFetch<ZatcaConfig>(`/api/admin/zatca?branchId=${branchId}`);
    if (res.ok && res.data) {
      setConfig(res.data);
      setForm({
        environment: res.data.environment,
        vatNumber: res.data.vatNumber,
        crn: res.data.crn,
        sellerNameAr: res.data.sellerNameAr,
        sellerNameEn: res.data.sellerNameEn || "",
        streetNameAr: res.data.streetNameAr,
        streetNameEn: res.data.streetNameEn || "",
        buildingNumber: res.data.buildingNumber,
        citySubdivisionAr: res.data.citySubdivisionAr,
        citySubdivisionEn: res.data.citySubdivisionEn || "",
        cityNameAr: res.data.cityNameAr,
        cityNameEn: res.data.cityNameEn || "",
        postalZone: res.data.postalZone,
        businessCategory: res.data.businessCategory,
        csrInvoiceType: res.data.csrInvoiceType || "1100",
      });
      // Determine onboarding step
      if (res.data.privateKeyPem === "***CONFIGURED***") setOnboardingStep(1);
      if (res.data.complianceCertBase64) setOnboardingStep(2);
      if (res.data.productionCertBase64) setOnboardingStep(3);
      if (res.data.isActive) setOnboardingStep(4);
    } else {
      setConfig(null);
      setForm(EMPTY_CONFIG);
      setOnboardingStep(0);
    }
  }

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");

    const res = await apiFetch<{ message: string; csrProperties: string }>(
      "/api/admin/zatca",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedBranch, ...form }),
      }
    );

    if (res.ok) {
      setStatus("✅ " + (res.data?.message || "Saved"));
      setCsrProperties(res.data?.csrProperties || "");
      await loadConfig(selectedBranch);
    } else {
      setStatus("❌ " + (res.error || "Failed"));
    }
    setSaving(false);
  }

  async function handleOnboardingStep(step: string, data: any) {
    setSaving(true);
    setStatus("");

    const res = await apiFetch<{ message: string }>(
      "/api/admin/zatca",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedBranch, step, ...data }),
      }
    );

    if (res.ok) {
      setStatus("✅ " + (res.data?.message || "Done"));
      await loadConfig(selectedBranch);
    } else {
      setStatus("❌ " + (res.error || "Failed"));
    }
    setSaving(false);
  }

  const inputCls = "border rounded px-3 py-2 text-sm w-full bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const btnCls = "px-4 py-2 rounded text-sm font-medium transition-colors";
  const btnPrimary = `${btnCls} bg-green-600 hover:bg-green-700 text-white disabled:opacity-50`;
  const btnSecondary = `${btnCls} bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200`;
  const cardCls = "bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700";

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ZATCA E-Invoicing | الفوترة الإلكترونية</h1>
          <p className="text-sm text-gray-500 mt-1">Configure ZATCA Phase 2 compliance for each branch</p>
        </div>
        {config?.isActive && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ● Active
          </span>
        )}
      </div>

      {/* Branch Selector */}
      <div className={cardCls}>
        <label className={labelCls}>Select Branch | اختر الفرع</label>
        <select
          className={inputCls}
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
        {(["config", "onboarding", "status"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white dark:bg-gray-800 shadow text-green-700 dark:text-green-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab === "config" ? "⚙️ Configuration" : tab === "onboarding" ? "🔐 Onboarding" : "📊 Status"}
          </button>
        ))}
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-3 rounded-lg text-sm ${status.startsWith("✅") ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
          {status}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === "config" && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Seller Information */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold mb-4">🏢 Seller Information | بيانات البائع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>VAT Number (TIN) | الرقم الضريبي *</label>
                <input className={inputCls} value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} placeholder="3XXXXXXXXXXXXXX" maxLength={15} required />
                <p className="text-xs text-gray-400 mt-1">15 digits starting with 3</p>
              </div>
              <div>
                <label className={labelCls}>Commercial Registration (CRN) | السجل التجاري *</label>
                <input className={inputCls} value={form.crn} onChange={(e) => setForm({ ...form, crn: e.target.value })} placeholder="1010010000" required />
              </div>
              <div>
                <label className={labelCls}>Seller Name (Arabic) | اسم البائع *</label>
                <input className={inputCls} dir="rtl" value={form.sellerNameAr} onChange={(e) => setForm({ ...form, sellerNameAr: e.target.value })} placeholder="شركة المثال" required />
              </div>
              <div>
                <label className={labelCls}>Seller Name (English)</label>
                <input className={inputCls} value={form.sellerNameEn} onChange={(e) => setForm({ ...form, sellerNameEn: e.target.value })} placeholder="Example Company LTD" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold mb-4">📍 Address | العنوان</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Street (Arabic) | الشارع</label>
                <input className={inputCls} dir="rtl" value={form.streetNameAr} onChange={(e) => setForm({ ...form, streetNameAr: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Street (English)</label>
                <input className={inputCls} value={form.streetNameEn} onChange={(e) => setForm({ ...form, streetNameEn: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Building Number | رقم المبنى</label>
                <input className={inputCls} value={form.buildingNumber} onChange={(e) => setForm({ ...form, buildingNumber: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Postal Zone | الرمز البريدي</label>
                <input className={inputCls} value={form.postalZone} onChange={(e) => setForm({ ...form, postalZone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>District (Arabic) | الحي</label>
                <input className={inputCls} dir="rtl" value={form.citySubdivisionAr} onChange={(e) => setForm({ ...form, citySubdivisionAr: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>District (English)</label>
                <input className={inputCls} value={form.citySubdivisionEn} onChange={(e) => setForm({ ...form, citySubdivisionEn: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>City (Arabic) | المدينة</label>
                <input className={inputCls} dir="rtl" value={form.cityNameAr} onChange={(e) => setForm({ ...form, cityNameAr: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>City (English)</label>
                <input className={inputCls} value={form.cityNameEn} onChange={(e) => setForm({ ...form, cityNameEn: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ZATCA Settings */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold mb-4">⚙️ ZATCA Settings | إعدادات هيئة الزكاة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Environment | البيئة</label>
                <select className={inputCls} value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                  <option value="sandbox">🧪 Sandbox (Testing)</option>
                  <option value="simulation">🔄 Simulation</option>
                  <option value="production">🏭 Production</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Business Category | فئة النشاط</label>
                <input className={inputCls} value={form.businessCategory} onChange={(e) => setForm({ ...form, businessCategory: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Invoice Types | أنواع الفواتير</label>
                <select className={inputCls} value={form.csrInvoiceType} onChange={(e) => setForm({ ...form, csrInvoiceType: e.target.value })}>
                  <option value="1100">Standard & Simplified (1100)</option>
                  <option value="0100">Standard Only (0100)</option>
                  <option value="1000">Simplified Only (1000)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : "💾 Save Configuration"}
            </button>
          </div>
        </form>
      )}

      {/* Onboarding Tab */}
      {activeTab === "onboarding" && (
        <div className="space-y-6">
          {!config && (
            <div className={`${cardCls} text-center text-gray-500`}>
              <p>Please save the configuration first before proceeding with onboarding.</p>
            </div>
          )}

          {config && (
            <>
              {/* Step Indicator */}
              <div className={cardCls}>
                <h2 className="text-lg font-semibold mb-4">🔐 ZATCA Onboarding Steps | خطوات التسجيل</h2>
                <div className="flex items-center gap-2">
                  {["Private Key", "CSR & CCSID", "Compliance Test", "Production", "Active"].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < onboardingStep ? "bg-green-500 text-white" :
                        i === onboardingStep ? "bg-blue-500 text-white" :
                        "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      }`}>
                        {i < onboardingStep ? "✓" : i + 1}
                      </div>
                      <span className={`text-xs hidden md:inline ${i === onboardingStep ? "font-bold text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                        {label}
                      </span>
                      {i < 4 && <div className={`w-8 h-0.5 ${i < onboardingStep ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: Private Key */}
              <div className={cardCls}>
                <h3 className="font-semibold mb-3">Step 1: EC Private Key | المفتاح الخاص</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Generate an EC secp256k1 private key using OpenSSL:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs mb-3 overflow-x-auto">
                  openssl ecparam -name secp256k1 -genkey -noout -out private.pem
                </pre>
                <textarea
                  className={`${inputCls} h-24 font-mono text-xs`}
                  placeholder="Paste your EC private key PEM here..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  disabled={onboardingStep > 0}
                />
                <button
                  className={`${btnPrimary} mt-3`}
                  disabled={!privateKey || saving || onboardingStep > 0}
                  onClick={() => handleOnboardingStep("private_key", { privateKeyPem: privateKey })}
                >
                  {onboardingStep > 0 ? "✓ Key Stored" : "Store Private Key"}
                </button>
              </div>

              {/* Step 2: CSR & Compliance CSID */}
              <div className={cardCls}>
                <h3 className="font-semibold mb-3">Step 2: CSR & Compliance Certificate</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Use the ZATCA SDK to generate a CSR with these properties, then obtain a compliance certificate:
                </p>
                {csrProperties && (
                  <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs mb-3 overflow-x-auto whitespace-pre-wrap">
                    {csrProperties}
                  </pre>
                )}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>CSR (Base64)</label>
                    <textarea
                      className={`${inputCls} h-16 font-mono text-xs`}
                      placeholder="Paste CSR base64..."
                      value={csrData}
                      onChange={(e) => setCsrData(e.target.value)}
                      disabled={onboardingStep > 1}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>OTP from ZATCA Portal</label>
                    <input
                      className={inputCls}
                      placeholder="Enter OTP..."
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={onboardingStep > 1}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      className={btnSecondary}
                      disabled={!csrData || saving || onboardingStep > 1}
                      onClick={() => handleOnboardingStep("csr", { csrBase64: csrData })}
                    >
                      Store CSR
                    </button>
                    <button
                      className={btnPrimary}
                      disabled={onboardingStep > 1 || saving}
                      onClick={async () => {
                        // This would call the ZATCA API to get compliance cert
                        setStatus("ℹ️ Use the ZATCA SDK or portal to obtain compliance credentials, then enter them below");
                      }}
                    >
                      {onboardingStep > 1 ? "✓ Compliance Cert Stored" : "Request Compliance CSID"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className={labelCls}>Compliance Token (binarySecurityToken)</label>
                      <input className={inputCls} id="comp-token" placeholder="Token..." disabled={onboardingStep > 1} />
                    </div>
                    <div>
                      <label className={labelCls}>Compliance Secret</label>
                      <input className={inputCls} id="comp-secret" type="password" placeholder="Secret..." disabled={onboardingStep > 1} />
                    </div>
                  </div>
                  <button
                    className={btnPrimary}
                    disabled={onboardingStep > 1 || saving}
                    onClick={() => {
                      const token = (document.getElementById("comp-token") as HTMLInputElement)?.value;
                      const secret = (document.getElementById("comp-secret") as HTMLInputElement)?.value;
                      if (token && secret) {
                        handleOnboardingStep("compliance_cert", { binarySecurityToken: token, secret });
                      } else {
                        setStatus("❌ Both token and secret are required");
                      }
                    }}
                  >
                    Store Compliance Certificate
                  </button>
                </div>
              </div>

              {/* Step 3: Production CSID */}
              <div className={cardCls}>
                <h3 className="font-semibold mb-3">Step 3: Production Certificate</h3>
                <p className="text-sm text-gray-500 mb-3">
                  After passing compliance checks, obtain a production certificate:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Production Token</label>
                    <input className={inputCls} id="prod-token" placeholder="Token..." disabled={onboardingStep > 2} />
                  </div>
                  <div>
                    <label className={labelCls}>Production Secret</label>
                    <input className={inputCls} id="prod-secret" type="password" placeholder="Secret..." disabled={onboardingStep > 2} />
                  </div>
                </div>
                <button
                  className={`${btnPrimary} mt-3`}
                  disabled={onboardingStep < 2 || onboardingStep > 2 || saving}
                  onClick={() => {
                    const token = (document.getElementById("prod-token") as HTMLInputElement)?.value;
                    const secret = (document.getElementById("prod-secret") as HTMLInputElement)?.value;
                    if (token && secret) {
                      handleOnboardingStep("production_cert", { binarySecurityToken: token, secret });
                    } else {
                      setStatus("❌ Both token and secret are required");
                    }
                  }}
                >
                  {onboardingStep > 2 ? "✓ Production Cert Stored" : "Store Production Certificate"}
                </button>
              </div>

              {/* Step 4: Activate */}
              <div className={cardCls}>
                <h3 className="font-semibold mb-3">Step 4: Activate | التفعيل</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Activate ZATCA e-invoicing for this branch. All new invoices will be generated with ZATCA compliance.
                </p>
                <div className="flex gap-3">
                  <button
                    className={btnPrimary}
                    disabled={onboardingStep < 1 || saving}
                    onClick={() => handleOnboardingStep(config?.isActive ? "deactivate" : "activate", {})}
                  >
                    {config?.isActive ? "🔴 Deactivate" : "🟢 Activate ZATCA E-Invoicing"}
                  </button>
                  <button
                    className={`${btnCls} bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300`}
                    disabled={saving}
                    onClick={() => {
                      if (window.confirm("⚠️ Reset invoice counters? This should only be done in sandbox/testing.")) {
                        handleOnboardingStep("reset_counters", {});
                      }
                    }}
                  >
                    🔄 Reset Counters
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Status Tab */}
      {activeTab === "status" && (
        <div className="space-y-6">
          <div className={cardCls}>
            <h2 className="text-lg font-semibold mb-4">📊 ZATCA Status Dashboard</h2>
            {config ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Environment</p>
                  <p className="text-lg font-bold capitalize">{config.environment}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Invoice Counter (ICV)</p>
                  <p className="text-lg font-bold">{config.lastIcv}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`text-lg font-bold ${config.isActive ? "text-green-600" : "text-red-600"}`}>
                    {config.isActive ? "Active ✓" : "Inactive"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">VAT Number</p>
                  <p className="text-lg font-bold font-mono">{config.vatNumber}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">CRN</p>
                  <p className="text-lg font-bold font-mono">{config.crn}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Private Key</p>
                  <p className="text-lg font-bold">{config.privateKeyPem ? "✓ Configured" : "✗ Not Set"}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Compliance Cert</p>
                  <p className="text-lg font-bold">{config.complianceCertBase64 ? "✓ Configured" : "✗ Not Set"}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Production Cert</p>
                  <p className="text-lg font-bold">{config.productionCertBase64 ? "✓ Configured" : "✗ Not Set"}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <p className="text-sm text-gray-500">Invoice Types</p>
                  <p className="text-lg font-bold">{config.csrInvoiceType === "1100" ? "Standard & Simplified" : config.csrInvoiceType === "0100" ? "Standard Only" : "Simplified Only"}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No ZATCA configuration found for this branch.</p>
            )}
          </div>

          {/* Integration Guide */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold mb-4">📘 API Integration Guide</h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-mono text-xs text-green-600 dark:text-green-400">GET /api/orders/:orderId/invoice</p>
                <p className="text-gray-500 mt-1">Generate or retrieve PDF invoice (with ZATCA compliance if configured)</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-mono text-xs text-green-600 dark:text-green-400">GET /api/orders/:orderId/invoice?format=xml</p>
                <p className="text-gray-500 mt-1">Get signed UBL 2.1 XML invoice</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-mono text-xs text-green-600 dark:text-green-400">GET /api/orders/:orderId/invoice?format=json</p>
                <p className="text-gray-500 mt-1">Get invoice metadata with ZATCA status, QR code, hash</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-mono text-xs text-blue-600 dark:text-blue-400">POST /api/orders/:orderId/invoice</p>
                <p className="text-gray-500 mt-1">Retry ZATCA API submission for a pending invoice</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
