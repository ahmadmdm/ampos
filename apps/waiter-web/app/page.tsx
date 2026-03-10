"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAlertSound } from "@pos1/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.clo0.net";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? API;
const BRANCH_ID = "br_demo";
const DEMO_LOGIN = {
  email: "waiter@demo.local",
  password: "demo123"
};

type Call = { id: string; table: { code: string }; reason: string; note?: string; status: "CREATED" | "ACKNOWLEDGED" | "RESOLVED"; createdAt: string };
type ReadyTicket = { id: string; order: { id: string; table?: { code: string } | null }; updatedAt: string };

export default function WaiterPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [ready, setReady] = useState<ReadyTicket[]>([]);
  const [statusText, setStatusText] = useState("جاهز");
  const [accessToken, setAccessToken] = useState("");
  const playAlert = useAlertSound();

  function getAuthHeaders() {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }

  useEffect(() => {
    let cancelled = false;

    async function login() {
      try {
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(DEMO_LOGIN)
        }).then((r) => r.json());

        if (!cancelled) {
          if (res.ok && res.data?.accessToken) {
            setAccessToken(res.data.accessToken);
          } else {
            setStatusText(`فشل تسجيل الدخول: ${res.error ?? "UNKNOWN"}`);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatusText(`فشل تسجيل الدخول: ${(error as Error).message}`);
        }
      }
    }

    login();

    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchAll() {
    if (!accessToken) return;
    try {
      const [callsRes, readyRes] = await Promise.all([
        fetch(`${API}/api/waiter/calls?branchId=${BRANCH_ID}`, { headers: getAuthHeaders() }).then((r) => r.json()),
        fetch(`${API}/api/waiter/ready-queue?branchId=${BRANCH_ID}`, { headers: getAuthHeaders() }).then((r) => r.json())
      ]);

      setCalls(callsRes.data ?? []);
      setReady(readyRes.data ?? []);
      if (callsRes.ok && readyRes.ok) {
        setStatusText(`النداءات: ${callsRes.data?.length ?? 0} | الجاهز: ${readyRes.data?.length ?? 0}`);
      } else {
        setStatusText(`فشل التحديث: ${callsRes.error ?? readyRes.error ?? "UNKNOWN"}`);
      }
    } catch (err) {
      setStatusText(`خطأ في الاتصال: ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    fetchAll();
    const t = setInterval(fetchAll, 3000);
    return () => clearInterval(t);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: accessToken }
    });
    socket.emit("join-waiter", BRANCH_ID);
    const refresh = () => fetchAll();
    socket.on("WAITER_CALL_CREATED", () => { playAlert(1000, 0.3, 3); refresh(); });
    socket.on("WAITER_CALL_ACKNOWLEDGED", refresh);
    socket.on("WAITER_CALL_RESOLVED", refresh);
    socket.on("KITCHEN_TICKET_UPDATED", () => { playAlert(660, 0.15, 2); refresh(); });
    return () => {
      socket.off("WAITER_CALL_CREATED", refresh);
      socket.off("WAITER_CALL_ACKNOWLEDGED", refresh);
      socket.off("WAITER_CALL_RESOLVED", refresh);
      socket.off("KITCHEN_TICKET_UPDATED", refresh);
      socket.disconnect();
    };
  }, [accessToken]);

  async function ack(id: string) {
    const res = await fetch(`${API}/api/waiter/calls/${id}/ack`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ actorUserId: "waiter_demo" })
    }).then((r) => r.json());
    setStatusText(res.ok ? "تم استلام النداء" : `فشل الاستلام: ${res.error ?? "UNKNOWN"}`);
    fetchAll();
  }

  async function resolve(id: string) {
    const res = await fetch(`${API}/api/waiter/calls/${id}/resolve`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ actorUserId: "waiter_demo" })
    }).then((r) => r.json());
    setStatusText(res.ok ? "تم حل النداء" : `فشل الحل: ${res.error ?? "UNKNOWN"}`);
    fetchAll();
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="brand-row">
          <div>
            <h1>واجهة النادل / Runner</h1>
            <p>متابعة النداءات والطلبات الجاهزة للتقديم لحظيًا</p>
          </div>
          <span className="badge">الفرع: {BRANCH_ID}</span>
        </div>
        <div className="status" style={{ marginTop: 10 }}>{statusText}</div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h3>جاهز للتقديم</h3>
          {ready.length === 0 ? <span className="pill">لا يوجد عناصر جاهزة</span> : (
            <ul className="list">
              {ready.map((t) => (
                <li key={t.id}>
                  <div><strong>تذكرة #{t.id.slice(0, 8)}</strong></div>
                  <div>طلب: {t.order.id}</div>
                  <div>طاولة: {t.order.table?.code ?? "-"}</div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h3>صندوق نداءات النادل</h3>
          {calls.length === 0 ? <span className="pill">لا توجد نداءات</span> : (
            <ul className="list">
              {calls.map((call) => (
                <li key={call.id}>
                  <div className="brand-row">
                    <strong>الطاولة {call.table?.code ?? "-"}</strong>
                    <span className="pill">{call.status}</span>
                  </div>
                  <div>السبب: {call.reason}</div>
                  <div>ملاحظة: {call.note || "-"}</div>
                  <div className="row" style={{ marginTop: 6 }}>
                    {call.status === "CREATED" && <button className="btn btn-secondary" onClick={() => ack(call.id)}>استلام</button>}
                    {call.status !== "RESOLVED" && <button className="btn btn-primary" onClick={() => resolve(call.id)}>تم الحل</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
