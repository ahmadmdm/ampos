"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Branch = { id: string; code: string; name: string };

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
  csrCommonName?: string;
  csrSerialNumber?: string;
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
  csrCommonName: "",
  csrSerialNumber: "",
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
    >
      {copied ? "✓ Copied" : `📋 ${label}`}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function StepBadge({ step, current, done }: { step: number; current: number; done: boolean }) {
  const base = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all";
  if (done) return <div className={`${base} bg-green-500 text-white shadow shadow-green-200 dark:shadow-green-900`}>✓</div>;
  if (step === current) return <div className={`${base} bg-blue-600 text-white shadow shadow-blue-200 dark:shadow-blue-900 ring-2 ring-blue-300 dark:ring-blue-700`}>{step}</div>;
  return <div className={`${base} bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-gray-200 dark:border-gray-700`}>{step}</div>;
}

function SectionCard({ title, icon, children, className = "" }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <span className="text-xl">{icon}</span>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function ZatcaPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [config, setConfig] = useState<ZatcaConfig | null>(null);
  const [form, setForm] = useState(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err" | "info"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "onboarding" | "status">("config");

  const [privateKey, setPrivateKey] = useState("");
  const [csrBase64, setCsrBase64] = useState("");
  const [otp, setOtp] = useState("");
  const [compToken, setCompToken] = useState("");
  const [compSecret, setCompSecret] = useState("");
  const [prodToken, setProdToken] = useState("");
  const [prodSecret, setProdSecret] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [csrProperties, setCsrProperties] = useState("");

  useEffect(() => { loadBranches(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedBranch) loadConfig(selectedBranch); }, [selectedBranch]);

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
      const d = res.data;
      setConfig(d);
      setForm({
        environment: d.environment,
        vatNumber: d.vatNumber,
        crn: d.crn,
        sellerNameAr: d.sellerNameAr,
        sellerNameEn: d.sellerNameEn || "",
        streetNameAr: d.streetNameAr,
        streetNameEn: d.streetNameEn || "",
        buildingNumber: d.buildingNumber,
        citySubdivisionAr: d.citySubdivisionAr,
        citySubdivisionEn: d.citySubdivisionEn || "",
        cityNameAr: d.cityNameAr,
        cityNameEn: d.cityNameEn || "",
        postalZone: d.postalZone,
        businessCategory: d.businessCategory,
        csrInvoiceType: d.csrInvoiceType || "1100",
        csrCommonName: d.csrCommonName || "",
        csrSerialNumber: d.csrSerialNumber || "",
      });
      if (d.privateKeyPem === "***CONFIGURED***") setOnboardingStep(1);
      if (d.complianceCertBase64) setOnboardingStep(2);
      if (d.productionCertBase64) setOnboardingStep(3);
      if (d.isActive) setOnboardingStep(4);
    } else {
      setConfig(null);
      setForm(EMPTY_CONFIG);
      setOnboardingStep(0);
    }
  }

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await apiFetch<{ message: string; csrProperties: string }>("/api/admin/zatca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: selectedBranch, ...form }),
    });
    if (res.ok) {
      setStatus({ type: "ok", msg: res.data?.message || "Configuration saved" });
      setCsrProperties(res.data?.csrProperties || "");
      await loadConfig(selectedBranch);
      setActiveTab("onboarding");
    } else {
      setStatus({ type: "err", msg: res.error || "Failed to save" });
    }
    setSaving(false);
  }

  async function handleStep(step: string, data: Record<string, unknown>) {
    setSaving(true);
    setStatus(null);
    const res = await apiFetch<{ message: string }>("/api/admin/zatca", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: selectedBranch, step, ...data }),
    });
    if (res.ok) {
      setStatus({ type: "ok", msg: res.data?.message || "Done" });
      await loadConfig(selectedBranch);
    } else {
      setStatus({ type: "err", msg: res.error || "Failed" });
    }
    setSaving(false);
  }

  function downloadPropertiesFile() {
    const blob = new Blob([csrProperties], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "csr-config.properties";
    a.click();
    URL.revokeObjectURL(url);
  }

  const sdkCsrCommand = "./fatoora -pem \\\n  -csrConfig csr-config.properties \\\n  -privateKey ec-secp256k1-private.pem \\\n  -generatedCsr csr.pem";

  const inputCls = "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent focus:outline-none transition-colors";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const btnSecondary = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const btnDanger = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 disabled:opacity-50 transition-colors";

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-gray-400">
      <div className="text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <p>Loading ZATCA configuration…</p>
      </div>
    </div>
  );

  const tabs = [
    { id: "config", icon: "⚙️", label: "Configuration", labelAr: "الإعدادات" },
    { id: "onboarding", icon: "🔐", label: "Onboarding", labelAr: "التسجيل" },
    { id: "status", icon: "📊", label: "Status", labelAr: "الحالة" },
  ] as const;

  const steps = [
    { label: "Private Key", labelAr: "المفتاح الخاص" },
    { label: "CSR & CCSID", labelAr: "الشهادة الأولية" },
    { label: "Production", labelAr: "الإنتاج" },
    { label: "Active", labelAr: "مفعّل" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            🧾 الفوترة الإلكترونية — ZATCA Phase 2
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure ZATCA e-invoicing compliance (UBL 2.1 / ECDSA-SHA256) for each branch
          </p>
        </div>
        {config?.isActive && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active / مفعّل
          </span>
        )}
      </div>

      {/* Branch Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className={labelCls}>🏪 Branch | الفرع</label>
        <select className={inputCls} value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-gray-800 shadow-sm text-green-700 dark:text-green-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.icon} {tab.label}
            <span className="hidden md:inline text-gray-400 text-xs ml-1">/ {tab.labelAr}</span>
          </button>
        ))}
      </div>

      {/* Status Banner */}
      {status && (
        <div className={`flex items-start gap-3 p-4 rounded-xl text-sm border ${
          status.type === "ok" ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
          : status.type === "err" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
        }`}>
          <span>{status.type === "ok" ? "✅" : status.type === "err" ? "❌" : "ℹ️"}</span>
          <span>{status.msg}</span>
          <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setStatus(null)}>✕</button>
        </div>
      )}

      {/* CONFIG TAB */}
      {activeTab === "config" && (
        <form onSubmit={handleSaveConfig} className="space-y-5">

          <SectionCard title="Seller Information | بيانات البائع" icon="🏢">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>VAT Number (TIN) | الرقم الضريبي <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} placeholder="3XXXXXXXXXXXXXX" maxLength={15} required />
                <p className="text-xs text-gray-400 mt-1">15 digits starting with 3 · يبدأ بـ 3 ويتكون من 15 رقم</p>
              </div>
              <div>
                <label className={labelCls}>Commercial Registration (CRN) | السجل التجاري <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.crn} onChange={(e) => setForm({ ...form, crn: e.target.value })} placeholder="1010010000" required />
              </div>
              <div>
                <label className={labelCls}>Seller Name (Arabic) | اسم البائع <span className="text-red-500">*</span></label>
                <input className={inputCls} dir="rtl" value={form.sellerNameAr} onChange={(e) => setForm({ ...form, sellerNameAr: e.target.value })} placeholder="شركة المثال للتجارة" required />
                <p className="text-xs text-gray-400 mt-1">يُستخدم في: <code className="font-mono">csr.organization.name</code></p>
              </div>
              <div>
                <label className={labelCls}>Seller Name (English)</label>
                <input className={inputCls} value={form.sellerNameEn} onChange={(e) => setForm({ ...form, sellerNameEn: e.target.value })} placeholder="Example Trading Company LTD" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Address | العنوان الوطني" icon="📍">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Street (Arabic) | اسم الشارع</label>
                <input className={inputCls} dir="rtl" value={form.streetNameAr} onChange={(e) => setForm({ ...form, streetNameAr: e.target.value })} placeholder="شارع الملك فهد" />
              </div>
              <div>
                <label className={labelCls}>Street (English)</label>
                <input className={inputCls} value={form.streetNameEn} onChange={(e) => setForm({ ...form, streetNameEn: e.target.value })} placeholder="King Fahd Road" />
              </div>
              <div>
                <label className={labelCls}>Building Number | رقم المبنى</label>
                <input className={inputCls} value={form.buildingNumber} onChange={(e) => setForm({ ...form, buildingNumber: e.target.value })} placeholder="1234" />
              </div>
              <div>
                <label className={labelCls}>Postal Zone | الرمز البريدي</label>
                <input className={inputCls} value={form.postalZone} onChange={(e) => setForm({ ...form, postalZone: e.target.value })} placeholder="12345" />
                <p className="text-xs text-gray-400 mt-1">يُستخدم في: <code className="font-mono">csr.location.address</code></p>
              </div>
              <div>
                <label className={labelCls}>District (Arabic) | الحي</label>
                <input className={inputCls} dir="rtl" value={form.citySubdivisionAr} onChange={(e) => setForm({ ...form, citySubdivisionAr: e.target.value })} placeholder="حي العليا" />
                <p className="text-xs text-gray-400 mt-1">يُستخدم في: <code className="font-mono">csr.organization.unit.name</code></p>
              </div>
              <div>
                <label className={labelCls}>District (English)</label>
                <input className={inputCls} value={form.citySubdivisionEn} onChange={(e) => setForm({ ...form, citySubdivisionEn: e.target.value })} placeholder="Al-Olaya District" />
              </div>
              <div>
                <label className={labelCls}>City (Arabic) | المدينة</label>
                <input className={inputCls} dir="rtl" value={form.cityNameAr} onChange={(e) => setForm({ ...form, cityNameAr: e.target.value })} placeholder="الرياض" />
              </div>
              <div>
                <label className={labelCls}>City (English)</label>
                <input className={inputCls} value={form.cityNameEn} onChange={(e) => setForm({ ...form, cityNameEn: e.target.value })} placeholder="Riyadh" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="ZATCA Settings | إعدادات هيئة الزكاة والضريبة" icon="⚙️">
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
                <label className={labelCls}>Invoice Types | أنواع الفواتير</label>
                <select className={inputCls} value={form.csrInvoiceType} onChange={(e) => setForm({ ...form, csrInvoiceType: e.target.value })}>
                  <option value="1100">Standard &amp; Simplified (1100)</option>
                  <option value="0100">Standard Only (0100)</option>
                  <option value="1000">Simplified Only (1000)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Business Category | فئة النشاط التجاري</label>
                <input className={inputCls} value={form.businessCategory} onChange={(e) => setForm({ ...form, businessCategory: e.target.value })} placeholder="Supply activities / أنشطة توريدات" />
                <p className="text-xs text-gray-400 mt-1">يُستخدم في: <code className="font-mono">csr.industry.business.category</code></p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="CSR Identity | هوية طلب الشهادة (SDK)" icon="🔑">
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <strong>ملاحظة:</strong> هذه الحقول تُولِّد ملف <code className="font-mono">csr-config.properties</code> المطلوب لأداة
              {" "}<code className="font-mono">fatoora</code> من هيئة الزكاة. إذا تُركت فارغة، سيُولِّد التطبيق قيماً تلقائية.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  CSR Common Name <code className="ml-1 text-xs font-mono text-gray-400">(csr.common.name)</code>
                </label>
                <input className={inputCls} value={form.csrCommonName} onChange={(e) => setForm({ ...form, csrCommonName: e.target.value })} placeholder={`TST-${form.crn || "CRN"}-${form.vatNumber || "VAT"}`} />
                <p className="text-xs text-gray-400 mt-1">e.g. <code className="font-mono">TST-886431145-399999999900003</code></p>
              </div>
              <div>
                <label className={labelCls}>
                  CSR Serial Number <code className="ml-1 text-xs font-mono text-gray-400">(csr.serial.number)</code>
                </label>
                <input className={inputCls} value={form.csrSerialNumber} onChange={(e) => setForm({ ...form, csrSerialNumber: e.target.value })} placeholder="1-TST|2-TST|3-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                <p className="text-xs text-gray-400 mt-1">Format: <code className="font-mono">1-TST|2-TST|3-UUID</code> · تُولَّد تلقائياً إذا تُركت فارغة</p>
              </div>
            </div>
          </SectionCard>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "⏳ Saving…" : "💾 Save & Generate CSR Properties"}
            </button>
            <span className="text-xs text-gray-400">بعد الحفظ ستُحوَّل إلى خطوات التسجيل</span>
          </div>
        </form>
      )}

      {/* ONBOARDING TAB */}
      {activeTab === "onboarding" && (
        <div className="space-y-5">
          {!config ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                ⚠️ Please save the configuration first before proceeding.
                <br />يرجى حفظ الإعدادات أولاً قبل المتابعة.
              </p>
              <button className={`${btnPrimary} mt-3`} onClick={() => setActiveTab("config")}>⚙️ Go to Configuration</button>
            </div>
          ) : (
            <>
              {/* Step Progress */}
              <SectionCard title="ZATCA Onboarding Steps | خطوات التسجيل" icon="🗺️">
                <div className="flex items-center">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <StepBadge step={i + 1} current={onboardingStep} done={i < onboardingStep} />
                        <span className={`text-xs text-center ${i === onboardingStep ? "font-bold text-blue-600 dark:text-blue-400" : i < onboardingStep ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                          <span className="block">{s.label}</span>
                          <span className="block">{s.labelAr}</span>
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < onboardingStep ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Step 1: Private Key */}
              <SectionCard title="Step 1: EC Private Key | المفتاح الخاص" icon="🔏">
                <div className={`space-y-4 ${onboardingStep > 0 ? "opacity-60 pointer-events-none" : ""}`}>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ZATCA uses <strong>ECDSA secp256k1</strong>. The SDK can generate the key alongside the CSR in Step 2.
                    Alternatively, pre-generate with OpenSSL:
                  </p>
                  <CodeBlock code="openssl ecparam -name secp256k1 -genkey -noout -out ec-secp256k1-private.pem" />
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                    💡 The <code className="font-mono">fatoora -pem</code> command in Step 2 generates both key and CSR at once — you may skip this step.
                  </div>
                  <div>
                    <label className={labelCls}>Paste Private Key PEM | الصق المفتاح الخاص</label>
                    <textarea
                      className={`${inputCls} h-28 font-mono text-xs`}
                      placeholder={"-----BEGIN EC PRIVATE KEY-----\nMHQCAQEEIBMbqg...\n-----END EC PRIVATE KEY-----"}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                    />
                  </div>
                  <button className={btnPrimary} disabled={!privateKey || saving} onClick={() => handleStep("private_key", { privateKeyPem: privateKey })}>
                    {saving ? "⏳ Saving…" : "🔒 Store Private Key"}
                  </button>
                </div>
                {onboardingStep > 0 && (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium mt-4">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
                    Private key stored securely
                  </div>
                )}
              </SectionCard>

              {/* Step 2: CSR & CCSID */}
              <SectionCard title="Step 2: CSR Generation & Compliance CSID | طلب الشهادة والامتثال" icon="📜">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">2a — CSR Properties File | ملف الإعدادات</h4>
                    {csrProperties ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-mono">csr-config.properties</span>
                          <div className="flex gap-2">
                            <CopyButton text={csrProperties} label="Copy" />
                            <button type="button" onClick={downloadPropertiesFile} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors">
                              ⬇️ Download .properties
                            </button>
                          </div>
                        </div>
                        <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {csrProperties}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                        ⚠️ Save the configuration first to generate the <code className="font-mono mx-1">csr-config.properties</code> file.
                        <button className="underline ml-2" onClick={() => setActiveTab("config")}>Go to Configuration →</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">2b — Generate CSR using ZATCA SDK</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Run inside the <code className="font-mono text-xs">zatca-einvoicing-sdk</code> directory:
                    </p>
                    <CodeBlock code={sdkCsrCommand} />
                    <p className="text-xs text-gray-400 mt-2">
                      Generates <code className="font-mono">ec-secp256k1-private.pem</code> and <code className="font-mono">csr.pem</code>.
                      Convert to base64:
                    </p>
                    <div className="mt-2">
                      <CodeBlock code={"base64 -i csr.pem | tr -d '\\n'"} />
                    </div>
                  </div>

                  <div className={onboardingStep > 1 ? "opacity-60 pointer-events-none" : ""}>
                    <h4 className="font-semibold text-sm mb-2">2c — Compliance CSID | شهادة الامتثال (CCSID)</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Get a one-time password (OTP) from <strong>ZATCA Fatoora Portal → Onboarding</strong>, then paste the CSR:
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>CSR (Base64) | طلب الشهادة مشفّراً</label>
                        <textarea
                          className={`${inputCls} h-20 font-mono text-xs`}
                          placeholder="Paste the base64-encoded CSR from csr.pem…"
                          value={csrBase64}
                          onChange={(e) => setCsrBase64(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>OTP from ZATCA Portal | رمز OTP من البوابة</label>
                        <input className={inputCls} placeholder="e.g. 123345" value={otp} onChange={(e) => setOtp(e.target.value)} />
                      </div>
                      {onboardingStep === 1 && (
                        <button className={btnSecondary} disabled={!csrBase64 || saving} onClick={() => handleStep("csr", { csrBase64 })}>
                          {saving ? "⏳…" : "📥 Store CSR"}
                        </button>
                      )}
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h5 className="text-sm font-semibold mb-2">Compliance Credentials | بيانات شهادة الامتثال</h5>
                      <p className="text-xs text-gray-500 mb-3">
                        After the ZATCA Compliance API returns <code className="font-mono">binarySecurityToken</code> and <code className="font-mono">secret</code>:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Binary Security Token</label>
                          <input className={inputCls} placeholder="binarySecurityToken…" value={compToken} onChange={(e) => setCompToken(e.target.value)} />
                        </div>
                        <div>
                          <label className={labelCls}>Secret | السر</label>
                          <input className={inputCls} type="password" placeholder="••••••••" value={compSecret} onChange={(e) => setCompSecret(e.target.value)} />
                        </div>
                      </div>
                      <button
                        className={`${btnPrimary} mt-3`}
                        disabled={!compToken || !compSecret || saving}
                        onClick={() => handleStep("compliance_cert", { binarySecurityToken: compToken, secret: compSecret })}
                      >
                        {saving ? "⏳ Saving…" : "🛡️ Store Compliance Certificate"}
                      </button>
                    </div>
                  </div>

                  {onboardingStep > 1 && (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium">
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
                      Compliance certificate stored
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Step 3: Production */}
              <SectionCard title="Step 3: Production Certificate | شهادة الإنتاج" icon="🏭">
                <div className={`space-y-4 ${onboardingStep !== 2 ? "opacity-60 pointer-events-none" : ""}`}>
                  {onboardingStep < 2 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 text-center">
                      Complete the compliance certificate step first.
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    After passing compliance checks, call the ZATCA <strong>PCSID API</strong> to obtain production credentials.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Production Token</label>
                      <input className={inputCls} placeholder="binarySecurityToken…" value={prodToken} onChange={(e) => setProdToken(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Production Secret | السر</label>
                      <input className={inputCls} type="password" placeholder="••••••••" value={prodSecret} onChange={(e) => setProdSecret(e.target.value)} />
                    </div>
                  </div>
                  <button className={btnPrimary} disabled={!prodToken || !prodSecret || saving} onClick={() => handleStep("production_cert", { binarySecurityToken: prodToken, secret: prodSecret })}>
                    {saving ? "⏳ Saving…" : "🏭 Store Production Certificate"}
                  </button>
                </div>
                {onboardingStep > 2 && (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium mt-4">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
                    Production certificate stored
                  </div>
                )}
              </SectionCard>

              {/* Step 4: Activate */}
              <SectionCard title="Step 4: Activate | تفعيل الفوترة الإلكترونية" icon="🚀">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Once the production certificate is stored, activate ZATCA e-invoicing for this branch.
                    All new invoices will be signed and reported to ZATCA automatically.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      className={config?.isActive ? btnDanger : btnPrimary}
                      disabled={onboardingStep < 1 || saving}
                      onClick={() => handleStep(config?.isActive ? "deactivate" : "activate", {})}
                    >
                      {saving ? "⏳…" : config?.isActive ? "🔴 Deactivate ZATCA" : "🟢 Activate ZATCA E-Invoicing"}
                    </button>
                    <button
                      className={btnDanger}
                      disabled={saving}
                      onClick={() => {
                        if (window.confirm("⚠️ Reset invoice counters (ICV + PIH)? Only do this in sandbox/testing.")) {
                          handleStep("reset_counters", {});
                        }
                      }}
                    >
                      🔄 Reset Counters (Testing Only)
                    </button>
                  </div>
                  {onboardingStep >= 3 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                      💡 After activation, invoices are automatically submitted to ZATCA. Check the <strong>Status</strong> tab for real-time details.
                    </div>
                  )}
                </div>
              </SectionCard>
            </>
          )}
        </div>
      )}

      {/* STATUS TAB */}
      {activeTab === "status" && (
        <div className="space-y-5">
          <SectionCard title="ZATCA Status Dashboard | لوحة الحالة" icon="📊">
            {config ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Status / الحالة", value: config.isActive ? "Active ✓" : "Inactive", color: config.isActive ? "text-green-600 dark:text-green-400" : "text-red-500" },
                  { label: "Environment / البيئة", value: config.environment, color: config.environment === "production" ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400" },
                  { label: "Invoice Counter (ICV)", value: String(config.lastIcv), color: "" },
                  { label: "VAT Number / الرقم الضريبي", value: config.vatNumber, color: "font-mono text-sm" },
                  { label: "CRN / السجل التجاري", value: config.crn, color: "font-mono text-sm" },
                  { label: "Private Key / المفتاح الخاص", value: config.privateKeyPem ? "✓ Configured" : "✗ Not Set", color: config.privateKeyPem ? "text-green-600 dark:text-green-400" : "text-red-500" },
                  { label: "Compliance Cert / شهادة الامتثال", value: config.complianceCertBase64 ? "✓ Configured" : "✗ Not Set", color: config.complianceCertBase64 ? "text-green-600 dark:text-green-400" : "text-red-500" },
                  { label: "Production Cert / شهادة الإنتاج", value: config.productionCertBase64 ? "✓ Configured" : "✗ Not Set", color: config.productionCertBase64 ? "text-green-600 dark:text-green-400" : "text-red-500" },
                  { label: "Invoice Types / أنواع الفواتير", value: config.csrInvoiceType === "1100" ? "Standard & Simplified" : config.csrInvoiceType === "0100" ? "Standard Only" : "Simplified Only", color: "" },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className={`text-base font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No ZATCA configuration found for this branch.</p>
                <button className="underline text-green-600 mt-2 text-sm" onClick={() => setActiveTab("config")}>Configure now →</button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="SDK Reference | مرجع أداة fatoora" icon="📖">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ZATCA SDK provides the <code className="font-mono text-xs">fatoora</code> CLI for cryptographic operations (Java 11–15 required).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-900">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Flag</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["-pem", "Generate CSR + private key in PEM format"],
                      ["-csr", "Generate CSR + private key (DER format)"],
                      ["-csrConfig <file>", "Specify the .properties config file"],
                      ["-privateKey <file>", "Output file for private key"],
                      ["-generatedCsr <file>", "Output file for CSR"],
                      ["-sign", "Sign an invoice XML (XAdES ECDSA-SHA256)"],
                      ["-validate", "Validate a signed invoice against ZATCA rules"],
                      ["-qr", "Generate QR code for simplified invoice"],
                      ["-invoiceRequest", "Generate API request JSON for ZATCA portal"],
                      ["-generateHash", "Compute invoice hash (PIH)"],
                      ["-nonprod", "Target sandbox/simulation environment"],
                    ].map(([flag, desc]) => (
                      <tr key={flag} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{flag}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="API Integration Guide | دليل تكامل الواجهة البرمجية" icon="🔗">
            <div className="space-y-3">
              {[
                { method: "GET", path: "/api/orders/:orderId/invoice", desc: "Generate or retrieve PDF invoice (ZATCA-signed if configured)" },
                { method: "GET", path: "/api/orders/:orderId/invoice?format=xml", desc: "Get signed UBL 2.1 XML invoice" },
                { method: "GET", path: "/api/orders/:orderId/invoice?format=json", desc: "Get invoice metadata: ZATCA status, QR code, hash" },
                { method: "POST", path: "/api/orders/:orderId/invoice", desc: "Retry ZATCA API submission for a pending invoice" },
              ].map((item) => (
                <div key={item.path} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold font-mono ${item.method === "GET" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                    {item.method}
                  </span>
                  <div>
                    <p className="font-mono text-xs text-gray-800 dark:text-gray-200">{item.path}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
