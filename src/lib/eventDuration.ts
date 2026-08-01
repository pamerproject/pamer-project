// Durasi event terstruktur (angka + satuan) supaya sistem bisa menghitung
// tanggal berakhir (endsAt) dan sisa waktu secara konsisten.
// Konten dibuat oleh admin — label satu bahasa (Indonesia).

export type DurationUnit = "day" | "week" | "month";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Konversi durasi ke milidetik. Bulan dianggap 30 hari. */
export function durationToMs(value: number, unit: DurationUnit): number {
  if (unit === "week") return value * 7 * DAY_MS;
  if (unit === "month") return value * 30 * DAY_MS;
  return value * DAY_MS;
}

/** Susun label durasi untuk ditampilkan (contoh: "2 minggu"). */
export function composeDurationLabel(value: number, unit: DurationUnit): string {
  if (unit === "week") return value === 1 ? "1 minggu" : `${value} minggu`;
  if (unit === "month") return value === 1 ? "1 bulan" : `${value} bulan`;
  return value === 1 ? "1 hari" : `${value} hari`;
}

/** Parse input durasi dari body request. Kembalikan null jika tidak valid. */
export function parseEventDuration(
  rawValue: unknown,
  rawUnit: unknown
): { value: number; unit: DurationUnit } | null {
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isFinite(value)) return null;
  // Floor dulu, baru validasi — hindari 0.5 hari jadi 0 hari (event langsung berakhir)
  const floored = Math.floor(value);
  if (floored <= 0) return null;
  if (rawUnit !== "day" && rawUnit !== "week" && rawUnit !== "month") return null;
  return { value: floored, unit: rawUnit };
}
