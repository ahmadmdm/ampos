"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const ALL_ROLES = [
  { code: "OWNER", label: "مالك" },
  { code: "BRANCH_MANAGER", label: "مدير فرع" },
  { code: "CASHIER", label: "كاشير" },
  { code: "KITCHEN", label: "مطبخ" },
  { code: "WAITER_RUNNER", label: "نادل" },
  { code: "INVENTORY", label: "مخزون" },
  { code: "ACCOUNTANT", label: "محاسب" },
];

type Role = { role: { code: string; name: string } };
type BranchLink = { branch: { id: string; name: string; code: string } };
type User = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
  userRoles: Role[];
  branches: BranchLink[];
};
type Branch = { id: string; code: string; name: string };

const EMPTY_FORM = {
  email: "",
  displayName: "",
  phone: "",
  password: "",
  roleCodes: [] as string[],
  branchIds: [] as string[],
  status: "ACTIVE" as "ACTIVE" | "SUSPENDED",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    const [u, b] = await Promise.all([
      apiFetch<User[]>("/api/admin/organization/users"),
      apiFetch<Branch[]>("/api/admin/branches"),
    ]);
    setUsers(u.data ?? []);
    setBranches(b.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({
      email: u.email,
      displayName: u.displayName,
      phone: u.phone ?? "",
      password: "",
      status: u.status,
      roleCodes: u.userRoles.map((r) => r.role.code),
      branchIds: u.branches.map((b) => b.branch.id),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !form.displayName.trim()) return;

    if (editing) {
      // Update user info
      const updateBody: Record<string, unknown> = {
        displayName: form.displayName,
        email: form.email,
        phone: form.phone || null,
        status: form.status,
        branchIds: form.branchIds,
      };
      if (form.password) updateBody.password = form.password;

      const res = await apiFetch(`/api/admin/organization/users/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      });

      // Update roles
      await apiFetch(`/api/admin/organization/users/${editing.id}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roleCodes: form.roleCodes }),
      });

      setStatus(res.ok ? `تم تحديث "${form.displayName}"` : `خطأ: ${res.error}`);
    } else {
      if (!form.password) { setStatus("كلمة المرور مطلوبة للمستخدم الجديد"); return; }
      const res = await apiFetch("/api/admin/organization/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          phone: form.phone || undefined,
          password: form.password,
          branchId: form.branchIds[0] || undefined,
          roleCode: form.roleCodes[0] || undefined,
        }),
      });
      setStatus(res.ok ? `تم إنشاء المستخدم "${form.displayName}"` : `خطأ: ${res.error}`);

      // If more than one role, set the rest
      if (res.ok && form.roleCodes.length > 1 && (res.data as User | undefined)?.id) {
        await apiFetch(`/api/admin/organization/users/${(res.data as User).id}/roles`, {
          method: "PATCH",
          body: JSON.stringify({ roleCodes: form.roleCodes }),
        });
      }
    }

    setShowModal(false);
    load();
  }

  async function handleDelete(u: User) {
    if (!confirm(`حذف المستخدم "${u.displayName}"؟ لا يمكن التراجع`)) return;
    const res = await apiFetch(`/api/admin/organization/users/${u.id}`, { method: "DELETE" });
    setStatus(res.ok ? `تم حذف "${u.displayName}"` : `خطأ: ${res.error}`);
    load();
  }

  async function toggleStatus(u: User) {
    const newStatus = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await apiFetch(`/api/admin/organization/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(`تم ${newStatus === "ACTIVE" ? "تفعيل" : "تعليق"} "${u.displayName}"`);
    load();
  }

  function toggleRole(code: string) {
    setForm((prev) => ({
      ...prev,
      roleCodes: prev.roleCodes.includes(code)
        ? prev.roleCodes.filter((r) => r !== code)
        : [...prev.roleCodes, code],
    }));
  }

  function toggleBranch(id: string) {
    setForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(id)
        ? prev.branchIds.filter((b) => b !== id)
        : [...prev.branchIds, id],
    }));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>👥 إدارة المستخدمين</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ مستخدم جديد</button>
      </div>

      {status && <div className="status">{status}</div>}

      <div className="panel">
        {loading ? (
          <div className="pill">جار التحميل...</div>
        ) : users.length === 0 ? (
          <div className="pill">لا يوجد مستخدمون — أنشئ مستخدماً جديداً</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الأدوار</th>
                <th>الفروع</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.displayName}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    {u.userRoles.map((r) => (
                      <span key={r.role.code} className="role-chip">
                        {ALL_ROLES.find((ar) => ar.code === r.role.code)?.label ?? r.role.code}
                      </span>
                    ))}
                  </td>
                  <td>
                    {u.branches.map((b) => (
                      <span key={b.branch.id} className="branch-chip">{b.branch.name || b.branch.code}</span>
                    ))}
                  </td>
                  <td>
                    <span
                      className={u.status === "ACTIVE" ? "status-active" : "status-suspended"}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleStatus(u)}
                      title="انقر للتغيير"
                    >
                      {u.status === "ACTIVE" ? "نشط" : "معلّق"}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="icon-btn" onClick={() => openEdit(u)} title="تعديل">✏️</button>
                      <button className="icon-btn danger" onClick={() => handleDelete(u)} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `تعديل: ${editing.displayName}` : "إنشاء مستخدم جديد"}</h2>
            <form className="stack" onSubmit={handleSubmit}>
              <label>الاسم</label>
              <input className="field" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="أحمد محمد" required />

              <label>البريد الإلكتروني</label>
              <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ahmed@example.com" required />

              <label>رقم الجوال</label>
              <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+966512345678" />

              <label>{editing ? "كلمة مرور جديدة (اتركها فارغة للحفاظ)" : "كلمة المرور"}</label>
              <input className="field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" {...(!editing && { required: true })} />

              <label>الأدوار</label>
              <div className="checkbox-group">
                {ALL_ROLES.map((r) => (
                  <label key={r.code}>
                    <input type="checkbox" checked={form.roleCodes.includes(r.code)} onChange={() => toggleRole(r.code)} />
                    {r.label}
                  </label>
                ))}
              </div>

              <label>الفروع</label>
              <div className="checkbox-group">
                {branches.map((b) => (
                  <label key={b.id}>
                    <input type="checkbox" checked={form.branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                    {b.name || b.code}
                  </label>
                ))}
              </div>

              {editing && (
                <>
                  <label>الحالة</label>
                  <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "SUSPENDED" })}>
                    <option value="ACTIVE">نشط</option>
                    <option value="SUSPENDED">معلّق</option>
                  </select>
                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editing ? "حفظ التعديلات" : "إنشاء المستخدم"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
