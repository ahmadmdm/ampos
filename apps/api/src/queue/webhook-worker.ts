import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processConfirmedPayment } from "../payments/service";

if (!process.env.REDIS_URL) {
  console.log("REDIS_URL not set; webhook worker disabled");
  process.exit(0);
}

const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const worker = new Worker(
  "payment-webhooks",
  async (job) => {
    await processConfirmedPayment(job.data);
  },
  {
    connection: redis,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        return Math.min(2000 * Math.pow(2, attemptsMade - 1), 60000);
      }
    }
  }
);

function gracefulShutdown() {
  console.log("Shutting down webhook worker...");
  worker.close().then(() => process.exit(0));
}
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

worker.on("completed", (job) => {
  console.log(`Webhook job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Webhook job failed: ${job?.id}`, err);
});
