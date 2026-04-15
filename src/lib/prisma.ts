/**
 * Single Prisma client instance (singleton in dev to survive hot reload).
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** Query logging in dev makes local runs very slow (remote DB + console I/O). Set PRISMA_LOG_QUERIES=1 to enable. */
const prismaLog =
  process.env.NODE_ENV === "development" && process.env.PRISMA_LOG_QUERIES === "1"
    ? (["query", "error", "warn"] as const)
    : (["error"] as const);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: [...prismaLog] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
