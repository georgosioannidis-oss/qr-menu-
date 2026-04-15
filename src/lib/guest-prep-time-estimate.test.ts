import { describe, expect, it } from "vitest";
import { loadAdjustedPrepMinutes } from "./guest-prep-time-estimate";

describe("loadAdjustedPrepMinutes", () => {
  it("returns baseline when alone", () => {
    expect(loadAdjustedPrepMinutes(20, 0, 1)).toBe(20);
  });

  it("adds time for orders ahead", () => {
    expect(loadAdjustedPrepMinutes(18, 3, 1)).toBe(18 + Math.min(60, 6));
  });

  it("adds time for multiple active tables", () => {
    expect(loadAdjustedPrepMinutes(18, 0, 4)).toBe(18 + Math.min(60, Math.round(3 * 1.5)));
  });

  it("caps total at 300 minutes", () => {
    expect(loadAdjustedPrepMinutes(280, 50, 20)).toBe(300);
  });
});
