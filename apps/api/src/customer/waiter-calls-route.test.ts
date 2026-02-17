import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as postWaiterCall } from "../../app/api/customer/waiter-calls/route";
import { POST as postRequestBill } from "../../app/api/customer/request-bill/route";

const mocked = vi.hoisted(() => {
  const prisma = {
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma)),
    branch: {
      findUnique: vi.fn()
    },
    waiterCall: {
      create: vi.fn()
    }
  };
  return {
    prisma,
    enforceRateLimit: vi.fn(),
    assertValidTableToken: vi.fn(),
    enqueueOutboxEvent: vi.fn(),
    flushPendingOutboxEvents: vi.fn()
  };
});

vi.mock("@/src/lib/prisma", () => ({
  prisma: mocked.prisma
}));

vi.mock("@/src/lib/rate-limit", () => ({
  enforceRateLimit: mocked.enforceRateLimit
}));

vi.mock("@/src/realtime/outbox", () => ({
  enqueueOutboxEvent: mocked.enqueueOutboxEvent,
  flushPendingOutboxEvents: mocked.flushPendingOutboxEvents
}));

vi.mock("@/src/lib/table-auth", () => ({
  assertValidTableToken: mocked.assertValidTableToken
}));

describe("customer waiter routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.enqueueOutboxEvent.mockResolvedValue(undefined);
    mocked.flushPendingOutboxEvents.mockResolvedValue({ sent: 1, failed: 0 });
  });

  it("uses branch waiterCallCooldownSec for waiter calls", async () => {
    mocked.assertValidTableToken.mockResolvedValue(null);
    mocked.prisma.branch.findUnique.mockResolvedValue({
      id: "br_1",
      organizationId: "org_1",
      isWaiterCallEnabled: true,
      waiterCallCooldownSec: 90
    });
    mocked.enforceRateLimit.mockResolvedValue(true);
    mocked.prisma.waiterCall.create.mockResolvedValue({
      id: "wc_1",
      branchId: "br_1"
    });

    const req = new NextRequest("http://localhost:3001/api/customer/waiter-calls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: "br_1",
        tableId: "tbl_1",
        reason: "ASSISTANCE",
        token: "tok",
        cooldownSec: 1
      })
    });

    const res = await postWaiterCall(req);
    expect(res.status).toBe(200);
    expect(mocked.enforceRateLimit).toHaveBeenCalledWith("waiter_call:br_1:tbl_1", 90);
  });

  it("applies waiter settings and enqueues outbox event for request bill", async () => {
    mocked.assertValidTableToken.mockResolvedValue(null);
    mocked.prisma.branch.findUnique.mockResolvedValue({
      id: "br_1",
      organizationId: "org_1",
      isWaiterCallEnabled: true,
      waiterCallCooldownSec: 60
    });
    mocked.enforceRateLimit.mockResolvedValue(true);
    mocked.prisma.waiterCall.create.mockResolvedValue({
      id: "wc_2",
      branchId: "br_1"
    });

    const req = new NextRequest("http://localhost:3001/api/customer/request-bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: "br_1",
        tableId: "tbl_1",
        token: "tok"
      })
    });

    const res = await postRequestBill(req);
    expect(res.status).toBe(201);
    expect(mocked.enforceRateLimit).toHaveBeenCalledWith("waiter_call:br_1:tbl_1", 60);
    expect(mocked.enqueueOutboxEvent).toHaveBeenCalledTimes(1);
  });
});
