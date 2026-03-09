import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { redisSubscriber } from "../lib/redis";
import { verifyAccessToken } from "../lib/jwt";
import { verifyTableToken } from "../lib/crypto";
import { prisma } from "../lib/prisma";
import { flushPendingOutboxEvents } from "./outbox";

const port = Number(process.env.SOCKET_PORT ?? 4001);

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

type SocketAuth =
  | {
      kind: "user";
      userId: string;
      organizationId: string;
      branchIds: string[];
      roles: string[];
    }
  | {
      kind: "table";
      branchId: string;
      tableId: string;
    };

// Auth middleware — verify JWT before allowing connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (typeof token === "string" && token) {
    try {
      const claims = verifyAccessToken(token);
      (socket as any).auth = {
        kind: "user",
        userId: claims.sub,
        organizationId: claims.org,
        branchIds: claims.branches,
        roles: claims.roles
      } satisfies SocketAuth;
      return next();
    } catch {
      return next(new Error("UNAUTHORIZED: invalid token"));
    }
  }

  const tableToken = socket.handshake.auth?.tableToken || socket.handshake.query?.tableToken;
  if (typeof tableToken !== "string" || !tableToken) {
    return next(new Error("UNAUTHORIZED: token required"));
  }

  try {
    const branchId = socket.handshake.auth?.branchId || socket.handshake.query?.branchId;
    if (typeof branchId !== "string" || !branchId) {
      return next(new Error("UNAUTHORIZED: branch required"));
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { qrTokenSecret: true }
    });
    if (!branch) {
      return next(new Error("UNAUTHORIZED: branch not found"));
    }

    const secret = branch.qrTokenSecret ?? process.env.QR_SIGNING_SECRET ?? "dev_qr_secret";
    const payload = verifyTableToken(tableToken, secret);
    if (!payload || payload.branchId !== branchId) {
      return next(new Error("UNAUTHORIZED: invalid table token"));
    }

    (socket as any).auth = {
      kind: "table",
      branchId: payload.branchId,
      tableId: payload.tableId
    } satisfies SocketAuth;
    return next();
  } catch {
    return next(new Error("UNAUTHORIZED: invalid table token"));
  }
});

io.on("connection", (socket) => {
  const auth = (socket as any).auth as SocketAuth;

  socket.on("join-branch", (branchId: string) => {
    if (auth.kind === "user" && (auth.roles.includes("OWNER") || auth.branchIds.includes(branchId))) {
      socket.join(`branch:${branchId}`);
    }
  });
  socket.on("join-kds", (branchId: string) => {
    if (auth.kind === "user" && (auth.roles.includes("OWNER") || auth.branchIds.includes(branchId))) {
      socket.join(`kds:${branchId}`);
    }
  });
  socket.on("join-waiter", (branchId: string) => {
    if (auth.kind === "user" && (auth.roles.includes("OWNER") || auth.branchIds.includes(branchId))) {
      socket.join(`waiter:${branchId}`);
    }
  });
  socket.on("join-order", async (orderId: string) => {
    if (auth.kind === "user") {
      socket.join(`order:${orderId}`);
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { branchId: true, tableId: true }
    });

    if (order && order.branchId === auth.branchId && order.tableId === auth.tableId) {
      socket.join(`order:${orderId}`);
    }
  });
});

if (redisSubscriber) {
  redisSubscriber.subscribe("rt:events");
  redisSubscriber.on("message", (_channel, message) => {
    try {
      const event = JSON.parse(message) as {
        event: string;
        branchId: string;
        payload: { orderId?: string };
      };

      io.to(`branch:${event.branchId}`).emit(event.event, event);
      io.to(`kds:${event.branchId}`).emit(event.event, event);
      io.to(`waiter:${event.branchId}`).emit(event.event, event);
      if (event.payload?.orderId) {
        io.to(`order:${event.payload.orderId}`).emit(event.event, event);
      }
    } catch (error) {
      console.error("Failed to parse realtime event", error);
    }
  });
}

server.listen(port, () => {
  console.log(`Socket server listening on ${port}`);
});

// ─── Outbox Poller ─── flush stuck OUTBOX_PENDING events every 30s
const OUTBOX_POLL_INTERVAL = Number(process.env.OUTBOX_POLL_MS ?? 30_000);
let outboxTimer: ReturnType<typeof setInterval> | null = null;

async function pollOutbox() {
  try {
    const result = await flushPendingOutboxEvents(100);
    if (result.sent > 0 || result.failed > 0) {
      console.log(`[outbox-poller] sent=${result.sent} failed=${result.failed}`);
    }
  } catch (err) {
    console.error("[outbox-poller] error:", err);
  }
}

outboxTimer = setInterval(pollOutbox, OUTBOX_POLL_INTERVAL);
// run once on startup
pollOutbox();

// Graceful shutdown
function shutdown() {
  console.log("[socket-server] shutting down...");
  if (outboxTimer) clearInterval(outboxTimer);
  io.close();
  server.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
