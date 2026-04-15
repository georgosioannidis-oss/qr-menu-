import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { isDatabaseConnectionError } from "./database-connection-error";

describe("isDatabaseConnectionError", () => {
  it("is true for PrismaClientInitializationError", () => {
    const e = new Prisma.PrismaClientInitializationError("init failed", "5.0.0");
    expect(isDatabaseConnectionError(e)).toBe(true);
  });

  it("is true for known request codes P1001 P1002 P1017", () => {
    for (const code of ["P1001", "P1002", "P1017"] as const) {
      const e = new Prisma.PrismaClientKnownRequestError("x", {
        code,
        clientVersion: "5.0.0",
      });
      expect(isDatabaseConnectionError(e)).toBe(true);
    }
  });

  it("is false for unrelated Prisma known errors", () => {
    const e = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    expect(isDatabaseConnectionError(e)).toBe(false);
  });

  it("detects connection hints in Error message", () => {
    expect(isDatabaseConnectionError(new Error("Can't reach database server"))).toBe(true);
    expect(isDatabaseConnectionError(new Error("ECONNREFUSED to db"))).toBe(true);
    expect(isDatabaseConnectionError(new Error("random failure"))).toBe(false);
  });
});
