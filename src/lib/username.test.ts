import { describe, it, expect } from "vitest";
import { generateUsername, RESERVED_USERNAMES } from "./username";

describe("generateUsername", () => {
  it("lowercases and strips spaces/special chars", () => {
    expect(generateUsername("Ketut Dana")).toBe("ketutdana");
    expect(generateUsername("Dana 87!")).toBe("dana87");
    expect(generateUsername("  Budi   Santoso  ")).toBe("budisantoso");
  });

  it("returns the plain base when available (no suffix)", () => {
    expect(generateUsername("ketutdana")).toBe("ketutdana");
    expect(generateUsername("dana87")).toBe("dana87");
  });

  it("falls back to 'user' when empty or only invalid chars", () => {
    expect(generateUsername("")).toBe("user");
    expect(generateUsername("   ")).toBe("user");
    expect(generateUsername("!!!")).toBe("user");
  });

  it("truncates to 15 chars", () => {
    expect(generateUsername("abcdefghijklmnopqrstuvwxyz")).toBe("abcdefghijklmno");
  });

  it("appends 'u' for reserved usernames", () => {
    expect(generateUsername("admin")).toBe("adminu");
    expect(generateUsername("Admin")).toBe("adminu");
    expect(generateUsername("login")).toBe("loginu");
    expect(generateUsername("pamerproject")).toBe("pamerprojectu");
  });

  it("RESERVED_USERNAMES contains expected entries", () => {
    expect(RESERVED_USERNAMES.has("admin")).toBe(true);
    expect(RESERVED_USERNAMES.has("user")).toBe(true);
    expect(RESERVED_USERNAMES.has("root")).toBe(true);
    expect(RESERVED_USERNAMES.has("ketutdana")).toBe(false);
  });
});
