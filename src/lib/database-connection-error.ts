import { Prisma } from "@prisma/client";

/**
 * True when Prisma could not reach Postgres (paused project, wrong URL, firewall, network).
 * See https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1017"].includes(error.code);
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|P1001|ECONNREFUSED|ETIMEDOUT|connection.*(timeout|refused)/i.test(
    msg
  );
}
