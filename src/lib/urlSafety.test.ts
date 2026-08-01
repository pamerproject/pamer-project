import { describe, expect, it } from "vitest";
import { checkUrlSafety, getSeverityLabel } from "./urlSafety";

describe("checkUrlSafety", () => {
  it("marks clean URLs as safe", () => {
    expect(checkUrlSafety("https://example.com")).toEqual({
      safe: true,
      warnings: [],
      severity: "low",
    });
  });

  it("flags invalid URLs", () => {
    const result = checkUrlSafety("https://");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("high");
    expect(result.warnings).toContain("safety.invalidUrl");
  });

  it("flags IP address URLs", () => {
    const result = checkUrlSafety("http://192.168.1.1/x");
    expect(result.safe).toBe(false);
    expect(result.severity).toBe("high");
    expect(result.warnings).toContain("safety.ipAddress");
  });

  it("flags URL shorteners", () => {
    const result = checkUrlSafety("https://bit.ly/abc");
    expect(result.warnings).toContain("safety.shortener");
    expect(result.severity).toBe("medium");
  });

  it("flags suspicious TLDs", () => {
    const result = checkUrlSafety("https://example.xyz");
    expect(result.warnings).toContain("safety.suspiciousTld");
    expect(result.severity).toBe("medium");
  });

  it("flags suspicious keywords", () => {
    const result = checkUrlSafety("https://example.com/free-bitcoin");
    expect(result.warnings).toContain("safety.suspiciousKeyword");
    expect(result.safe).toBe(false);
  });

  it("flags typosquatting domains", () => {
    const result = checkUrlSafety("https://www.g00gle.com");
    expect(result.warnings).toContain("safety.typosquatting");
    expect(result.severity).toBe("high");
  });

  it("does not flag legitimate brand domains", () => {
    const result = checkUrlSafety("https://www.google.com");
    expect(result.safe).toBe(true);
    expect(result.warnings).not.toContain("safety.typosquatting");
  });

  it("flags brand names used as subdomain of suspicious domain", () => {
    const result = checkUrlSafety("https://google.evil.com");
    expect(result.warnings).toContain("safety.typosquatting");
  });

  it("flags excessive subdomains", () => {
    const result = checkUrlSafety("https://a.b.c.d.e.com");
    expect(result.warnings).toContain("safety.excessiveSubdomains");
  });

  it("flags very long URLs", () => {
    const url = "https://example.com/" + "x".repeat(250);
    expect(checkUrlSafety(url).warnings).toContain("safety.longUrl");
  });

  it("returns empty warnings for plain domain without protocol", () => {
    const result = checkUrlSafety("example.com");
    expect(result.safe).toBe(true);
  });
});

describe("getSeverityLabel", () => {
  it("maps severities to translation keys", () => {
    expect(getSeverityLabel("high")).toBe("safety.severityHigh");
    expect(getSeverityLabel("medium")).toBe("safety.severityMedium");
    expect(getSeverityLabel("low")).toBe("safety.severityLow");
  });
});
