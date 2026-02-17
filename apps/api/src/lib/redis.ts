import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const hasRedis = Boolean(redisUrl);

export const redis = redisUrl
  ? new Redis(redisUrl)
  : {
      async get(_k: string) {
        return null;
      },
      async set(_k: string, _v: string, _mode?: string, _seconds?: number) {
        return "OK";
      },
      async publish(_channel: string, _payload: string) {
        return 0;
      }
    };

export const redisPublisher = redisUrl ? new Redis(redisUrl) : null;
export const redisSubscriber = redisUrl ? new Redis(redisUrl) : null;
