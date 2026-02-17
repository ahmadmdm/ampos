"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAlertSound } from "@pos1/ui";

const API = "http://localhost:3001";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001";
const BRANCH_ID = "br_demo";
const DEV_AUTH_HEADERS = {
  "x-roles": "KITCHEN",
  "x-org-id": "org_demo",
  "x-branch-id": BRANCH_ID,
  "x-user-id": "kitchen_demo"
};

type Ticket = {
  id: string;
  status: "NEW" | "COOKING" | "READY" | "SERVED";
  createdAt: string;
  order: { id: string; table?: { code: string } | null };
  items: Array<{ id: string; status: "NEW" | "COOKING" | "READY" | "SERVED"; orderItem: { itemNameAr: string; qty: number } }>;
};

const columns: Ticket["status"][] = ["NEW", "COOKING", "READY", "SERVED"];
const labels: Record<Ticket["status"], string> = {
  NEW: "جديد",
  COOKING: "قيد التحضير",
  READY: "جاهز",
  SERVED: "تم التقديم"
};

export default function KdsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stationFilter, setStationFilter] = useState("ALL");
  const [statusText, setStatusText] = useState("جاهز");
  const playAlert = useAlertSound();
  const prevCountRef = useRef(0);

  async function fetchTickets() {
    const query = stationFilter === "ALL" ? "" : `&station=${stationFilter}`;
    const res = await fetch(`${API}/api/kds/tickets?branchId=${BRANCH_ID}${query}`, { headers: DEV_AUTH_HEADERS }).then((r) => r.json());
    setTickets(res.data ?? []);
    setStatusText(res.ok ? `تم تحديث ${res.data?.length ?? 0} تذكرة` : `فشل الجلب: ${res.error ?? "UNKNOWN"}`);
  }

  useEffect(() => {
    fetchTickets();
    const t = setInterval(fetchTickets, 4000);
    return () => clearInterval(t);
  }, [stationFilter]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.emit("join-kds", BRANCH_ID);
    const refresh = () => fetchTickets();
    socket.on("KITCHEN_TICKET_CREATED", () => { playAlert(880, 0.2, 3); refresh(); });
    socket.on("KITCHEN_TICKET_UPDATED", refresh);
    socket.on("ORDER_CREATED", () => { playAlert(660, 0.15, 2); refresh(); });
    return () => {
      socket.off("KITCHEN_TICKET_CREATED", refresh);
      socket.off("KITCHEN_TICKET_UPDATED", refresh);
      socket.off("ORDER_CREATED", refresh);
      socket.disconnect();
    };
  }, [stationFilter]);

  const byStatus = useMemo(
    () => columns.map((status) => ({ status, list: tickets.filter((t) => t.status === status) })),
    [tickets]
  );

  async function move(ticketId: string, next: Ticket["status"]) {
    const res = await fetch(`${API}/api/kds/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...DEV_AUTH_HEADERS },
      body: JSON.stringify({ status: next })
    }).then((r) => r.json());
    setStatusText(res.ok ? "تم تحديث حالة التذكرة" : `فشل التحديث: ${res.error ?? "UNKNOWN"}`);
    fetchTickets();
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="brand-row">
          <div>
            <h1>لوحة المطبخ KDS</h1>
            <p>إدارة دورة التحضير من جديد حتى تم التقديم</p>
          </div>
          <span className="badge">الفرع: {BRANCH_ID}</span>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          {[
            { k: "ALL", l: "الكل" },
            { k: "PASS", l: "التمرير" },
            { k: "GRILL", l: "الشواية" },
            { k: "DRINKS", l: "المشروبات" }
          ].map((s) => (
            <button key={s.k} className={`btn ${stationFilter === s.k ? "btn-primary" : "btn-secondary"}`} onClick={() => setStationFilter(s.k)}>{s.l}</button>
          ))}
        </div>
        <div className="status" style={{ marginTop: 10 }}>{statusText}</div>
      </section>

      <section className="board">
        {byStatus.map((column) => (
          <article key={column.status} className="panel">
            <h3>{labels[column.status]}</h3>
            <div className="stack">
              {column.list.map((ticket) => {
                const elapsedMin = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
                const danger = elapsedMin >= 12;
                return (
                  <div key={ticket.id} className={`ticket ${danger ? "alert" : ""}`}>
                    <div className="brand-row">
                      <strong>#{ticket.id.slice(0, 8)}</strong>
                      <span className="pill">{elapsedMin} دقيقة</span>
                    </div>
                    <div>رقم الطلب: {ticket.order.id}</div>
                    <div>الطاولة: {ticket.order.table?.code ?? "-"}</div>
                    <ul className="list">
                      {ticket.items.map((i) => (
                        <li key={i.id}>{i.orderItem.itemNameAr} x{i.orderItem.qty}</li>
                      ))}
                    </ul>
                    <div className="row">
                      {columns.filter((c) => c !== ticket.status).map((next) => (
                        <button key={next} className="btn btn-secondary" onClick={() => move(ticket.id, next)}>{labels[next]}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {column.list.length === 0 ? <span className="pill">لا توجد تذاكر</span> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
