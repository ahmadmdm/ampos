/**
 * Prisma client singleton for the super-admin service.
 * Generated client is output to ./prisma-client by the local schema.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const globalWithPrisma = global as typeof globalThis & { prisma?: typeof PrismaClient };

export const prisma: InstanceType<typeof PrismaClient> =
  globalWithPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.prisma = prisma;
}
