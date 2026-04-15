import { describe, expect, it } from "vitest";
import { dashboardPathRedirect } from "./dashboard-path-guard";

describe("dashboardPathRedirect", () => {
  it("allows owner on any dashboard path", () => {
    expect(dashboardPathRedirect("/dashboard/office", "owner")).toBeNull();
    expect(dashboardPathRedirect("/dashboard/menu", "owner")).toBeNull();
  });

  it("redirects kitchen-only from office to orders", () => {
    expect(dashboardPathRedirect("/dashboard/office", "kitchen")).toBe("/dashboard/orders");
    expect(dashboardPathRedirect("/dashboard/orders", "kitchen")).toBeNull();
  });

  it("redirects kitchen from menu and tables (path guard; menu API may still allow when Office enables staff edit)", () => {
    expect(dashboardPathRedirect("/dashboard/menu", "kitchen")).toBe("/dashboard/orders");
    expect(dashboardPathRedirect("/dashboard/tables", "kitchen")).toBe("/dashboard/orders");
  });

  it("redirects waiter from orders to wait-staff", () => {
    expect(dashboardPathRedirect("/dashboard/orders", "waiter")).toBe("/dashboard/wait-staff");
    expect(dashboardPathRedirect("/dashboard/wait-staff", "waiter")).toBeNull();
  });

  it("allows floor on orders, wait-staff; redirects from menu and office", () => {
    expect(dashboardPathRedirect("/dashboard/orders", "floor")).toBeNull();
    expect(dashboardPathRedirect("/dashboard/wait-staff", "floor")).toBeNull();
    expect(dashboardPathRedirect("/dashboard/menu", "floor")).toBe("/dashboard/wait-staff");
    expect(dashboardPathRedirect("/dashboard/office", "floor")).toBe("/dashboard/wait-staff");
  });

  it("allows print route for waiter", () => {
    expect(dashboardPathRedirect("/dashboard/orders/print/abc", "waiter")).toBeNull();
  });

  it("respects granular staff permissions", () => {
    const p = {
      overview: false,
      menu: true,
      tables: false,
      orders: false,
      waitStaff: false,
      office: false,
      branding: false,
    };
    expect(dashboardPathRedirect("/dashboard/menu", "staff", p)).toBeNull();
    expect(dashboardPathRedirect("/dashboard/office", "staff", p)).toBe("/dashboard/menu");
  });
});
