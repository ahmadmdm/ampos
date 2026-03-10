/**
 * Structured JSON logger.
 * All output goes to stdout/stderr so Docker/Caddy can capture and forward it.
 *
 * Usage:
 *   import { logger } from "@/src/lib/logger";
 *   logger.error("Failed to create order", error, { userId, branchId });
 *   logger.info("Order created", { orderId });
 *   logger.warn("ZATCA submission failed, queued for retry", { invoiceId });
 */

type Meta = Record<string, unknown>;

function write(level: "INFO" | "WARN" | "ERROR", msg: string, meta?: Meta, error?: Error) {
  const entry: Record<string, unknown> = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  if (error) {
    entry.error = { message: error.message, name: error.name, stack: error.stack };
  }
  const out = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  info: (msg: string, meta?: Meta) => write("INFO", msg, meta),
  warn: (msg: string, meta?: Meta) => write("WARN", msg, meta),
  error: (msg: string, error: unknown, meta?: Meta) => {
    const err = error instanceof Error ? error : new Error(String(error));
    write("ERROR", msg, meta, err);
  },
};
