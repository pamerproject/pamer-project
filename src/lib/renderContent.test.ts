import { describe, expect, it } from "vitest";
import { resolveMention } from "./renderContent";

const MAP = new Map([
  ["Ketut Dana", "ketutdana"],
  ["Joko", "joko"],
  ["Joko Widodo", "jokowi"],
]);

describe("resolveMention", () => {
  it("resolve nama multi-kata penuh → username", () => {
    expect(resolveMention("Ketut Dana", MAP)).toEqual({
      name: "Ketut Dana",
      username: "ketutdana",
      leftover: "",
    });
  });

  it("case-insensitive untuk ketik manual lowercase", () => {
    expect(resolveMention("ketut dana", MAP)).toEqual({
      name: "Ketut Dana",
      username: "ketutdana",
      leftover: "",
    });
  });

  it("kata setelah nama tidak ikut ter-link (jadi leftover)", () => {
    const r = resolveMention("Ketut Dana gimana kabarnya", MAP);
    expect(r.username).toBe("ketutdana");
    expect(r.name).toBe("Ketut Dana");
    expect(r.leftover).toBe(" gimana kabarnya");
  });

  it("nama penuh menang atas nama yang jadi prefix", () => {
    const r = resolveMention("Joko Widodo", MAP);
    expect(r.username).toBe("jokowi");
    expect(r.leftover).toBe("");
  });

  it("@nama tunggal tetap resolve ke username-nya sendiri", () => {
    const r = resolveMention("Joko", MAP);
    expect(r.username).toBe("joko");
  });

  it("username tanpa spasi yang diketik utuh (cth @ketutdana) tetap benar", () => {
    const r = resolveMention("ketutdana", MAP);
    expect(r.username).toBe("ketutdana");
    expect(r.leftover).toBe("");
  });

  it("fallback: nama tak dikenal → kata pertama jadi username lowercase", () => {
    expect(resolveMention("budiyanto hebat", MAP)).toEqual({
      name: "budiyanto",
      username: "budiyanto",
      leftover: " hebat",
    });
  });

  it("tanpa map → fallback kata pertama", () => {
    expect(resolveMention("random stuff", undefined)).toEqual({
      name: "random",
      username: "random",
      leftover: " stuff",
    });
  });
});
