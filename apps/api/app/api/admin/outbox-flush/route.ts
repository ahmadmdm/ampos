import { NextResponse } from "next/server";
import { flushPendingOutboxEvents } from "../../../../src/realtime/outbox";
import { logger } from "../../../../src/lib/logger";

/**
 * GET /api/admin/outbox-flush
 *
 * Cron-compatible endpoint to flush pending outbox events.
 * Secured via a shared secret to prevent unauthorized triggers.
 * 
 * Can be called by:
 *  - External cron (e.g., Vercel Cron, Railway Cron)
 *  - A setInterval in the socket-server
 *  - Manual trigger from admin panel
 */
export async function GET(req: Request) {
  // Simple bearer-token auth for cron jobs
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? "cron-dev-secret";
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await flushPendingOutboxEvents(200);
    return NextResponse.json({
      ok: true,
      ...result,
      flushedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("outbox-flush error", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
