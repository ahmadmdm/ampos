import IORedis from "ioredis";
import { Queue } from "bullmq";

const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

export const webhookQueue = redisConnection
  ? new Queue("payment-webhooks", { connection: redisConnection })
  : null;
