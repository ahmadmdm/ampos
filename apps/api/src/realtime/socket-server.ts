import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { redisSubscriber } from "../lib/redis";
import { verifyAccessToken } from "../lib/jwt";
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

// Auth middleware — verify JWT before allowing connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token || typeof token !== "string") {
    return next(new Error("UNAUTHORIZED: token required"));
  }
  try {
    const claims = verifyAccessToken(token);
    (socket as any).auth = {
      userId: claims.sub,
      organizationId: claims.org,
      branchIds: claims.branches,
      roles: claims.roles
    };
    next();
  } catch {
    next(new Error("UNAUTHORIZED: invalid token"));
  }
});

io.on("connection", (socket) => {
  const auth = (socket as any).auth as { branchIds: string[]; roles: string[] };

  socket.on("join-branch", (branchId: string) => {
    if (auth.roles.includes("OWNER") || auth.branchIds.includes(branchId)) {
      socket.join(`branch:${branchId}`);
    }
  });
  socket.on("join-kds", (branchId: string) => {
    if (auth.roles.includes("OWNER") || auth.branchIds.includes(branchId)) {
      socket.join(`kds:${branchId}`);
    }
  });
  socket.on("join-waiter", (branchId: string) => {
    if (auth.roles.includes("OWNER") || auth.branchIds.includes(branchId)) {
      socket.join(`waiter:${branchId}`);
    }
  });
  socket.on("join-order", (orderId: string) => {
    socket.join(`order:${orderId}`);
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
