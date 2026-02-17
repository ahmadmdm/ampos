import { describe, expect, it, vi, beforeEach } from "vitest";

const mocked = vi.hoisted(() => {
  const mockTx = {
    auditLog: {
      create: vi.fn(),
    },
  };
  const mockPrisma = {
    auditLog: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
  const mockEmitRealtime = vi.fn();

  return { mockTx, mockPrisma, mockEmitRealtime };
});

vi.mock("@/src/lib/prisma", () => ({ prisma: mocked.mockPrisma }));
vi.mock("@/src/realtime/emitter", () => ({ emitRealtime: mocked.mockEmitRealtime }));

import { enqueueOutboxEvent, flushPendingOutboxEvents } from "./outbox";

describe("outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enqueueOutboxEvent", () => {
    it("creates an audit log entry with OUTBOX_PENDING", async () => {
      await enqueueOutboxEvent(mocked.mockTx as any, {
        organizationId: "org1",
        branchId: "br1",
        userId: "u1",
        requestId: "req-1",
        envelope: {
          event: "ORDER_CREATED" as any,
          branchId: "br1",
          correlationId: "corr-1",
          payload: { orderId: "o1" },
        },
      });

      expect(mocked.mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "OUTBOX_PENDING",
            entityType: "RealtimeEvent",
          }),
        })
      );
    });
  });

  describe("flushPendingOutboxEvents", () => {
    it("sends pending events and marks them OUTBOX_SENT", async () => {
      mocked.mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: "log1",
          afterJson: {
            event: "ORDER_CREATED",
            branchId: "br1",
            correlationId: "c1",
            payload: { orderId: "o1" },
          },
        },
      ]);
      mocked.mockEmitRealtime.mockResolvedValue(undefined);

      const result = await flushPendingOutboxEvents(10);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(mocked.mockEmitRealtime).toHaveBeenCalledTimes(1);
      expect(mocked.mockPrisma.auditLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log1" },
          data: expect.objectContaining({ action: "OUTBOX_SENT" }),
        })
      );
    });

    it("marks invalid envelope as OUTBOX_FAILED", async () => {
      mocked.mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: "log2", afterJson: "not-valid" },
      ]);

      const result = await flushPendingOutboxEvents(10);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(mocked.mockPrisma.auditLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "log2" },
          data: expect.objectContaining({ action: "OUTBOX_FAILED" }),
        })
      );
    });

    it("handles emit errors gracefully", async () => {
      mocked.mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: "log3",
          afterJson: {
            event: "ORDER_CREATED",
            branchId: "br1",
            correlationId: "c3",
            payload: {},
          },
        },
      ]);
      mocked.mockEmitRealtime.mockRejectedValue(new Error("Redis down"));

      const result = await flushPendingOutboxEvents(10);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});
