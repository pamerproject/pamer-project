import { describe, expect, it } from "vitest";
import { composeDurationLabel, durationToMs, parseEventDuration } from "./eventDuration";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("durationToMs", () => {
  it("converts days", () => {
    expect(durationToMs(1, "day")).toBe(DAY_MS);
    expect(durationToMs(3, "day")).toBe(3 * DAY_MS);
  });

  it("converts weeks", () => {
    expect(durationToMs(1, "week")).toBe(7 * DAY_MS);
  });

  it("treats a month as 30 days", () => {
    expect(durationToMs(1, "month")).toBe(30 * DAY_MS);
  });
});

describe("composeDurationLabel", () => {
  it("singular labels", () => {
    expect(composeDurationLabel(1, "day")).toBe("1 hari");
    expect(composeDurationLabel(1, "week")).toBe("1 minggu");
    expect(composeDurationLabel(1, "month")).toBe("1 bulan");
  });

  it("plural labels", () => {
    expect(composeDurationLabel(2, "day")).toBe("2 hari");
    expect(composeDurationLabel(2, "week")).toBe("2 minggu");
    expect(composeDurationLabel(2, "month")).toBe("2 bulan");
  });
});

describe("parseEventDuration", () => {
  it("parses valid number + unit", () => {
    expect(parseEventDuration(2, "week")).toEqual({ value: 2, unit: "week" });
  });

  it("coerces numeric strings", () => {
    expect(parseEventDuration("3", "day")).toEqual({ value: 3, unit: "day" });
  });

  it("floors fractional values before validating", () => {
    expect(parseEventDuration(1.9, "day")).toEqual({ value: 1, unit: "day" });
  });

  it("rejects zero or negative (after flooring)", () => {
    expect(parseEventDuration(0, "day")).toBeNull();
    expect(parseEventDuration(-1, "day")).toBeNull();
    expect(parseEventDuration(0.5, "day")).toBeNull();
  });

  it("rejects invalid unit", () => {
    expect(parseEventDuration(2, "year")).toBeNull();
    expect(parseEventDuration(2, undefined)).toBeNull();
  });

  it("rejects non-numeric values", () => {
    expect(parseEventDuration(NaN, "day")).toBeNull();
    expect(parseEventDuration(undefined, "day")).toBeNull();
    expect(parseEventDuration("abc", "day")).toBeNull();
  });
});
