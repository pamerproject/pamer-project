import badwords from "./badwords.json";

const CENSOR_CHAR = "*";
const CENSOR_LENGTH = 7;
const cachedReplacement = CENSOR_CHAR.repeat(CENSOR_LENGTH);

/**
 * Sort bad words by length (longest first) to avoid partial matching issues.
 * Build a single regex that matches all bad words case-insensitively.
 *
 * Di-bungkus word boundary (\b) agar hanya KATA UTUH yang disensor —
 * tidak mencocokkan substring di dalam kata normal. Contoh: "tai" di dalam
 * "Tailwind" atau "entail" tidak ikut ter-sensor, tapi "tai" yang berdiri
 * sendiri tetap kena.
 */
const sortedBadwords = [...badwords].sort((a, b) => b.length - a.length);
const badwordPattern = new RegExp(
  `\\b(?:${sortedBadwords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

export interface CensorResult {
  text: string;
  censored: boolean;
}

/**
 * Censor bad words in a string by replacing them with "*******".
 * Preserves original casing of surrounding text.
 * Returns both the censored text and a flag indicating if any words were censored.
 */
export function censorText(text: string): CensorResult {
  if (!text) return { text, censored: false };
  const result = text.replace(badwordPattern, () => cachedReplacement);
  return {
    text: result,
    censored: result !== text,
  };
}

/**
 * Censor all specified string fields in an object.
 * Returns a new object with censored text fields.
 */
export function censorFields<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const result: Record<string, unknown> = { ...obj };
  for (const field of fields) {
    const key = field as string;
    const val = result[key];
    if (typeof val === "string") {
      result[key] = censorText(val).text;
    }
  }
  return result as T;
}

/**
 * Censor setiap item dalam array string (membuang item non-string/kosong).
 * Dipakai untuk field list seperti howTo/requirements/prizes di events.
 */
export function censorArray(arr: unknown): string[] {
  return Array.isArray(arr)
    ? arr
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => censorText(v).text.trim())
    : [];
}
