import { describe, expect, it, vi } from "vitest";
import {
  decodePositionZoom,
  encodePositionZoom,
  getObjPosition,
  getTimeAgo,
  getZoomLevel,
  parsePostImage,
  translateApiError,
} from "./helpers";

const t = (key: string) => key;

describe("parsePostImage", () => {
  it("returns empty result for null", () => {
    expect(parsePostImage(null)).toEqual({ images: [], linkUrl: null, githubUrl: null });
  });

  it("returns empty result for empty string", () => {
    expect(parsePostImage("")).toEqual({ images: [], linkUrl: null, githubUrl: null });
  });

  it("parses JSON object with imgs/lnk/gh", () => {
    const input = JSON.stringify({ imgs: ["a.jpg", "b.jpg"], lnk: "https://x.com", gh: "https://github.com/x" });
    expect(parsePostImage(input)).toEqual({
      images: ["a.jpg", "b.jpg"],
      linkUrl: "https://x.com",
      githubUrl: "https://github.com/x",
    });
  });

  it("parses JSON array", () => {
    expect(parsePostImage(JSON.stringify(["a.jpg", "b.jpg"]))).toEqual({
      images: ["a.jpg", "b.jpg"],
      linkUrl: null,
      githubUrl: null,
    });
  });

  it("falls back to plain URL string", () => {
    expect(parsePostImage("https://example.com/a.jpg")).toEqual({
      images: ["https://example.com/a.jpg"],
      linkUrl: null,
      githubUrl: null,
    });
  });

  it("handles malformed JSON gracefully", () => {
    expect(parsePostImage("hello")).toEqual({ images: ["hello"], linkUrl: null, githubUrl: null });
  });

  it("ignores non-array imgs field", () => {
    const input = JSON.stringify({ imgs: "a.jpg" });
    expect(parsePostImage(input)).toEqual({ images: [], linkUrl: null, githubUrl: null });
  });
});

describe("getTimeAgo", () => {
  it("returns justNow for < 60s", () => {
    expect(getTimeAgo(new Date(Date.now() - 30 * 1000).toISOString(), t)).toBe("timeAgo.justNow");
  });

  it("returns minutes", () => {
    expect(getTimeAgo(new Date(Date.now() - 5 * 60 * 1000).toISOString(), t)).toBe("timeAgo.minutes");
  });

  it("returns hours", () => {
    expect(getTimeAgo(new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), t)).toBe("timeAgo.hours");
  });

  it("returns days", () => {
    expect(getTimeAgo(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), t)).toBe("timeAgo.days");
  });

  it("formats older dates as locale date", () => {
    const spy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-01-15T00:00:00Z").getTime());
    const old = new Date("2025-06-01T00:00:00Z").toISOString();
    const result = getTimeAgo(old, t, "id");
    expect(result).toContain("Jun");
    spy.mockRestore();
  });
});

describe("encodePositionZoom / decodePositionZoom", () => {
  it("encodes without zoom suffix when zoom is 100", () => {
    expect(encodePositionZoom("center", 100)).toBe("center");
  });

  it("encodes with zoom suffix otherwise", () => {
    expect(encodePositionZoom("top", 150)).toBe("top:150");
  });

  it("decodes plain position", () => {
    expect(decodePositionZoom("center")).toEqual({ position: "center", zoom: 100 });
  });

  it("decodes encoded position", () => {
    expect(decodePositionZoom("bottom:75")).toEqual({ position: "bottom", zoom: 75 });
  });

  it("clamps zoom between 50 and 200", () => {
    expect(decodePositionZoom("top:10").zoom).toBe(50);
    expect(decodePositionZoom("top:999").zoom).toBe(200);
  });

  it("falls back to center/100 for empty", () => {
    expect(decodePositionZoom("")).toEqual({ position: "center", zoom: 100 });
  });
});

describe("getObjPosition / getZoomLevel", () => {
  it("maps positions to CSS object-position", () => {
    expect(getObjPosition("top")).toBe("center top");
    expect(getObjPosition("bottom")).toBe("center bottom");
    expect(getObjPosition("center")).toBe("center center");
  });

  it("reads zoom from encoded value", () => {
    expect(getZoomLevel("top:150")).toBe(150);
    expect(getZoomLevel("center")).toBe(100);
  });
});

describe("translateApiError", () => {
  it("returns translation for a valid key directly", () => {
    const spy = vi.fn((key: string) => `[${key}]`);
    expect(translateApiError("auth.emailExists", spy)).toBe("[auth.emailExists]");
    expect(spy).toHaveBeenCalledWith("auth.emailExists");
  });

  it("maps legacy Indonesian message to key", () => {
    const spy = vi.fn((key: string) => `[${key}]`);
    expect(translateApiError("Email sudah terdaftar", spy)).toBe("[auth.emailExists]");
    expect(spy).toHaveBeenCalledWith("auth.emailExists");
  });

  it("returns unknown message as-is", () => {
    const spy = vi.fn((key: string) => `[${key}]`);
    expect(translateApiError("Unknown error string", spy)).toBe("Unknown error string");
    expect(spy).not.toHaveBeenCalled();
  });
});
