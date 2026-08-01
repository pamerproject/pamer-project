import { describe, expect, it } from "vitest";
import { censorArray, censorFields, censorText } from "./censor";

describe("censorText", () => {
  it("censors a bad word", () => {
    const result = censorText("anjing");
    expect(result.censored).toBe(true);
    expect(result.text).toBe("*******");
  });

  it("censors bad words inside a sentence", () => {
    expect(censorText("ini anjing lucu jancok")).toEqual({ text: "ini ******* lucu *******", censored: true });
  });

  it("respects word boundaries (does not censor substrings)", () => {
    expect(censorText("Tailwind dan entail").censored).toBe(false);
  });

  it("handles empty input", () => {
    expect(censorText("")).toEqual({ text: "", censored: false });
  });

  it("leaves clean text untouched", () => {
    const result = censorText("hello world");
    expect(result).toEqual({ text: "hello world", censored: false });
  });
});

describe("censorFields", () => {
  it("censors only the listed string fields", () => {
    const result = censorFields({ title: "jancok", body: "bagus", views: 10 }, ["title"]);
    expect(result.title).toBe("*******");
    expect(result.body).toBe("bagus");
    expect(result.views).toBe(10);
  });

  it("returns a new object without mutating input", () => {
    const input = { title: "jancok" };
    const result = censorFields(input, ["title"]);
    expect(result).not.toBe(input);
    expect(input.title).toBe("jancok");
  });
});

describe("censorArray", () => {
  it("censored bad words, trims, and drops empty/non-string items", () => {
    const result = censorArray(["jancok", "  bagus  ", "", 42]);
    expect(result).toEqual(["*******", "bagus"]);
  });

  it("returns [] for non-array input", () => {
    expect(censorArray("anjing")).toEqual([]);
    expect(censorArray(null)).toEqual([]);
  });
});
